import { NextResponse } from "next/server";
import { listarEstadosFenologicos } from "@/lib/datos/catalogo-repo";
import { uuidValido } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.plataforma.estados");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cropId = url.searchParams.get("cropId") ?? undefined;
  if (cropId && !uuidValido(cropId)) {
    return NextResponse.json({ error: "cropId no válido." }, { status: 400 });
  }

  return conRequestId({ external_source: "catalogo" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const estados = await listarEstadosFenologicos({ cropId });
      log.info("plataforma.estados.listar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { total: estados.length },
      });
      return conCabeceraRequestId(NextResponse.json(estados), requestId);
    } catch (error) {
      log.error(
        "plataforma.estados.listar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron cargar los estados fenológicos." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
