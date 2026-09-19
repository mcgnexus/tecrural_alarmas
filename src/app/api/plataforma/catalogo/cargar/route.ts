import { NextResponse } from "next/server";
import { cargarCatalogoFenologico } from "@/lib/aplicacion/catalogo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.plataforma.catalogo.cargar");

export const dynamic = "force-dynamic";

export async function POST() {
  return conRequestId({ external_source: "catalogo" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const resultado = await cargarCatalogoFenologico();
      log.info("plataforma.catalogo.cargar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { ...resultado },
      });
      return conCabeceraRequestId(NextResponse.json(resultado), requestId);
    } catch (error) {
      log.error(
        "plataforma.catalogo.cargar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudo cargar el catálogo fenológico." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
