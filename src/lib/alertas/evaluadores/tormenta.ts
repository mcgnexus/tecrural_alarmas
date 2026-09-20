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

const PALABRAS_TORMENTA = [
  "tormenta",
  "storm",
  "thunder",
  "tronada",
  "rayos",
  "lightning",
];

const ORDEN: Record<string, number> = {
  green: 0,
  yellow: 1,
  orange: 2,
  red: 3,
};

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

function esAvisoDeTormenta(aviso: OfficialWarning): boolean {
  const texto = `${aviso.phenomenon} ${aviso.headline}`.toLowerCase();
  return PALABRAS_TORMENTA.some((palabra) => texto.includes(palabra));
}

function nivelDeValor(valor: number, umbrales: Umbral): string {
  if (valor >= umbrales.red) return "red";
  if (valor >= umbrales.orange) return "orange";
  if (valor >= umbrales.yellow) return "yellow";
  return "green";
}

function fechaAviso(valor: string, fallback: Date): Date {
  const tiempo = Date.parse(valor);
  return Number.isFinite(tiempo) ? new Date(tiempo) : fallback;
}

function avisoEnSemana(aviso: OfficialWarning, ahora: Date): boolean {
  const inicio = Date.parse(aviso.startsAt);
  const fin = Date.parse(aviso.endsAt);
  const limite = ahora.getTime() + 7 * 24 * 60 * 60 * 1000;
  return (!Number.isFinite(inicio) || inicio <= limite) && (!Number.isFinite(fin) || fin >= ahora.getTime());
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

function maximo(valores: (number | null)[], porDefecto: number): number {
  const numeros = valores.filter((v): v is number => v !== null);
  return numeros.length ? Math.max(...numeros) : porDefecto;
}

/**
 * Riesgo de tormenta (MVP conservador). Prioriza el aviso oficial. En su
 * defecto, estima con probabilidad de precipitación + intensidad + racha; exige
 * que las tres dimensiones indiquen tormenta (se toma el mínimo). Nunca afirma
 * granizo, tornado ni rayos.
 */
export const evaluadorTormenta: RiskEvaluator = {
  riskType: "tormenta",
  async evaluate(context: RiskContext): Promise<RiskEvaluation | null> {
    const oficial = (context.avisosOficiales ?? []).find((aviso) => esAvisoDeTormenta(aviso) && avisoEnSemana(aviso, context.momento));
    if (oficial) {
      const level = nivelDesdeSeveridadTexto(oficial.severity);
      if (level === "green") return null;
      return {
        riskType: "tormenta",
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
          startsAt: fechaAviso(oficial.startsAt, context.momento),
          endsAt: oficial.endsAt ? fechaAviso(oficial.endsAt, context.momento) : null,
      };
    }

    const params = context.parametrosPorRiesgo?.tormenta ?? {};
    const uGust = umbral(params, "gust", { yellow: 50, orange: 70, red: 90 });
    const uProb = umbral(params, "precipitationProbability", {
      yellow: 50,
      orange: 70,
      red: 85,
    });
    const uInt = umbral(params, "rainIntensity", {
      yellow: 5,
      orange: 15,
      red: 30,
    });

    const horas = ventana7d(context.horario, context.momento);
    const previsionHoy = context.clima.prevision[0];
    const probabilidad = horas.length
      ? maximo(
          horas.map((h) => h.precipitationProbabilityPct),
          0,
        )
      : (previsionHoy?.probPrecipitacionMax ?? 0);
    const intensidad = horas.length
      ? maximo(
          horas.map((h) => h.precipitationMm),
          0,
        )
      : (previsionHoy?.precipitacionTotal ?? 0);
    const racha = horas.length
      ? maximo(
          horas.map((h) => h.windGustKmh),
          0,
        )
      : (previsionHoy?.rachaMaxKmh ?? 0);

    const niveles = [
      nivelDeValor(racha, uGust),
      nivelDeValor(probabilidad, uProb),
      nivelDeValor(intensidad, uInt),
    ];
    const level: string = niveles.reduce(
      (minimo, nivel) => (ORDEN[nivel] < ORDEN[minimo] ? nivel : minimo),
      "red",
    );
    if (level === "green") return null;

    return {
      riskType: "tormenta",
      level,
      score: racha + intensidad,
      headline: "Riesgo de tormenta",
      summary: `Riesgo de tormenta (estimación conservadora): probabilidad de precipitación ${probabilidad} %, intensidad máxima ${intensidad} mm/h, rachas ${racha} km/h. No se confirma granizo, tornado ni rayos.`,
      reason: {
        source: "tecrural",
        stormProbabilityPct: probabilidad,
        precipitationProbabilityPct: probabilidad,
        rainIntensityMm: intensidad,
        windGustKmh: racha,
        radarDisponible: false,
        thresholds: {
          gust: uGust,
          precipitationProbability: uProb,
          rainIntensity: uInt,
        },
        limitaciones: [
          "No se predice granizo, tornado ni rayos sin una fuente que lo soporte.",
        ],
      },
      startsAt: horas[0] ? new Date(horas[0].timestamp) : context.momento,
      endsAt: horas.at(-1) ? new Date(horas.at(-1)!.timestamp) : null,
    };
  },
};




