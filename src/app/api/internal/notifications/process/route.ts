import { NextResponse } from "next/server";
import { and, eq, lte, sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { notificacionesPlataforma } from "@/lib/datos/plataforma-schema";
import { marcarNotificacionEnviada } from "@/lib/datos/notificaciones-repo";
import { verificarAccesoInterno } from "@/lib/internal/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { obtenerNotificador } from "@/lib/notificaciones";

const log = crearLogger("api.internal.notifications.process");
export const dynamic = "force-dynamic";

async function handler(req: Request) {
  const auth = verificarAccesoInterno(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return conRequestId({ external_source: "internal" }, async (requestId) => {
    const inicio = Date.now();
    try {
      let body: unknown = null;
      try { body = await req.clone().json(); } catch { body = null; }
      const b = (body ?? {}) as { limit?: number; dryRun?: boolean };
      const limit = typeof b.limit === "number" && b.limit > 0 ? Math.min(b.limit, 200) : 50;
      const dryRun = b.dryRun === true;

      const db = obtenerDb();
      const pendientes = await db
        .select()
        .from(notificacionesPlataforma)
        .where(and(eq(notificacionesPlataforma.status, "pending"), lte(notificacionesPlataforma.scheduledAt, sql`now()`)))
        .limit(limit);

      let processed = 0;
      let sent = 0;
      let failed = 0;
      let skipped = 0;

      for (const n of pendientes) {
        processed += 1;
        if (dryRun) {
          sent += 1;
          continue;
        }

        try {
          const notificador = obtenerNotificador(n.channel as never);
          if (!notificador.configurado()) {
            skipped += 1;
            log.warn("internal.notifications.channel.no_configurado", { external_source: n.channel });
            continue;
          }

          // Intento de envío: para canales push/email/etc. se delega al notificador.
          // Si el canal requiere destino, se usa el mensaje ya registrado; algunos
          // notificadores esperan un destino (p. ej. push subscription) que aquí ya
          // está materializado en la notificación.
          let envio: { ok: boolean; error?: string } = { ok: true };
          try {
            // Los notificadores tipados esperan (destino, payload); usamos el userId
            // como destino genérico cuando el canal es log/telegram y no requiere sub.
            const res = await (notificador as unknown as { enviar: (d: string, p: unknown) => Promise<{ ok: boolean; error?: string }> }).enviar(n.userId, {
              title: n.title,
              message: n.message,
              riskEventId: n.riskEventId,
            });
            envio = res;
          } catch (e) {
            envio = { ok: false, error: e instanceof Error ? e.message : String(e) };
          }

          if (envio.ok) {
            await marcarNotificacionEnviada(n.id, { channel: n.channel, sentAt: new Date().toISOString() });
            sent += 1;
          } else {
            failed += 1;
            log.warn("internal.notifications.send.error", { external_source: n.channel }, envio.error);
          }
        } catch (e) {
          failed += 1;
          log.warn("internal.notifications.process.item.error", {}, e);
        }
      }

      log.info("internal.notifications.process.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { processed, sent, failed, skipped, dryRun } });
      return conCabeceraRequestId(NextResponse.json({ processed, sent, failed, skipped, dryRun, total: pendientes.length }), requestId);
    } catch (error) {
      log.error("internal.notifications.process.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo procesar notificaciones." }, { status: 503 }), requestId);
    }
  });
}

export const POST = handler;
