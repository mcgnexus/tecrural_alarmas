import { NextResponse } from "next/server";
import {
  listarNotificaciones,
  registrarNotificacion,
} from "@/lib/datos/notificaciones-repo";
import { notificacionValida, uuidValido } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.notificaciones");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  if (userId && !uuidValido(userId)) {
    return NextResponse.json({ error: "userId no válido." }, { status: 400 });
  }

  return conRequestId({ user_id: userId ?? undefined }, async (requestId) => {
    const inicio = Date.now();
    try {
      const notificaciones = await listarNotificaciones({
        userId: userId ?? undefined,
        status: url.searchParams.get("status") ?? undefined,
      });
      log.info("notificaciones.listar.ok", {
        status: 200,
        duracion_ms: Date.now() - inicio,
        data: { total: notificaciones.length },
      });
      return conCabeceraRequestId(
        NextResponse.json(notificaciones),
        requestId,
      );
    } catch (error) {
      log.error(
        "notificaciones.listar.error",
        { status: 503, duracion_ms: Date.now() - inicio },
        error,
      );
      return conCabeceraRequestId(
        NextResponse.json(
          { error: "No se pudieron cargar las notificaciones." },
          { status: 503 },
        ),
        requestId,
      );
    }
  });
}

export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as unknown;
  if (!notificacionValida(cuerpo)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  return conRequestId(
    { user_id: cuerpo.userId, external_source: cuerpo.channel },
    async (requestId) => {
      const inicio = Date.now();
      try {
        await registrarNotificacion({
          userId: cuerpo.userId,
          riskEventId: cuerpo.riskEventId ?? null,
          channel: cuerpo.channel,
          title: cuerpo.title,
          message: cuerpo.message,
          dedupKey: cuerpo.dedupKey,
          scheduledAt: cuerpo.scheduledAt
            ? new Date(cuerpo.scheduledAt)
            : undefined,
        });
        log.info("notificaciones.crear.ok", {
          status: 201,
          duracion_ms: Date.now() - inicio,
        });
        return conCabeceraRequestId(
          NextResponse.json({ ok: true }, { status: 201 }),
          requestId,
        );
      } catch (error) {
        log.error(
          "notificaciones.crear.error",
          { status: 503, duracion_ms: Date.now() - inicio },
          error,
        );
        return conCabeceraRequestId(
          NextResponse.json(
            { error: "No se pudo registrar la notificación." },
            { status: 503 },
          ),
          requestId,
        );
      }
    },
  );
}
