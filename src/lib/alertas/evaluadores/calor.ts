import type {
  RiskContext,
  RiskEvaluation,
  RiskEvaluator,
} from "@/lib/dominio/evaluacion";
import type { WeatherHourly } from "@/lib/dominio/proveedores";
import type { RiskLevel } from "@/lib/dominio/riesgo";
import { numeroParametro } from "./comun";

interface ParamsCalor {
  temperatura: { amarillo: number; naranja: number; rojo: number };
  heatThreshold: number;
  prolongedHours: number;
  scoreBonus: number;
  cropSensitivity: number;
  phenologySensitivity: number;
}

function leerParametros(context: RiskContext): ParamsCalor {
  const params = context.parametrosPorRiesgo?.["golpe-de-calor"] ?? {};
  const temperatura = (params.temperature ?? {}) as {
    yellow?: number;
    orange?: number;
    red?: number;
  };
  const duration = (params.duration ?? {}) as {
    heatThreshold?: number;
    prolongedHours?: number;
    scoreBonus?: number;
  };
  const sensitivity = (params.sensitivity ?? {}) as {
    crop?: number;
    phenology?: number;
  };
  return {
    temperatura: {
      amarillo: numeroParametro(temperatura.yellow, 32),
      naranja: numeroParametro(temperatura.orange, 35),
      rojo: numeroParametro(temperatura.red, 39),
    },
    heatThreshold: numeroParametro(duration.heatThreshold, 35),
    prolongedHours: numeroParametro(duration.prolongedHours, 4),
    scoreBonus: numeroParametro(duration.scoreBonus, 10),
    cropSensitivity: numeroParametro(sensitivity.crop, 1),
    phenologySensitivity: numeroParametro(sensitivity.phenology, 1),
  };
}

/** Próximas 72 h desde el momento de evaluación. */
function ventana72h(
  horario: WeatherHourly[] | undefined,
  momento: Date,
): WeatherHourly[] {
  if (!horario || horario.length === 0) return [];
  const desde = momento.getTime() - 60 * 60 * 1000;
  return horario
    .filter((hora) => new Date(hora.timestamp).getTime() >= desde)
    .slice(0, 72);
}

function numeros(valores: (number | null)[]): number[] {
  return valores.filter((v): v is number => v !== null);
}

/**
 * Riesgo de calor. Umbrales, umbral de calor y horas de calor prolongado
 * SIEMPRE desde configuración (`risk_rules.parameters`). Aplica sensibilidad de
 * cultivo y fenología al score.
 */
export const evaluadorCalor: RiskEvaluator = {
  riskType: "golpe-de-calor",
  async evaluate(context: RiskContext): Promise<RiskEvaluation | null> {
    const params = leerParametros(context);
    const horas = ventana72h(context.horario, context.momento);

    const temperaturas = numeros(horas.map((h) => h.temperatureC));
    const tMax = temperaturas.length
      ? Math.max(...temperaturas)
      : (context.clima.prevision[0]?.tMax ?? null);
    if (tMax === null) return null;

    const level: RiskLevel | null =
      tMax >= params.temperatura.rojo
        ? "red"
        : tMax >= params.temperatura.naranja
          ? "orange"
          : tMax >= params.temperatura.amarillo
            ? "yellow"
            : null;
    if (!level) return null; // verde: sin riesgo, no se emite evento

    const hotHours = temperaturas.filter(
      (temperatura) => temperatura >= params.heatThreshold,
    ).length;
    const prolongedHeat = hotHours >= params.prolongedHours;

    const humedades = numeros(horas.map((h) => h.relativeHumidityPct));
    const humedadMin = humedades.length ? Math.min(...humedades) : null;
    const et0s = numeros(horas.map((h) => h.et0Mm));
    const et0Max = et0s.length ? Math.max(...et0s) : null;

    const sensibilidad = params.cropSensitivity * params.phenologySensitivity;
    const bonificacion = prolongedHeat ? params.scoreBonus : 0;
    const score = (tMax + bonificacion) * sensibilidad;

    const headline =
      level === "red"
        ? "Golpe de calor severo"
        : level === "orange"
          ? "Calor intenso"
          : "Temperaturas altas";
    const detalleDuracion = prolongedHeat
      ? ` Calor prolongado: ${hotHours} h ≥ ${params.heatThreshold} °C.`
      : "";
    const detalleHumedad =
      humedadMin !== null ? ` Humedad mínima ${humedadMin} %.` : "";

    return {
      riskType: "golpe-de-calor",
      level,
      score,
      headline,
      summary: `Máxima prevista de ${tMax} °C (umbrales: amarillo ${params.temperatura.amarillo}, naranja ${params.temperatura.naranja}, rojo ${params.temperatura.rojo}).${detalleDuracion}${detalleHumedad}`,
      reason: {
        temperatureMaxC: tMax,
        hotHours,
        heatThreshold: params.heatThreshold,
        prolongedHours: params.prolongedHours,
        prolongedHeat,
        relativeHumidityMinPct: humedadMin,
        et0MmMax: et0Max,
        crop: context.cultivo,
        phenology: context.fenofase,
        meteorologicalRisk: level,
        thresholds: params.temperatura,
        cropSensitivity: params.cropSensitivity,
        phenologySensitivity: params.phenologySensitivity,
        score,
      },
      startsAt: context.momento,
      endsAt: null,
    };
  },
};
