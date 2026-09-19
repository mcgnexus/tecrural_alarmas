import { NextResponse } from "next/server";
import { obtenerClimaHorario } from "@/lib/clima/motor";
import { horaMasCercana } from "@/lib/normalizacion/horario";
import { crearLogger } from "@/lib/log/logger";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";

const log = crearLogger("api.v1.weather.current");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Coordenadas no válidas." }, { status: 400 });
  }
  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    try {
      const horas = await obtenerClimaHorario(lat, lon);
      const actual = horaMasCercana(horas);
      log.info("v1.weather.current.ok", { status: 200, duracion_ms: Date.now() - inicio });
      return conCabeceraRequestId(NextResponse.json(actual), requestId);
    } catch (error) {
      log.error("v1.weather.current.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo obtener." }, { status: 503 }), requestId);
    }
  });
}
