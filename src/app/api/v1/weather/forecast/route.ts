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
  const aemetMunicipio = url.searchParams.get("aemetMunicipio")?.trim() || undefined;
  const horasParam = Number(url.searchParams.get("hours") ?? "72");
  if (
    !Number.isFinite(horasParam) ||
    !Number.isInteger(horasParam) ||
    horasParam < 1 ||
    horasParam > 168
  ) {
    return NextResponse.json({ error: "hours debe ser un entero entre 1 y 168." }, { status: 400 });
  }
  const hours = horasParam;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Coordenadas no válidas." }, { status: 400 });
  }
  return conRequestId({}, async (requestId) => {
    const inicio = Date.now();
    try {
      const horas = await obtenerClimaHorario(lat, lon, aemetMunicipio);
      // La fuente (Open-Meteo) incluye past_days; no servir histórico como forecast.
      const ahora = Date.now();
      const futuras = horas
        .filter((h) => Number.isFinite(Date.parse(h.timestamp)) && Date.parse(h.timestamp) >= ahora)
        .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
      const recortado = futuras.slice(0, hours);
      if (recortado.length === 0) throw new Error("No hay horas futuras válidas");
      log.info("v1.weather.forecast.ok", { status: 200, duracion_ms: Date.now() - inicio, data: { horas: recortado.length } });
      return conCabeceraRequestId(NextResponse.json(recortado), requestId);
    } catch (error) {
      log.error("v1.weather.forecast.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo obtener." }, { status: 503 }), requestId);
    }
  });
}
