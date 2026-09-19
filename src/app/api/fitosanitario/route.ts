import { NextResponse } from "next/server";
import { listarAvisosFitosanitariosOficiales } from "@/lib/aplicacion/fitosanitario";
import { proveedorRaif } from "@/lib/proveedores/raif";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.fitosanitario");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const cropId = url.searchParams.get("cropId") ?? undefined;
  const province = url.searchParams.get("province") ?? undefined;

  return conRequestId({ external_source: "fitosanitario" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const avisos = await listarAvisosFitosanitariosOficiales({
        cropId,
        province,
      });
      log.info("fitosanitario.listar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { total: avisos.length },
      });
      return conCabeceraRequestId(
        NextResponse.json({
          disponible: proveedorRaif.configurado(),
          avisos,
        }),
        requestId,
      );
    } catch (error) {
      log.error(
        "fitosanitario.listar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron cargar los avisos fitosanitarios." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
