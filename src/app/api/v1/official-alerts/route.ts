import { NextResponse } from "next/server";
import { obtenerAvisosOficiales } from "@/lib/clima/motor";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.v1.official-alerts");
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "Coordenadas no válidas." }, { status: 400 });
  }
  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    try {
      const avisos = await obtenerAvisosOficiales(lat, lon);
      log.info("v1.official-alerts.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { total: avisos.length } });
      return conCabeceraRequestId(NextResponse.json(avisos), requestId);
    } catch (error) {
      log.error("v1.official-alerts.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo obtener." }, { status: 503 }), requestId);
    }
  });
}
