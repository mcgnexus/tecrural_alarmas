import { NextResponse } from "next/server";
import { obtenerDb } from "@/lib/datos/db";
import { parcelasPlataforma } from "@/lib/datos/plataforma-schema";
import { evaluarPlotPlataforma } from "@/lib/aplicacion/riesgo-plataforma";
import { verificarAccesoInterno } from "@/lib/internal/auth";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.internal.alerts.evaluate");
export const dynamic = "force-dynamic";

async function handler(req: Request) {
  const auth = verificarAccesoInterno(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return conRequestId({ external_source: "internal" }, async (requestId) => {
    const inicio = Date.now();
    try {
      let body: unknown = null;
      try { body = await req.clone().json(); } catch { body = null; }
      const b = (body ?? {}) as { plotId?: string; plotIds?: string[]; limit?: number };
      const plotIds = b.plotId ? [b.plotId] : Array.isArray(b.plotIds) ? b.plotIds : null;
      const limite = typeof b.limit === "number" && b.limit > 0 ? Math.min(b.limit, 200) : null;

      let ids: string[];
      if (plotIds) {
        ids = plotIds;
      } else {
        const db = obtenerDb();
        const filas = await db.select({ id: parcelasPlataforma.id }).from(parcelasPlataforma).limit(limite ?? 200);
        ids = filas.map((f) => f.id);
      }

      let evaluated = 0;
      let events = 0;
      let errors = 0;

      for (const id of ids) {
        try {
          const res = await evaluarPlotPlataforma(id);
          evaluated += 1;
          events += res.eventos.length;
        } catch (e) {
          errors += 1;
          log.warn("internal.alerts.evaluate.item.error", { plot_id: id }, e);
        }
      }

      log.info("internal.alerts.evaluate.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { evaluated, events, errors, total: ids.length } });
      return conCabeceraRequestId(NextResponse.json({ evaluated, events, errors, total: ids.length }), requestId);
    } catch (error) {
      log.error("internal.alerts.evaluate.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo evaluar alertas." }, { status: 503 }), requestId);
    }
  });
}

export const POST = handler;
