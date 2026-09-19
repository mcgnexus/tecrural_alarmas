import { NextResponse } from "next/server";
import { listarCultivosPlataforma } from "@/lib/datos/catalogo-repo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.plataforma.cultivos");

export const dynamic = "force-dynamic";

export async function GET() {
  return conRequestId({ external_source: "catalogo" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const cultivos = await listarCultivosPlataforma();
      log.info("plataforma.cultivos.listar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { total: cultivos.length },
      });
      return conCabeceraRequestId(NextResponse.json(cultivos), requestId);
    } catch (error) {
      log.error(
        "plataforma.cultivos.listar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron cargar los cultivos." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
