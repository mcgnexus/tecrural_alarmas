import { NextResponse } from "next/server";
import { guardarPreferencias, obtenerPreferencias } from "@/lib/datos/notificaciones-repo";
import { preferenciasValidas } from "@/lib/datos/validacion";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.v1.notification-preferences");
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Falta userId." }, { status: 400 });
  return conRequestId({ user_id: userId }, async (requestId) => {
    const inicio = Date.now();
    try {
      const pref = await obtenerPreferencias(userId);
      log.info("v1.notification-preferences.ok", { status: 200, duracion_ms: Date.now() - inicio });
      return conCabeceraRequestId(NextResponse.json(pref ?? { userId, pushEnabled: false, emailEnabled: false, telegramEnabled: false, whatsappEnabled: false, yellowEnabled: false, orangeEnabled: true, redEnabled: true, quietHoursStart: null, quietHoursEnd: null }), requestId);
    } catch (error) {
      log.error("v1.notification-preferences.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo cargar." }, { status: 503 }), requestId);
    }
  });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const userId = (body as Record<string, unknown>)?.userId as string | undefined ?? new URL(req.url).searchParams.get("userId") ?? undefined;
  if (!userId) return NextResponse.json({ error: "Falta userId." }, { status: 400 });
  const cambios = { ...body } as Record<string, unknown>;
  delete cambios.userId;
  if (!preferenciasValidas(cambios)) return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  return conRequestId({ user_id: userId }, async (requestId) => {
    const inicio = Date.now();
    try {
      const pref = await guardarPreferencias(userId, cambios);
      log.info("v1.notification-preferences.patch.ok", { status: 200, duracion_ms: Date.now() - inicio });
      return conCabeceraRequestId(NextResponse.json(pref), requestId);
    } catch (error) {
      log.error("v1.notification-preferences.patch.error", { status: 503, duracion_ms: Date.now() - inicio }, error);
      return conCabeceraRequestId(NextResponse.json({ error: "No se pudo guardar." }, { status: 503 }), requestId);
    }
  });
}
