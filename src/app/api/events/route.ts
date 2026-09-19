import { NextResponse } from "next/server";
import { z } from "zod";
import { TIPOS_LEAD_EVENTO } from "@/lib/datos/validacion";
import { registrarEventoLead } from "@/lib/aplicacion/lead-events";
import { dispositivoAutenticado } from "@/lib/datos/sesion-dispositivo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.v1.events");
export const dynamic = "force-dynamic";

// Payload validado: type + plotId opcional + metadata opcional. Nunca puntos.
const esquemaFrontend = z.object({
  type: z.enum(TIPOS_LEAD_EVENTO),
  plotId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  // Permitimos anonymousId/userId opcionales en body para compatibilidad, pero se ignoran puntos
  anonymousId: z.string().trim().min(1).max(128).optional(),
  userId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = esquemaFrontend.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud no válida.", issues: parsed.error.issues }, { status: 400 });
  }

  const url = new URL(req.url);

  // Identidad anónima: solo desde la cookie firmada por el servidor.
  // Un anonymousId enviado por el cliente (body/header/query) se ignora o se
  // rechaza si no coincide con la sesión, evitando inyección bajo otra identidad.
  const anonSesion = dispositivoAutenticado(req);
  const anonDeclarado =
    parsed.data.anonymousId ??
    req.headers.get("x-anonymous-id")?.trim() ??
    url.searchParams.get("anonymousId")?.trim() ??
    null;
  const headerUser = req.headers.get("x-user-id")?.trim() || null;
  const queryUser = url.searchParams.get("userId")?.trim() || null;

  const userId = parsed.data.userId ?? headerUser ?? queryUser ?? null;

  if (!anonSesion && !userId) {
    return NextResponse.json({ error: "Falta sesión de dispositivo o userId." }, { status: 401 });
  }
  if (anonDeclarado && anonDeclarado !== anonSesion) {
    return NextResponse.json({ error: "El identificador no coincide con la sesión." }, { status: 403 });
  }
  const anonymousId = anonSesion;

  // Defensa: si el frontend envía points, se ignora completamente (asignación exclusiva backend)
  const hasPoints = body !== null && typeof body === "object" && "points" in (body as Record<string, unknown>);
  if (hasPoints) {
    log.warn("v1.events.puntos_ignorados", { data: { type: parsed.data.type } });
  }

  return conRequestId({ user_id: anonymousId ?? userId ?? undefined }, async (requestId) => {
    const inicio = Date.now();
    try {
      const { id, points } = await registrarEventoLead({
        anonymousId: anonymousId ?? null,
        userId: userId ?? null,
        plotId: parsed.data.plotId ?? null,
        eventType: parsed.data.type,
        metadata: parsed.data.metadata,
      });
      log.info("v1.events.ok", { status: 201, duracion_ms: Date.now() - inicio, data: { type: parsed.data.type, points } });
      return conCabeceraRequestId(NextResponse.json({ id, type: parsed.data.type, points }, { status: 201 }), requestId);
    } catch (error) {
      log.error("v1.events.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo registrar el evento." }, { status: 503 }), requestId);
    }
  });
}
