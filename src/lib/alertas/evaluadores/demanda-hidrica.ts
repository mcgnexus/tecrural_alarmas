import type {
  RiskContext,
  RiskEvaluation,
  RiskEvaluator,
} from "@/lib/dominio/evaluacion";
import type { WeatherHourly } from "@/lib/dominio/proveedores";
import type { RiskLevel } from "@/lib/dominio/riesgo";
import { numeroParametro } from "./comun";

const NOTA_SIN_SENSOR =
  "Estimación meteorológica orientativa; sin sensor de suelo no se puede confirmar el estado hídrico real del cultivo.";

interface Umbral {
  yellow: number;
  orange: number;
  red: number;
}

function umbral(
  fuente: Record<string, unknown>,
  clave: string,
  porDefecto: Umbral,
): Umbral {
  const valor = (fuente[clave] ?? {}) as {
    yellow?: number;
    orange?: number;
    red?: number;
  };
  return {
    yellow: numeroParametro(valor.yellow, porDefecto.yellow),
    orange: numeroParametro(valor.orange, porDefecto.orange),
    red: numeroParametro(valor.red, porDefecto.red),
  };
}

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

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/**
 * Demanda hídrica (MVP). Balance meteorológico ET0 − precipitación. NUNCA
 * afirma estrés hídrico del cultivo sin sensor: habla de «demanda hídrica» y
 * «riesgo meteorológico de déficit hídrico».
 */
export const evaluadorDemandaHidrica: RiskEvaluator = {
  riskType: "demanda-hidrica",
  async evaluate(context: RiskContext): Promise<RiskEvaluation | null> {
    const horas = ventana72h(context.horario, context.momento);
    const et0Valores = numeros(horas.map((hora) => hora.et0Mm));
    if (et0Valores.length === 0) return null; // sin ET0 no hay balance

    const params = context.parametrosPorRiesgo?.["demanda-hidrica"] ?? {};
    const umbrales = umbral(params, "deficit72hMm", {
      yellow: 15,
      orange: 30,
      red: 50,
    });

    const et0Mm = redondear(
      et0Valores.reduce((total, valor) => total + valor, 0),
    );
    const precipitacionMm = redondear(
      numeros(horas.map((hora) => hora.precipitationMm)).reduce(
        (total, valor) => total + valor,
        0,
      ),
    );
    const et0DiarioMaxMm = redondear(Math.max(...et0Valores));
    const balanceMm = redondear(et0Mm - precipitacionMm);

    const level: RiskLevel | null =
      balanceMm >= umbrales.red
        ? "red"
        : balanceMm >= umbrales.orange
          ? "orange"
          : balanceMm >= umbrales.yellow
            ? "yellow"
            : null;
    if (!level) return null; // sin déficit relevante

    return {
      riskType: "demanda-hidrica",
      level,
      score: balanceMm,
      headline: "Demanda hídrica",
      summary: `Demanda hídrica (72 h): ET0 ${et0Mm} mm, precipitación ${precipitacionMm} mm, balance ${balanceMm} mm. ${NOTA_SIN_SENSOR}`,
      reason: {
        et0Mm72h: et0Mm,
        precipitationMm72h: precipitacionMm,
        balanceMm72h: balanceMm,
        et0DiarioMaxMm,
        crop: context.cultivo,
        phenology: context.fenofase,
        meteorologicalRisk: level,
        thresholds: umbrales,
        sensorSuelo: false,
        nota: NOTA_SIN_SENSOR,
      },
      startsAt: context.momento,
      endsAt: null,
    };
  },
};
