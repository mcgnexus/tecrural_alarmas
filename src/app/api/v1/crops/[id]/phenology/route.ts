import { NextResponse } from "next/server";
import { listarEstadosFenologicos } from "@/lib/datos/catalogo-repo";
import { uuidValido } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.v1.crops.phenology");
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!uuidValido(id)) return NextResponse.json({ error: "cropId no válido." }, { status: 400 });
  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    try {
      const estados = await listarEstadosFenologicos({ cropId: id });
      log.info("v1.crops.phenology.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { total: estados.length } });
      return conCabeceraRequestId(NextResponse.json(estados), requestId);
    } catch (error) {
      log.error("v1.crops.phenology.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo cargar." }, { status: 503 }), requestId);
    }
  });
}
