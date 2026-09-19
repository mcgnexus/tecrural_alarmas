import type {
  RiskContext,
  RiskEvaluation,
  RiskEvaluator,
} from "@/lib/dominio/evaluacion";
import { crearLogger } from "@/lib/log/logger";
import { evaluadorHelada } from "./helada";
import { evaluadorCalor } from "./calor";
import { evaluadorLluvia } from "./lluvia";
import { evaluadorTormenta } from "./tormenta";
import { evaluadorViento } from "./viento";
import { evaluadorDemandaHidrica } from "./demanda-hidrica";
import { evaluadorFitosanitario } from "./fitosanitario";

const log = crearLogger("alertas.motor-evaluadores");

export const EVALUADORES: RiskEvaluator[] = [
  evaluadorHelada,
  evaluadorCalor,
  evaluadorLluvia,
  evaluadorTormenta,
  evaluadorViento,
  evaluadorDemandaHidrica,
  evaluadorFitosanitario,
];

/**
 * Motor de alertas: ejecuta todos los `RiskEvaluator` sobre el contexto y
 * devuelve las evaluaciones de riesgo resultantes.
 */
function normalizarContexto(ctx: RiskContext): RiskContext {
  const hourly = (ctx as unknown as { hourlyForecast?: unknown }).hourlyForecast as typeof ctx.horario | undefined;
  const recent = (ctx as unknown as { recentWeather?: unknown }).recentWeather as typeof ctx.horario | undefined;
  const official = (ctx as unknown as { officialWarnings?: unknown }).officialWarnings as typeof ctx.avisosOficiales | undefined;
  const phyto = (ctx as unknown as { phytosanitaryAlerts?: unknown }).phytosanitaryAlerts as typeof ctx.avisosFitosanitarios | undefined;
  const evalTime = (ctx as unknown as { evaluationTime?: unknown }).evaluationTime as Date | undefined;
  const plotObj = (ctx as unknown as { plot?: { id: string; latitude: number; longitude: number } }).plot;
  if (hourly && !ctx.horario) (ctx as unknown as Record<string, unknown>).horario = hourly;
  if (!hourly && ctx.horario) (ctx as unknown as Record<string, unknown>).hourlyForecast = ctx.horario;
  if (recent && !ctx.horario) (ctx as unknown as Record<string, unknown>).horario = recent;
  if (official && !ctx.avisosOficiales) (ctx as unknown as Record<string, unknown>).avisosOficiales = official;
  if (phyto && !ctx.avisosFitosanitarios) (ctx as unknown as Record<string, unknown>).avisosFitosanitarios = phyto;
  if (evalTime && !ctx.momento) ctx.momento = evalTime;
  if (plotObj && !ctx.plotId) ctx.plotId = plotObj.id;
  if (plotObj && !ctx.latitud) { ctx.latitud = plotObj.latitude; ctx.longitud = plotObj.longitude; }
  return ctx;
}

function enriquecerEvaluacion(ev: RiskEvaluation): RiskEvaluation {
  const anyEv = ev as unknown as Record<string, unknown>;
  if (!anyEv.type && anyEv.riskType) anyEv.type = anyEv.riskType;
  if (!anyEv.riskType && anyEv.type) anyEv.riskType = anyEv.type;
  if (!anyEv.explanation) {
    const reason = (anyEv.reason as Record<string, unknown>) ?? {};
    const factors = Object.entries(reason).map(([k, v]) => ({ name: k, value: v as string | number | null }));
    anyEv.explanation = { factors };
  }
  if (!anyEv.sourceType) {
    const reason = (anyEv.reason as Record<string, unknown>) ?? {};
    const src = reason.source as string | undefined;
    anyEv.sourceType = src === "official" ? "OFFICIAL" : src === "tecrural" ? "TECRURAL" : "TECRURAL";
    if (reason.provider === "aemet" || reason.provider === "raif") anyEv.sourceType = "OFFICIAL";
  }
  if (!anyEv.startsAt) anyEv.startsAt = new Date();
  if (anyEv.endsAt === undefined) anyEv.endsAt = null;
  return ev;
}

export async function evaluarRiesgos(
  context: RiskContext,
): Promise<RiskEvaluation[]> {
  const ctx = normalizarContexto({ ...context });
  const resultados = await Promise.all(
    EVALUADORES.map(async (evaluador) => {
      try {
        const r = await evaluador.evaluate(ctx);
        return r ? enriquecerEvaluacion(r) : null;
      } catch (error) {
        log.warn(
          "evaluador.error",
          { external_source: evaluador.riskType },
          error,
        );
        return null;
      }
    }),
  );
  return resultados.filter((r): r is RiskEvaluation => r !== null);
}

export type { RiskEvaluator };
