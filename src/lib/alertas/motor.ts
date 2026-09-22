import { catalogoCultivos, faseActiva } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { riesgoRelevanteEnZona, zonaCultivoPorCoordenadas } from "@/lib/cultivos/zona";
import { obtenerClimaPunto } from "@/lib/clima/motor";
import { reglas as reglasPorDefecto } from "@/lib/agronomia/reglas";
import type { Regla } from "@/lib/agronomia/reglas";
import { calcularDemandaHidrica } from "@/lib/agronomia/demanda-hidrica";
import { crearAlerta } from "./factory";
import { ordenSeveridad } from "./tipos";
import type { ResultadoEvaluacion } from "@/lib/dominio/tipos";
import { canUseFeature, planForUser } from "@/lib/planes/permisos";

export type { ResultadoEvaluacion };

export interface SolicitudRiesgo {
  latitud: number;
  longitud: number;
  cultivo: CulturaId;
  fenofaseId?: string;
  aemetMunicipio?: string;
}

export async function evaluarRiesgo(
  solicitud: SolicitudRiesgo,
  reglasActivas: Regla[] = reglasPorDefecto,
): Promise<ResultadoEvaluacion> {
  const cultivo = catalogoCultivos[solicitud.cultivo];
  if (!cultivo) {
    throw new Error(`Cultivo desconocido: ${solicitud.cultivo}`);
  }

  const clima = await obtenerClimaPunto(solicitud.latitud, solicitud.longitud, solicitud.aemetMunicipio);
  const momento = new Date();

  const zona = zonaCultivoPorCoordenadas(solicitud.latitud, solicitud.longitud);
  const fenofase =
    (solicitud.fenofaseId
      ? cultivo.fenologia.find((fase) => fase.id === solicitud.fenofaseId)
      : undefined) ?? faseActiva(cultivo, momento, zona);

  // Fase 5: gratuitas solo helada+viento (centralizado, no hardcode disperso)
  const plan = planForUser();
  const tiposPermitidos = new Set<string>();
  if (canUseFeature(plan, "frost_alert")) tiposPermitidos.add("helada");
  if (canUseFeature(plan, "wind_alert")) tiposPermitidos.add("viento");
  // premium oculto pero conservado: otros tipos solo si plan lo permite (canUseFeature)

  const alertas = reglasActivas
    .flatMap((regla) => regla.evaluar({ clima, cultivo, fenofase, momento }))
    .filter((hallazgo) => tiposPermitidos.has(hallazgo.tipo))
    .filter((hallazgo) => riesgoRelevanteEnZona(hallazgo.tipo, zona))
    .map((hallazgo) => crearAlerta({ ...hallazgo, fuente: clima.fuente }))
    .sort(
      (a, b) => ordenSeveridad[b.severidad] - ordenSeveridad[a.severidad],
    );

  const demandaHidrica = calcularDemandaHidrica({
    prevision: clima.prevision,
    factorKc: fenofase?.factorKc ?? cultivo.factorKc,
    momento,
  });

  const caducidad = new Date(momento.getTime() + 90 * 60_000).toISOString();
  return {
    latitud: solicitud.latitud,
    longitud: solicitud.longitud,
    cultivo: solicitud.cultivo,
    fenofase: fenofase?.etiqueta ?? null,
    evaluadoEl: momento.toISOString(),
    alertas,
    demandaHidrica,
    fuente: clima.fuente,
    fechaDatos: clima.fuente.consultadaEn,
    fechaCaducidad: caducidad,
    estadoEvaluacion: alertas.length ? "active" : "no-risk",
  };
}
