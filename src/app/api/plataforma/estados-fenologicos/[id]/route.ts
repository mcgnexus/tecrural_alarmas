import { NextResponse } from "next/server";
import { actualizarKcEstado } from "@/lib/datos/catalogo-repo";
import { kcValido } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.plataforma.estados.id");

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const cuerpo = (await req.json().catch(() => null)) as unknown;
  if (!kcValido(cuerpo)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  return conRequestId({ external_source: "catalogo" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const estado = await actualizarKcEstado(id, {
        kc: cuerpo.kc,
        kcValidated: cuerpo.kcValidated,
      });
      if (!estado) {
        return conCabeceraRequestId(
          NextResponse.json({ error: "Estado no encontrado." }, { status: 404 }),
          requestId,
        );
      }
      log.info("plataforma.estados.kc.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
      });
      return conCabeceraRequestId(NextResponse.json(estado), requestId);
    } catch (error) {
      log.error(
        "plataforma.estados.kc.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudo actualizar el Kc del estado." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
