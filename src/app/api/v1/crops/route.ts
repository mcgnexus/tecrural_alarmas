import { NextResponse } from "next/server";
import { listarCultivosPlataforma } from "@/lib/datos/catalogo-repo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.v1.crops");
export const dynamic = "force-dynamic";

export async function GET() {
  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    try {
      const cultivos = await listarCultivosPlataforma();
      log.info("v1.crops.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { total: cultivos.length } });
      return conCabeceraRequestId(NextResponse.json(cultivos), requestId);
    } catch (error) {
      log.error("v1.crops.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo cargar." }, { status: 503 }), requestId);
    }
  });
}
