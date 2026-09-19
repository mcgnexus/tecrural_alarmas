import { NextResponse } from "next/server";
import { evaluarRiesgoFungicoAgroclimatico } from "@/lib/aplicacion/fitosanitario";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.fitosanitario.agroclimatico");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const cultivo = url.searchParams.get("cultivo") ?? "";
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180 ||
    !(cultivo in catalogoCultivos)
  ) {
    return NextResponse.json(
      { error: "Parámetros no válidos." },
      { status: 400 },
    );
  }

  return conRequestId({ external_source: "fitosanitario" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const aviso = await evaluarRiesgoFungicoAgroclimatico(
        lat,
        lon,
        cultivo as CulturaId,
      );
      log.info("fitosanitario.agroclimatico.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { hayAviso: aviso !== null },
      });
      return conCabeceraRequestId(NextResponse.json(aviso), requestId);
    } catch (error) {
      log.error(
        "fitosanitario.agroclimatico.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudo evaluar el riesgo agroclimático." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
