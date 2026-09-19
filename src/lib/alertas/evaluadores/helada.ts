import type {
  RiskContext,
  RiskEvaluation,
  RiskEvaluator,
} from "@/lib/dominio/evaluacion";
import type { WeatherHourly } from "@/lib/dominio/proveedores";
import type { RiskLevel } from "@/lib/dominio/riesgo";
import { aplicarSensibilidad, sensibilidadDeContexto } from "@/lib/agronomia/sensibilidad";
import { numeroParametro } from "./comun";

const FRASE_RADIATIVA = "Patrón compatible con enfriamiento radiativo.";

interface ParamsHelada {
  temperatura: { amarillo: number; naranja: number; rojo: number };
  maxVientoKmh: number;
  maxNubesPct: number;
}

function leerParametros(context: RiskContext): ParamsHelada {
  const params = context.parametrosPorRiesgo?.helada ?? {};
  const temperatura = (params.temperature ?? {}) as {
    yellow?: number;
    orange?: number;
    red?: number;
  };
  const radiativo = (params.radiative_modifier ?? {}) as {
    maxWindKmh?: number;
    maxCloudCoverPct?: number;
  };
  return {
    temperatura: {
      amarillo: numeroParametro(temperatura.yellow, 3),
      naranja: numeroParametro(temperatura.orange, 1),
      rojo: numeroParametro(temperatura.red, -1),
    },
    maxVientoKmh: numeroParametro(radiativo.maxWindKmh, 10),
    maxNubesPct: numeroParametro(radiativo.maxCloudCoverPct, 25),
  };
}

function horaMasFria(horario: WeatherHourly[] | undefined): {
  tmin: number | null;
  hora: WeatherHourly | null;
} {
  if (!horario || horario.length === 0) return { tmin: null, hora: null };
  let tmin = Number.POSITIVE_INFINITY;
  let hora: WeatherHourly | null = null;
  for (const punto of horario) {
    if (
      typeof punto.temperatureC === "number" &&
      punto.temperatureC < tmin
    ) {
      tmin = punto.temperatureC;
      hora = punto;
    }
  }
  return { tmin: Number.isFinite(tmin) ? tmin : null, hora };
}

/**
 * Riesgo de helada. Umbrales y modificador radiativo SIEMPRE desde
 * configuración (`risk_rules.parameters`). No afirma científicamente una
 * helada radiativa: solo indica un patrón compatible.
 */
export const evaluadorHelada: RiskEvaluator = {
  riskType: "helada",
  async evaluate(context: RiskContext): Promise<RiskEvaluation | null> {
    const { temperatura, maxVientoKmh, maxNubesPct } = leerParametros(context);

    const { tmin: tminHoraria, hora } = horaMasFria(context.horario);
    const tmin = tminHoraria ?? context.clima.prevision[0]?.tMin ?? null;
    if (tmin === null) return null;

    let level: string | null =
      tmin <= temperatura.rojo
        ? "red"
        : tmin <= temperatura.naranja
          ? "orange"
          : tmin <= temperatura.amarillo
            ? "yellow"
            : null;
    if (!level) return null; // verde: sin riesgo, no se emite evento
    // Fase 4: riesgo = meteo × sensibilidad
    const sensibilidad = sensibilidadDeContexto(context as unknown as Record<string, unknown> & { coldSensitivity: unknown }, "helada");
    const ajustado = aplicarSensibilidad(level, tmin, sensibilidad);
    level = ajustado.nivel;
    if (!level) return null;

    const viento = hora?.windSpeedKmh ?? context.clima.actual.vientoKmh;
    const nubosidad = hora?.cloudCoverPct ?? null;
    const radiativeCoolingLikely =
      tmin <= temperatura.amarillo &&
      viento <= maxVientoKmh &&
      nubosidad !== null &&
      nubosidad <= maxNubesPct;

    const headline =
      level === "red"
        ? "Helada con riesgo de daños graves"
        : level === "orange"
          ? "Helada probable"
          : "Riesgo de helada";
    const detalleRadi = radiativeCoolingLikely ? ` ${FRASE_RADIATIVA}` : "";

    return {
      riskType: "helada",
      level,
      score: tmin,
      headline,
      summary: `Mínima prevista de ${tmin} °C (umbrales: amarillo ${temperatura.amarillo}, naranja ${temperatura.naranja}, rojo ${temperatura.rojo}).${detalleRadi}`,
      reason: {
        temperatureMinC: tmin,
        dewPointC: hora?.dewPointC ?? null,
        relativeHumidityPct: hora?.relativeHumidityPct ?? null,
        windSpeedKmh: viento,
        cloudCoverPct: nubosidad,
        crop: context.cultivo,
        phenology: context.fenofase,
        meteorologicalRisk: level,
        thresholds: temperatura,
        radiativeModifier: {
          maxWindKmh: maxVientoKmh,
          maxCloudCoverPct: maxNubesPct,
        },
        radiativeCoolingLikely,
      },
      startsAt: context.momento,
      endsAt: null,
    };
  },
};

