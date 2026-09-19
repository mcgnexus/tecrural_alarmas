import { eq, isNotNull } from "drizzle-orm";
import { evaluarPlotPlataforma } from "@/lib/aplicacion/riesgo-plataforma";
import { decidirNotificacion } from "@/lib/alertas/dedup";
import { obtenerDb } from "@/lib/datos/db";
import { explotaciones, notificacionesPlataforma, parcelasPlataforma } from "@/lib/datos/plataforma-schema";
import { listarEventosRiesgo } from "@/lib/datos/eventos-riesgo-repo";
import { obtenerPreferencias } from "@/lib/datos/notificaciones-repo";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("cron.risk-evaluation");

export interface RiskEvaluationResult {
  total: number;
  evaluated: number;
  events: number;
  notifications: number;
  errors: number;
}

function nivelHabilitado(
  level: string,
  prefs: { yellowEnabled: boolean; orangeEnabled: boolean; redEnabled: boolean },
  isOfficial?: boolean,
): boolean {
  if (level === "green") return false;
  if (isOfficial) return true;
  if (level === "red") return true;
  if (level === "orange") return prefs.orangeEnabled;
  if (level === "yellow") return prefs.yellowEnabled;
  return false;
}

/**
 * Cada 3 horas:
 * 1. seleccionar parcelas activas;
 * 2. obtener contexto meteorológico;
 * 3. ejecutar RiskEvaluators;
 * 4. comparar contra risk_event existente;
 * 5. crear o actualizar;
 * 6. crear notificación si procede.
 */
export async function ejecutarRiskEvaluation(opciones: { limit?: number; plotId?: string } = {}): Promise<RiskEvaluationResult> {
  const db = obtenerDb();
  let ids: string[];
  if (opciones.plotId) {
    ids = [opciones.plotId];
  } else {
    const filas = await db
      .select({ id: parcelasPlataforma.id })
      .from(parcelasPlataforma)
      .where(isNotNull(parcelasPlataforma.latitude))
      .limit(opciones.limit ?? 200);
    ids = filas.map((f) => f.id);
  }

  let evaluated = 0;
  let events = 0;
  let notifications = 0;
  let errors = 0;

  for (const id of ids) {
    let previos = new Map<string, (typeof listarEventosRiesgo extends (...a: never[]) => Promise<infer R> ? (R extends (infer U)[] ? U : never) : never)>();
    try {
      const lista = await listarEventosRiesgo({ plotId: id, status: "open", limite: 50 });
      previos = new Map(lista.map((e) => [e.riskType, e]));
    } catch {
      // sin previos
    }

    try {
      const res = await evaluarPlotPlataforma(id);
      evaluated += 1;
      events += res.eventos.length;

      // userId via farm (una vez por parcela)
      const [parcela] = await db.select({ farmId: parcelasPlataforma.farmId }).from(parcelasPlataforma).where(eq(parcelasPlataforma.id, id)).limit(1);
      if (!parcela) continue;
      const [farm] = await db.select({ userId: explotaciones.userId }).from(explotaciones).where(eq(explotaciones.id, parcela.farmId)).limit(1);
      const userId = farm?.userId;
      if (!userId) continue;

      let prefs;
      try { prefs = await obtenerPreferencias(userId); } catch { continue; }
      const p = prefs ?? { yellowEnabled: false, orangeEnabled: true, redEnabled: true };
      if (!p) continue;

      for (const ev of res.eventos) {
        if (ev.level === "green") continue;
        const isOfficial = (ev.reason as Record<string, unknown>)?.source === "official";
        if (!nivelHabilitado(ev.level, p as never, isOfficial)) continue;

        const previo = previos.get(ev.riskType) ?? null;
        const decision = decidirNotificacion({
          userId,
          plotId: id,
          previo,
          actual: {
            riskType: ev.riskType,
            level: ev.level,
            score: ev.score,
            headline: ev.headline,
            summary: ev.summary,
            reason: ev.reason as Record<string, unknown>,
            startsAt: new Date(ev.startsAt),
            endsAt: ev.endsAt ? new Date(ev.endsAt) : null,
          },
        });

        if (!decision.enviar) {
          log.debug("cron.risk-evaluation.dedup.skip", { plot_id: id, data: { riskType: ev.riskType, razon: decision.razon, diff: decision.diffIntensidad } });
          continue;
        }

        try {
          await db
            .insert(notificacionesPlataforma)
            .values({
              userId,
              riskEventId: ev.id,
              channel: "push",
              title: ev.headline,
              message: ev.summary,
              status: "pending",
              dedupKey: decision.dedupKey,
            })
            .onConflictDoNothing();
          notifications += 1;
          log.info("cron.risk-evaluation.notif.ok", { plot_id: id, data: { riskType: ev.riskType, razon: decision.razon } });
        } catch (e) {
          log.warn("cron.risk-evaluation.notif.error", { plot_id: id }, e);
        }
      }
    } catch (e) {
      errors += 1;
      log.warn("cron.risk-evaluation.item.error", { plot_id: id }, e);
    }
  }

  log.info("cron.risk-evaluation.ok", { data: { total: ids.length, evaluated, events, notifications, errors } });
  return { total: ids.length, evaluated, events, notifications, errors };
}
