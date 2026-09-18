import { NextResponse } from "next/server";
import { listarAvisosOficiales } from "@/lib/datos/alertas-oficiales-repo";
import { obtenerAvisosOficiales } from "@/lib/clima/motor";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.avisos-oficiales");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);

  return conRequestId({ external_source: "avisos" }, async (requestId) => {
    const inicio = Date.now();

    // Avisos ya persistidos (auditoría / offline).
    if (url.searchParams.get("persistidos") === "1") {
      try {
        const guardados = await listarAvisosOficiales();
        log.info("avisos.oficiales.persistidos", {
          status: 200,
          duracion_ms: Date.now() - inicio,
          data: { total: guardados.length },
        });
        return conCabeceraRequestId(NextResponse.json(guardados), requestId);
      } catch (error) {
        log.error(
          "avisos.oficiales.persistidos.error",
          { status: 503, duracion_ms: Date.now() - inicio },
          error,
        );
        return conCabeceraRequestId(
          NextResponse.json(
            { error: "No se pudieron leer los avisos guardados." },
            { status: 503 },
          ),
          requestId,
        );
      }
    }

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

    try {
      const avisos = await obtenerAvisosOficiales(lat, lon);
      log.info("avisos.oficiales.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { total: avisos.length },
      });
      return conCabeceraRequestId(NextResponse.json(avisos), requestId);
    } catch (error) {
      log.error(
        "avisos.oficiales.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron obtener los avisos ahora." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
