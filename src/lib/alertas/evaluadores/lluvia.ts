import type {
  RiskContext,
  RiskEvaluation,
  RiskEvaluator,
} from "@/lib/dominio/evaluacion";
import type {
  OfficialWarning,
  WeatherHourly,
} from "@/lib/dominio/proveedores";
import type { RiskLevel } from "@/lib/dominio/riesgo";
import { nivelDesdeSeveridadTexto, numeroParametro } from "./comun";

const PALABRAS_LLUVIA = ["lluvia", "precipitac", "rain", "chubasc", "aguacero"];

const ORDEN: Record<RiskLevel, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

interface UmbralVentana {
  yellow: number;
  orange: number;
  red: number;
}

function esAvisoDeLluvia(aviso: OfficialWarning): boolean {
  const texto = `${aviso.phenomenon} ${aviso.headline}`.toLowerCase();
  return PALABRAS_LLUVIA.some((palabra) => texto.includes(palabra));
}

function umbral(
  fuente: Record<string, unknown>,
  clave: string,
  porDefecto: UmbralVentana,
): UmbralVentana {
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

function nivelDeValor(valor: number, umbrales: UmbralVentana): RiskLevel | null {
  return valor >= umbrales.red
    ? "red"
    : valor >= umbrales.orange
      ? "orange"
      : valor >= umbrales.yellow
        ? "yellow"
        : null;
}

function ventana(
  horario: WeatherHourly[] | undefined,
  momento: Date,
  horas: number,
): WeatherHourly[] {
  if (!horario || horario.length === 0) return [];
  const desde = momento.getTime() - 60 * 60 * 1000;
  return horario
    .filter((hora) => new Date(hora.timestamp).getTime() >= desde)
    .slice(0, horas);
}

function sumaPrecipitacion(horas: WeatherHourly[]): number {
  return Number(
    horas
      .reduce((total, hora) => total + (hora.precipitationMm ?? 0), 0)
      .toFixed(1),
  );
}

/**
 * Riesgo de lluvia. **Prioridad absoluta**: si existe un aviso oficial de
 * lluvia activo, se muestra tal cual (sin reinterpretar su nivel). En su
 * defecto, se emite una estimación propia (TecRural) por ventanas 1/3/6/24 h.
 */
export const evaluadorLluvia: RiskEvaluator = {
  riskType: "lluvia",
  async evaluate(context: RiskContext): Promise<RiskEvaluation | null> {
    const oficial = (context.avisosOficiales ?? []).find(esAvisoDeLluvia);
    if (oficial) {
      const level = nivelDesdeSeveridadTexto(oficial.severity);
      if (level === "green") return null;
      return {
        riskType: "lluvia",
        level,
        score: null,
        headline: `AVISO OFICIAL: ${oficial.headline || oficial.phenomenon}`,
        summary: `${oficial.description ?? oficial.headline}. Fuente: ${oficial.provider}. Aviso oficial, no reinterpretado por TecRural.`,
        reason: {
          source: "official",
          provider: oficial.provider,
          severity: oficial.severity,
          phenomenon: oficial.phenomenon,
          area: oficial.area,
          startsAt: oficial.startsAt,
          endsAt: oficial.endsAt,
        },
        startsAt: context.momento,
        endsAt: null,
      };
    }

    const params = context.parametrosPorRiesgo?.lluvia ?? {};
    const thresholds = (params.thresholds ?? {}) as Record<string, unknown>;
    const u1 = umbral(thresholds, "rain1h", { yellow: 5, orange: 15, red: 30 });
    const u3 = umbral(thresholds, "rain3h", { yellow: 8, orange: 20, red: 40 });
    const u6 = umbral(thresholds, "rain6h", {
      yellow: 10,
      orange: 25,
      red: 50,
    });
    const u24 = umbral(thresholds, "rain24h", {
      yellow: 20,
      orange: 40,
      red: 80,
    });

    const h1 = ventana(context.horario, context.momento, 1);
    const h3 = ventana(context.horario, context.momento, 3);
    const h6 = ventana(context.horario, context.momento, 6);
    const h24 = ventana(context.horario, context.momento, 24);

    const rain1h = sumaPrecipitacion(h1);
    const rain3h = sumaPrecipitacion(h3);
    const rain6h = sumaPrecipitacion(h6);
    const rain24h = context.horario?.length
      ? sumaPrecipitacion(h24)
      : (context.clima.prevision[0]?.precipitacionTotal ?? 0);
    const probabilidad = h24.length
      ? Math.max(
          ...h24.map((hora) => hora.precipitationProbabilityPct ?? 0),
        )
      : (context.clima.prevision[0]?.probPrecipitacionMax ?? 0);

    const niveles: RiskLevel[] = [];
    for (const nivel of [
      nivelDeValor(rain1h, u1),
      nivelDeValor(rain3h, u3),
      nivelDeValor(rain6h, u6),
      nivelDeValor(rain24h, u24),
    ]) {
      if (nivel) niveles.push(nivel);
    }
    if (niveles.length === 0) return null;

    let level: RiskLevel = niveles[0]!;
    for (const nivel of niveles) {
      if (ORDEN[nivel] > ORDEN[level]) level = nivel;
    }

    return {
      riskType: "lluvia",
      level,
      score: rain24h,
      headline: "ESTIMACIÓN TECRURAL: lluvia prevista",
      summary: `Estimación propia (no oficial): 1 h ${rain1h} mm · 3 h ${rain3h} mm · 6 h ${rain6h} mm · 24 h ${rain24h} mm. Probabilidad máxima ${probabilidad} %.`,
      reason: {
        source: "tecrural",
        rain1hMm: rain1h,
        rain3hMm: rain3h,
        rain6hMm: rain6h,
        rain24hMm: rain24h,
        precipitationProbabilityPct: probabilidad,
        thresholds: { rain1h: u1, rain3h: u3, rain6h: u6, rain24h: u24 },
      },
      startsAt: context.momento,
      endsAt: null,
    };
  },
};
