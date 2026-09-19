import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { obtenerDb } from "@/lib/datos/db";
import { eventosLead } from "@/lib/datos/plataforma-schema";
import { recalcularLeadScoreUsuario } from "@/lib/datos/lead-scores-repo";
import { verificarAccesoInterno } from "@/lib/internal/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.internal.lead-scores.recalculate");
export const dynamic = "force-dynamic";

async function handler(req: Request) {
  const auth = verificarAccesoInterno(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return conRequestId({ external_source: "internal" }, async (requestId) => {
    const inicio = Date.now();
    try {
      let body: unknown = null;
      try { body = await req.clone().json(); } catch { body = null; }
      const b = (body ?? {}) as { userId?: string; userIds?: string[]; limit?: number };
      const targetIds = b.userId ? [b.userId] : Array.isArray(b.userIds) ? b.userIds : null;
      const limit = typeof b.limit === "number" && b.limit > 0 ? Math.min(b.limit, 500) : 200;

      let ids: string[];
      if (targetIds) {
        ids = targetIds;
      } else {
        const db = obtenerDb();
        const filas = await db
          .select({ userId: eventosLead.userId })
          .from(eventosLead)
          .where(sql`${eventosLead.userId} is not null`)
          .groupBy(eventosLead.userId)
          .limit(limit);
        ids = filas.map((f) => f.userId!).filter(Boolean);
      }

      let recalculated = 0;
      let errors = 0;
      for (const uid of ids) {
        try {
          await recalcularLeadScoreUsuario(uid);
          recalculated += 1;
        } catch (e) {
          errors += 1;
          log.warn("internal.lead-scores.item.error", { user_id: uid }, e);
        }
      }

      log.info("internal.lead-scores.recalculate.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { recalculated, errors, total: ids.length } });
      return conCabeceraRequestId(NextResponse.json({ recalculated, errors, total: ids.length }), requestId);
    } catch (error) {
      log.error("internal.lead-scores.recalculate.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo recalcular lead scores." }, { status: 503 }), requestId);
    }
  });
}

export const POST = handler;
