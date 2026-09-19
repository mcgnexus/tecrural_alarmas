import { NextResponse } from "next/server";
import { obtenerClimaHorario } from "@/lib/clima/motor";
import { crearLogger } from "@/lib/log/logger";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";

const log = crearLogger("api.v1.weather.forecast");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const hours = Math.min(168, Math.max(1, Number(url.searchParams.get("hours") ?? "72")));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Coordenadas no válidas." }, { status: 400 });
  }
  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    try {
      const horas = await obtenerClimaHorario(lat, lon);
      // No exponer datos internos: solo horario normalizado recortado
      const recortado = horas.slice(0, hours);
      log.info("v1.weather.forecast.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { horas: recortado.length } });
      return conCabeceraRequestId(NextResponse.json(recortado), requestId);
    } catch (error) {
      log.error("v1.weather.forecast.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo obtener." }, { status: 503 }), requestId);
    }
  });
}
