import { evaluarRiesgos } from "@/lib/alertas/evaluadores";
import { catalogoCultivos, faseActiva } from "@/lib/cultivos/catalogo";
import { obtenerClimaHorario, obtenerClimaPunto } from "@/lib/clima/motor";
import {
  leerHorarioReciente,
  obtenerOCrearUbicacion,
} from "@/lib/datos/clima-repo";
import {
  guardarEventosRiesgo,
  listarEventosRiesgo,
} from "@/lib/datos/eventos-riesgo-repo";
import { listarAlertasFitosanitarias } from "@/lib/datos/fitosanitario-repo";
import { listarAvisosOficiales } from "@/lib/datos/alertas-oficiales-repo";
import { listarReglasRiesgo } from "@/lib/datos/reglas-repo";
import {
  obtenerPlotConCultivo,
  type PlotConCultivo,
} from "@/lib/datos/plataforma-repo";
import { culturaDesdeSlugPlataforma } from "@/lib/dominio/cultivos";
import type { CoeficienteCultivo } from "@/lib/dominio/evaluacion";
import type {
  OfficialWarning,
  WeatherHourly,
} from "@/lib/dominio/proveedores";
import type { PhytosanitaryAlert } from "@/lib/dominio/fitosanitario";
import type { NuevoRiskEvent, RiskEvent } from "@/lib/dominio/riesgo";
import { resolverParametrosPorRiesgo } from "./reglas-resolucion";
import { sensorDataProvider } from "@/lib/proveedores/sensor-data";

function resolverCoeficiente(plot: PlotConCultivo): CoeficienteCultivo {
  if (plot.stateKc !== null) {
    return {
      kc: plot.stateKc,
      validado: plot.stateKcValidated,
      origen: "phenological_state",
    };
  }
  if (plot.cropKc !== null) {
    return { kc: plot.cropKc, validado: plot.cropKcValidated, origen: "crop" };
  }
  return { kc: null, validado: false, origen: null };
}

export interface ResultadoRiesgoPlot {
  plotId: string;
  evaluadoEl: string;
  eventos: RiskEvent[];
}

/**
 * Orquestación de riesgo de una parcela de plataforma: ejecuta el motor de
 * evaluadores (sección 18) y persiste un `risk_event` por evaluación.
 */
export async function evaluarPlotPlataforma(
  plotId: string,
): Promise<ResultadoRiesgoPlot> {
  const plot = await obtenerPlotConCultivo(plotId);
  if (!plot) throw new Error("Parcela no encontrada");
  if (plot.latitud === null || plot.longitud === null) {
    throw new Error("Parcela sin coordenadas");
  }
  const cultura = culturaDesdeSlugPlataforma(plot.cropSlug);
  if (!cultura) throw new Error("Cultivo no soportado");

  const momento = new Date();
  const clima = await obtenerClimaPunto(plot.latitud, plot.longitud);
  const cultivo = catalogoCultivos[cultura];
  const fenofase = faseActiva(cultivo, momento);

  const reglas = await listarReglasRiesgo({ enabled: true });
  const parametrosPorRiesgo = resolverParametrosPorRiesgo(
    reglas,
    plot.cropId,
    plot.phenologicalStateId,
  );
  const coeficiente = resolverCoeficiente(plot);

  let avisosFitosanitarios: PhytosanitaryAlert[] = [];
  try {
    avisosFitosanitarios = await listarAlertasFitosanitarias({ limite: 50 });
  } catch {
    // Los avisos fitosanitarios son opcionales para evaluar.
  }

  let avisosOficiales: OfficialWarning[] = [];
  try {
    avisosOficiales = await listarAvisosOficiales();
  } catch {
    // Los avisos oficiales son opcionales para evaluar.
  }

  let weatherLocationId: string | null = null;
  let horario: WeatherHourly[] = [];
  try {
    const ubicacion = await obtenerOCrearUbicacion(plot.latitud, plot.longitud);
    weatherLocationId = ubicacion.id;
    horario = await leerHorarioReciente(
      ubicacion.id,
      new Date(Date.now() - 15 * 60 * 1000),
    );
  } catch {
    // La caché meteorológica es opcional para evaluar.
  }
  if (horario.length === 0) {
    try {
      horario = await obtenerClimaHorario(plot.latitud, plot.longitud);
    } catch {
      // Sin serie horaria se evalúa con el modelo diario agregado.
    }
  }

  let sensorData: Awaited<ReturnType<typeof sensorDataProvider.getData>> = null;
  try {
    sensorData = await sensorDataProvider.getData(plotId);
  } catch {
    // Sensores opcionales en MVP
  }

  const evaluaciones = await evaluarRiesgos({
    // Spec 43 canonical
    plot: { id: plotId, latitude: plot.latitud, longitude: plot.longitud, farmId: plot.farmId, name: plot.nombre },
    crop: { id: plot.cropId, slug: plot.cropSlug, nameEs: plot.cropNombre },
    phenology: fenofase ? { id: fenofase.id, slug: fenofase.id, nameEs: fenofase.etiqueta } : undefined,
    hourlyForecast: horario,
    recentWeather: horario?.slice(-24),
    officialWarnings: avisosOficiales,
    phytosanitaryAlerts: avisosFitosanitarios,
    sensorData,
    evaluationTime: momento,
    coldSensitivity: plot.coldSensitivity,
    heatSensitivity: plot.heatSensitivity,
    waterSensitivity: plot.waterSensitivity,
    // Compatibilidad legado
    plotId,
    latitud: plot.latitud,
    longitud: plot.longitud,
    clima,
    horario,
    cultivo: cultura,
    fenofase: fenofase?.etiqueta ?? null,
    momento,
    parametrosPorRiesgo,
    coeficiente,
    avisosFitosanitarios,
    avisosOficiales,
    cropIdPlataforma: plot.cropId,
  } as unknown as Parameters<typeof evaluarRiesgos>[0]);

  const eventos: NuevoRiskEvent[] = evaluaciones.map((evaluacion) => ({
    plotId,
    riskType: (evaluacion.riskType ?? (evaluacion as unknown as { type: string }).type) as string,
    level: String(evaluacion.level).toLowerCase() as NuevoRiskEvent["level"],
    score: evaluacion.score,
    startsAt: evaluacion.startsAt as Date,
    endsAt: evaluacion.endsAt as Date | null,
    headline: evaluacion.headline,
    summary: evaluacion.summary,
    reason: (evaluacion.reason ?? (evaluacion as unknown as { explanation: { factors: unknown[] } }).explanation) as Record<string, unknown>,
    ruleVersion: 1,
    weatherLocationId,
    status: "open",
  }));

  await guardarEventosRiesgo(eventos);
  const guardados = await listarEventosRiesgo({ plotId, limite: 50 });
  return { plotId, evaluadoEl: momento.toISOString(), eventos: guardados };
}
