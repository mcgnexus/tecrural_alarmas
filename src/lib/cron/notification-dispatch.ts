import { and, eq, lte, sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { notificacionesPlataforma } from "@/lib/datos/plataforma-schema";
import { marcarNotificacionEnviada } from "@/lib/datos/notificaciones-repo";
import { crearLogger } from "@/lib/log/logger";
import { obtenerNotificador } from "@/lib/notificaciones";

const log = crearLogger("cron.notification-dispatch");

export interface NotificationDispatchResult {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Cada 15 minutos: procesar cola de notificaciones.
 */
export async function ejecutarNotificationDispatch(opciones: { limit?: number; dryRun?: boolean } = {}): Promise<NotificationDispatchResult> {
  const limit = opciones.limit ?? 50;
  const dryRun = opciones.dryRun ?? false;
  const db = obtenerDb();

  const pendientes = await db
    .select()
    .from(notificacionesPlataforma)
    .where(and(eq(notificacionesPlataforma.status, "pending"), lte(notificacionesPlataforma.scheduledAt, sql`now()`)))
    .limit(limit);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const n of pendientes) {
    if (dryRun) { sent += 1; continue; }

    try {
      const notificador = obtenerNotificador(n.channel as never);
      if (!notificador.configurado()) { skipped += 1; continue; }

      let res: { ok: boolean; error?: string } = { ok: true };
      try {
        const r = await (notificador as unknown as { enviar: (d: string, p: unknown) => Promise<{ ok: boolean; error?: string }> }).enviar(n.userId, {
          title: n.title,
          message: n.message,
          riskEventId: n.riskEventId,
        });
        res = r;
      } catch (e) {
        res = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }

      if (res.ok) {
        await marcarNotificacionEnviada(n.id, { channel: n.channel, sentAt: new Date().toISOString() });
        sent += 1;
      } else {
        failed += 1;
        log.warn("cron.notification.send.error", { external_source: n.channel }, res.error);
      }
    } catch (e) {
      failed += 1;
      log.warn("cron.notification.item.error", {}, e);
    }
  }

  log.info("cron.notification-dispatch.ok", { data: { processed: pendientes.length, sent, failed, skipped, dryRun } });
  return { processed: pendientes.length, sent, failed, skipped };
}
