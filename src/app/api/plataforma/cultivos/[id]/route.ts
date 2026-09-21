import { NextResponse } from "next/server";
import { actualizarKcCultivo } from "@/lib/datos/catalogo-repo";
import { kcValido } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { verificarAccesoAdmin } from "@/lib/admin/auth";

const log = crearLogger("api.plataforma.cultivos.id");

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const acceso = await verificarAccesoAdmin(req);
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status });
  const { id } = await ctx.params;
  const cuerpo = (await req.json().catch(() => null)) as unknown;
  if (!kcValido(cuerpo)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  return conRequestId({ external_source: "catalogo" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const cultivo = await actualizarKcCultivo(id, {
        kc: cuerpo.kc,
        kcValidated: cuerpo.kcValidated,
      });
      if (!cultivo) {
        return conCabeceraRequestId(
          NextResponse.json({ error: "Cultivo no encontrado." }, { status: 404 }),
          requestId,
        );
      }
      log.info("plataforma.cultivos.kc.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
      });
      return conCabeceraRequestId(NextResponse.json(cultivo), requestId);
    } catch (error) {
      log.error(
        "plataforma.cultivos.kc.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudo actualizar el Kc." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
