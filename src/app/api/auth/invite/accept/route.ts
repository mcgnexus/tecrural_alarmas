import { NextResponse } from "next/server";
import { aceptarInvitacion } from "@/lib/aplicacion/cuentas";
import { dispositivoAutenticado } from "@/lib/datos/sesion-dispositivo";
import { cookieSesionUsuario } from "@/lib/datos/sesion-usuario";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.auth.invite.accept");
export const dynamic = "force-dynamic";

/**
 * Canjea una invitación de un solo uso: crea la sesión de cuenta y vincula los
 * datos del dispositivo actual. El dispositivo se toma de su cookie firmada, no
 * del cuerpo de la petición.
 */
export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as { token?: unknown } | null;
  const token = typeof cuerpo?.token === "string" ? cuerpo.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Falta el token de invitación." }, { status: 400 });
  }

  const dispositivoId = dispositivoAutenticado(req) ?? "";
  try {
    const userId = await aceptarInvitacion(token, dispositivoId);
    if (!userId) {
      return NextResponse.json(
        { error: "Invitación no válida o caducada. Pide una nueva." },
        { status: 400 },
      );
    }
    const respuesta = NextResponse.json({ ok: true });
    respuesta.headers.append("Set-Cookie", cookieSesionUsuario(userId));
    log.info("auth.invite.accept.ok", { user_id: userId });
    return respuesta;
  } catch (error) {
    log.error("auth.invite.accept.error", {}, error);
    return NextResponse.json({ error: "No se pudo activar la cuenta." }, { status: 503 });
  }
}
