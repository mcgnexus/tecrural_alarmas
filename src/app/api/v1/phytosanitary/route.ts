import { NextResponse } from "next/server";
import { listarAlertasFitosanitarias } from "@/lib/datos/fitosanitario-repo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.v1.phytosanitary");
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cropId = url.searchParams.get("cropId") ?? undefined;
  const province = url.searchParams.get("province") ?? undefined;
  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    try {
      const alertas = await listarAlertasFitosanitarias({ cropId, province });
      log.info("v1.phytosanitary.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { total: alertas.length } });
      return conCabeceraRequestId(NextResponse.json(alertas), requestId);
    } catch (error) {
      log.error("v1.phytosanitary.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo cargar." }, { status: 503 }), requestId);
    }
  });
}
