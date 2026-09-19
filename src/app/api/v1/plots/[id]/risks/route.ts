import { NextResponse } from "next/server";
import { evaluarPlotPlataforma } from "@/lib/aplicacion/riesgo-plataforma";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.v1.plots.risks");
export const dynamic = "force-dynamic";

function mapear(r: { riskType: string; level: string; headline: string; summary: string; reason: unknown; startsAt: string; endsAt: string | null; id: string }) {
  return {
    type: r.riskType.toUpperCase().replace(/-/g, "_"),
    level: r.level.toUpperCase(),
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    headline: r.headline,
    summary: r.summary,
    riskId: r.id,
    reason: r.reason,
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return conRequestId({ plot_id: id }, async (requestId) => {
    const inicio = Date.now();
    try {
      const resultado = await evaluarPlotPlataforma(id);
      const risks = resultado.eventos.map((e) => mapear({
        riskType: e.riskType, level: e.level, headline: e.headline, summary: e.summary, reason: e.reason,
        startsAt: e.startsAt, endsAt: e.endsAt, id: e.id,
      }));
      const payload = { plotId: id, generatedAt: resultado.evaluadoEl, risks };
      log.info("v1.plots.risks.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { total: risks.length } });
      return conCabeceraRequestId(NextResponse.json(payload), requestId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      const status = msg === "Parcela no encontrada" || msg === "Cultivo no soportado" || msg === "Parcela sin coordenadas" ? 404 : 503;
      log.error("v1.plots.risks.error", { status, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: msg || "No se pudo evaluar." }, { status }), requestId);
    }
  });
}
