import type {
  RiskContext,
  RiskEvaluation,
  RiskEvaluator,
} from "@/lib/dominio/evaluacion";
import type { WeatherHourly } from "@/lib/dominio/proveedores";
import type { RiskLevel } from "@/lib/dominio/riesgo";
import { aplicarSensibilidad, sensibilidadDeContexto } from "@/lib/agronomia/sensibilidad";
import { numeroParametro } from "./comun";

const NOTA_BASE =
  "Estimación meteorológica orientativa; sin sensor de suelo no se confirma el estado hídrico del cultivo. No constituye una recomendación de riego.";

function numeros(valores: (number | null)[]): number[] {
  return valores.filter((v): v is number => v !== null);
}

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}

function suma(valores: number[]): number {
  return valores.reduce((total, valor) => total + valor, 0);
}

function enVentana(
  horario: WeatherHourly[] | undefined,
  desdeMs: number,
  hastaMs: number,
): WeatherHourly[] {
  if (!horario || horario.length === 0) return [];
  return horario.filter((hora) => {
    const t = new Date(hora.timestamp).getTime();
    return t >= desdeMs && t <= hastaMs;
  });
}

/**
 * Demanda hídrica (MVP). Índice `waterDeficitIndex = demanda_7d − lluviaEfectiva_7d`.
 * La demanda es `ET0_7d` o, si el Kc está **validado** por cultivo/fenología,
 * `ETc_7d = ET0_7d × Kc`. NUNCA afirma estrés hídrico sin sensor ni produce
 * recomendaciones de riego.
 */
export const evaluadorDemandaHidrica: RiskEvaluator = {
  riskType: "demanda-hidrica",
  async evaluate(context: RiskContext): Promise<RiskEvaluation | null> {
    const ahora = context.momento.getTime();
    const pasadas = enVentana(
      context.horario,
      ahora - 7 * 24 * 60 * 60 * 1000,
      ahora,
    );
    const et0Valores = numeros(pasadas.map((hora) => hora.et0Mm));
    if (et0Valores.length === 0) return null; // sin ET0 histórico no hay índice

    const params = context.parametrosPorRiesgo?.["demanda-hidrica"] ?? {};
    const factor = numeroParametro(params.effectiveRainFactor, 0.8);
    const niveles = (params.scoreLevels ?? {}) as {
      yellow?: number;
      orange?: number;
      red?: number;
    };
    const scoreLevels = {
      yellow: numeroParametro(niveles.yellow, 20),
      orange: numeroParametro(niveles.orange, 40),
      red: numeroParametro(niveles.red, 70),
    };
    const modificador = (params.forecastModifier ?? {}) as {
      heatThresholdC?: number;
      modifier?: number;
    };
    const heatThresholdC = numeroParametro(modificador.heatThresholdC, 32);
    const modifierValue = numeroParametro(modificador.modifier, 10);

    const coef = context.coeficiente;
    const kc = coef?.kc ?? null;
    const kcAplicado = Boolean(coef?.validado && kc !== null);
    const etcMm7d = kcAplicado ? redondear(et0Valores.reduce((t, v) => t + v, 0) * (kc as number)) : null;

    const et0Mm7d = redondear(suma(et0Valores));
    const demandaBaseMm7d = etcMm7d ?? et0Mm7d;
    const rainMm7d = redondear(
      suma(numeros(pasadas.map((hora) => hora.precipitationMm))),
    );
    const effectiveRainMm7d = redondear(rainMm7d * factor);
    const waterDeficitIndex = redondear(demandaBaseMm7d - effectiveRainMm7d);

    const futuras = enVentana(
      context.horario,
      ahora - 60 * 60 * 1000,
      ahora + 168 * 60 * 60 * 1000,
    );
    const temperaturasFuturas = numeros(
      futuras.map((hora) => hora.temperatureC),
    );
    const temperatureMaxNext72hC = temperaturasFuturas.length
      ? redondear(Math.max(...temperaturasFuturas))
      : redondear(
          Math.max(0, ...context.clima.prevision.slice(0, 3).map((d) => d.tMax)),
        );
    const forecastHeatModifier =
      temperatureMaxNext72hC >= heatThresholdC ? modifierValue : 0;

    let score = redondear(waterDeficitIndex + forecastHeatModifier);
    let level: string | null =
      score >= scoreLevels.red
        ? "red"
        : score >= scoreLevels.orange
          ? "orange"
          : score >= scoreLevels.yellow
            ? "yellow"
            : null;
    if (!level) return null;
    // Fase 4: aplicar waterSensitivity
    const sensAgua = sensibilidadDeContexto(context as unknown as Record<string, unknown> & { waterSensitivity: unknown }, "demanda-hidrica");
    const ajustado = aplicarSensibilidad(level, score, sensAgua);
    level = ajustado.nivel;
    score = ajustado.score ?? score;
    if (!level) return null;

    const sensorHumedad = context.sensorData?.ultimaHumedadSueloPct ?? null;
    const sensorPresente = sensorHumedad !== null && sensorHumedad !== undefined;
    const notaSensor = sensorPresente
      ? ` Humedad suelo medida: ${sensorHumedad} %.`
      : "";
    const nota = (kcAplicado
      ? `${NOTA_BASE} Kc validado aplicado (ETc).`
      : `${NOTA_BASE} No se aplica Kc (pendiente de validar por cultivo y fenología).`) + notaSensor;

    return {
      riskType: "demanda-hidrica",
      level,
      score,
      headline: "Demanda hídrica",
      summary: `Demanda hídrica (7 días): ${kcAplicado ? `ETc ${demandaBaseMm7d} mm (Kc ${kc} validado)` : `ET0 ${et0Mm7d} mm (Kc no validado)`}, lluvia efectiva ${effectiveRainMm7d} mm (de ${rainMm7d} mm), índice de déficit ${waterDeficitIndex} mm; modificador por calor previsto +${forecastHeatModifier}.${notaSensor} ${NOTA_BASE}`,
      reason: {
        et0Mm7d,
        etcMm7d,
        kc,
        kcApplied: kcAplicado,
        kcOrigen: coef?.origen ?? null,
        demandaBaseMm7d,
        rainMm7d,
        effectiveRainMm7d,
        waterDeficitIndex,
        forecastHeatModifier,
        score,
        temperatureMaxNext72hC,
        forecastHorizonHours: 168,
        forecastHeatThresholdC: heatThresholdC,
        effectiveRainFactor: factor,
        crop: context.cultivo,
        phenology: context.fenofase,
        meteorologicalRisk: level,
        scoreLevels,
        sensorSuelo: sensorPresente,
        soilMoisturePct: sensorHumedad,
        sensorLecturas: context.sensorData?.lecturas?.length ?? 0,
        nota,
      },
      startsAt: context.momento,
      endsAt: null,
    };
  },
};

