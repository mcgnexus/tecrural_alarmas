import { NextResponse } from "next/server";
import {
  actualizarReglaRiesgo,
  eliminarReglaRiesgo,
} from "@/lib/datos/reglas-repo";
import { reglaRiesgoParcialValida } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { verificarAccesoAdmin } from "@/lib/admin/auth";

const log = crearLogger("api.reglas.id");

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const acceso = await verificarAccesoAdmin(req);
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status });
  const { id } = await ctx.params;
  const cuerpo = (await req.json().catch(() => null)) as unknown;
  if (!reglaRiesgoParcialValida(cuerpo)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  return conRequestId({ external_source: "reglas" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const regla = await actualizarReglaRiesgo(id, cuerpo);
      if (!regla) {
        return conCabeceraRequestId(
          NextResponse.json({ error: "Regla no encontrada." }, { status: 404 }),
          requestId,
        );
      }
      log.info("reglas.actualizar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
      });
      return conCabeceraRequestId(NextResponse.json(regla), requestId);
    } catch (error) {
      log.error(
        "reglas.actualizar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudo actualizar la regla." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const acceso = await verificarAccesoAdmin(req);
  if (!acceso.ok) return NextResponse.json({ error: acceso.error }, { status: acceso.status });
  const { id } = await ctx.params;

  return conRequestId({ external_source: "reglas" }, async (requestId) => {
    const inicio = Date.now();
    try {
      const eliminada = await eliminarReglaRiesgo(id);
      if (!eliminada) {
        return conCabeceraRequestId(
          NextResponse.json({ error: "Regla no encontrada." }, { status: 404 }),
          requestId,
        );
      }
      log.info("reglas.eliminar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
      });
      return conCabeceraRequestId(NextResponse.json({ ok: true }), requestId);
    } catch (error) {
      log.error(
        "reglas.eliminar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudo eliminar la regla." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
