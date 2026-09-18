import { NextResponse } from "next/server";
import {
  guardarPreferencias,
  obtenerPreferencias,
} from "@/lib/datos/notificaciones-repo";
import { preferenciasValidas, uuidValido } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.notificaciones.preferencias");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (!uuidValido(userId)) {
    return NextResponse.json({ error: "Falta userId válido." }, { status: 400 });
  }

  return conRequestId({ user_id: userId }, async (requestId) => {
    const inicio = Date.now();
    try {
      const preferencias = await obtenerPreferencias(userId);
      log.info("notificaciones.preferencias.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
      });
      return conCabeceraRequestId(
        NextResponse.json(preferencias),
        requestId,
      );
    } catch (error) {
      log.error(
        "notificaciones.preferencias.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron cargar las preferencias." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}

export async function PUT(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as
    | (Record<string, unknown> & { userId?: string })
    | null;
  const userId = cuerpo?.userId;
  if (!uuidValido(userId)) {
    return NextResponse.json({ error: "Falta userId válido." }, { status: 400 });
  }
  const cambios: Record<string, unknown> = { ...cuerpo };
  delete cambios.userId;
  if (!preferenciasValidas(cambios)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  return conRequestId({ user_id: userId }, async (requestId) => {
    const inicio = Date.now();
    try {
      const guardadas = await guardarPreferencias(userId, cambios);
      log.info("notificaciones.preferencias.guardadas", {
        status: 200,
        duracion_ms: Date.now() - inicio,
      });
      return conCabeceraRequestId(NextResponse.json(guardadas), requestId);
    } catch (error) {
      log.error(
        "notificaciones.preferencias.guardar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron guardar las preferencias." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}
