import { sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { eventosLead } from "@/lib/datos/plataforma-schema";
import { recalcularLeadScoreUsuario } from "@/lib/datos/lead-scores-repo";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("cron.lead-score");

export interface LeadScoreResult {
  total: number;
  recalculated: number;
  errors: number;
}

/**
 * Cada noche: actualizar puntuaciones de usuarios.
 */
export async function ejecutarLeadScoreRecalculation(opciones: { limit?: number } = {}): Promise<LeadScoreResult> {
  const db = obtenerDb();
  const filas = await db
    .select({ userId: eventosLead.userId })
    .from(eventosLead)
    .where(sql`${eventosLead.userId} is not null`)
    .groupBy(eventosLead.userId)
    .limit(opciones.limit ?? 500);

  const ids = filas.map((f) => f.userId!).filter(Boolean);
  let recalculated = 0;
  let errors = 0;

  for (const uid of ids) {
    try {
      await recalcularLeadScoreUsuario(uid);
      recalculated += 1;
    } catch (e) {
      errors += 1;
      log.warn("cron.lead-score.item.error", { user_id: uid }, e);
    }
  }

  log.info("cron.lead-score.ok", { data: { total: ids.length, recalculated, errors } });
  return { total: ids.length, recalculated, errors };
}
