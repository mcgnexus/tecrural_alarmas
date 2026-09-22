import type {
  RiskContext,
  RiskEvaluation,
  RiskEvaluator,
} from "@/lib/dominio/evaluacion";
import type { WeatherHourly } from "@/lib/dominio/proveedores";
import { aplicarSensibilidad, sensibilidadDeContexto } from "@/lib/agronomia/sensibilidad";
import { numeroParametro } from "./comun";

const FRASE_LABORES =
  "Condiciones poco favorables para determinadas labores.";

interface ParamsViento {
  amarillo: number;
  naranja: number;
  rojo: number;
  laborThresholdKmh: number;
  laborMinHoras: number;
}

function leerParametros(context: RiskContext): ParamsViento {
  const params = context.parametrosPorRiesgo?.viento ?? {};
  const gust = (params.gustKmh ?? {}) as {
    yellow?: number;
    orange?: number;
    red?: number;
  };
  const labor = (params.labor ?? {}) as {
    thresholdKmh?: number;
    minHours?: number;
  };
  return {
    amarillo: numeroParametro(gust.yellow, 30),
    naranja: numeroParametro(gust.orange, 50),
    rojo: numeroParametro(gust.red, 70),
    laborThresholdKmh: numeroParametro(labor.thresholdKmh, 30),
    laborMinHoras: numeroParametro(labor.minHours, 1),
  };
}

/** Próximas 7 días (168 h): el horizonte del pronóstico híbrido. */
function ventana7d(
  horario: WeatherHourly[] | undefined,
  momento: Date,
): WeatherHourly[] {
  if (!horario || horario.length === 0) return [];
  const desde = momento.getTime() - 60 * 60 * 1000;
  return horario
    .filter((hora) => new Date(hora.timestamp).getTime() >= desde)
    .slice(0, 168);
}

function numeros(valores: (number | null)[]): number[] {
  return valores.filter((v): v is number => v !== null);
}

function media(valores: number[]): number {
  if (valores.length === 0) return 0;
  const suma = valores.reduce((total, valor) => total + valor, 0);
  return Number((suma / valores.length).toFixed(1));
}

/**
 * Riesgo de viento. Umbrales y condiciones de labor SIEMPRE desde configuración
 * (`risk_rules.parameters`). Avisa de condiciones poco favorables para labores,
 * sin dar instrucciones sobre aplicaciones concretas.
 */
export const evaluadorViento: RiskEvaluator = {
  riskType: "viento",
  async evaluate(context: RiskContext): Promise<RiskEvaluation | null> {
    const params = leerParametros(context);
    const horas = ventana7d(context.horario, context.momento);

    const rachas = numeros(horas.map((h) => h.windGustKmh));
    const rachaMaxKmh = rachas.length
      ? Math.max(...rachas)
      : (context.clima.prevision[0]?.rachaMaxKmh ?? null);
    if (rachaMaxKmh === null) return null;

    const vientos = numeros(horas.map((h) => h.windSpeedKmh));
    const vientoMedioKmh = vientos.length
      ? media(vientos)
      : context.clima.actual.vientoKmh;

    let level: string | null =
      rachaMaxKmh > params.rojo
        ? "red"
        : rachaMaxKmh >= params.naranja
          ? "orange"
          : rachaMaxKmh >= params.amarillo
            ? "yellow"
            : null;
    if (!level) return null; // verde: sin riesgo, no se emite evento
    const sensibilidadViento = sensibilidadDeContexto(context as unknown as Record<string, unknown> & { coldSensitivity: unknown; heatSensitivity: unknown }, "viento");
    const ajustadoViento = aplicarSensibilidad(level, rachaMaxKmh, sensibilidadViento);
    level = ajustadoViento.nivel;
    if (!level) return null;

    const duracionHoras = horas.filter(
      (hora) => (hora.windGustKmh ?? 0) >= params.amarillo,
    ).length;
    const horasLabor = horas.filter(
      (hora) => (hora.windGustKmh ?? 0) >= params.laborThresholdKmh,
    ).length;
    const laborPocoFavorable = horasLabor >= params.laborMinHoras;

    const headline =
      level === "red"
        ? "Viento muy fuerte"
        : level === "orange"
          ? "Viento fuerte"
          : "Rachas de viento";
    const detalleLabor = laborPocoFavorable ? ` ${FRASE_LABORES}` : "";

    return {
      riskType: "viento",
      level,
      score: rachaMaxKmh,
      headline,
      summary: `Rachas máximas de ${rachaMaxKmh} km/h (viento medio ${vientoMedioKmh} km/h); ${duracionHoras} h por encima de ${params.amarillo} km/h.${detalleLabor}`,
      reason: {
        windSpeedMeanKmh: vientoMedioKmh,
        windGustMaxKmh: rachaMaxKmh,
        durationHours: duracionHoras,
        hoursOverLaborThreshold: horasLabor,
        laborPocoFavorable,
        crop: context.cultivo,
        phenology: context.fenofase,
        meteorologicalRisk: level,
        thresholds: {
          yellow: params.amarillo,
          orange: params.naranja,
          red: params.rojo,
        },
        laborThresholds: {
          thresholdKmh: params.laborThresholdKmh,
          minHours: params.laborMinHoras,
        },
      },
      startsAt: context.momento,
      endsAt: null,
    };
  },
};
