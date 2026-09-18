import { NextResponse } from "next/server";
import { listarReglasRiesgo } from "@/lib/datos/reglas-repo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.reglas");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const riskType = url.searchParams.get("riskType") ?? undefined;
  const cropId = url.searchParams.get("cropId") ?? undefined;

  return conRequestId({ external_source: "reglas" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const reglas = await listarReglasRiesgo({ enabled: true, riskType, cropId });
      log.info("reglas.listar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { total: reglas.length },
      });
      return conCabeceraRequestId(NextResponse.json(reglas), requestId);
    } catch (error) {
      log.error(
        "reglas.listar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron cargar las reglas." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
