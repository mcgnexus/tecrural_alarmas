import { NextResponse } from "next/server";
import { obtenerClimaHorario } from "@/lib/clima/motor";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.clima.horario");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return NextResponse.json(
      { error: "Coordenadas no válidas." },
      { status: 400 },
    );
  }

  return conRequestId({ external_source: "clima" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const horas = await obtenerClimaHorario(lat, lon);
      log.info("clima.horario.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { horas: horas.length },
      });
      return conCabeceraRequestId(NextResponse.json(horas), requestId);
    } catch (error) {
      log.error(
        "clima.horario.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudo obtener la previsión horaria ahora." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
