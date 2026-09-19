import { NextResponse } from "next/server";
import { listarEventosRiesgo } from "@/lib/datos/eventos-riesgo-repo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.v1.plots.risks.detail");
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; riskId: string }> }) {
  const { id, riskId } = await ctx.params;
  return conRequestId({ plot_id: id }, async (requestId) => {
    const inicio = Date.now();
    try {
      const eventos = await listarEventosRiesgo({ plotId: id, limite: 100 });
      const evento = eventos.find((e) => e.id === riskId);
      if (!evento) return conCabeceraRequestId(NextResponse.json({ error: "No encontrado." }, { status: 404 }), requestId);
      log.info("v1.plots.risks.detail.ok", { status: 200, duracion_ms: Date.now() - inicio });
      return conCabeceraRequestId(NextResponse.json(evento), requestId);
    } catch (error) {
      log.error("v1.plots.risks.detail.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo obtener." }, { status: 503 }), requestId);
    }
  });
}
