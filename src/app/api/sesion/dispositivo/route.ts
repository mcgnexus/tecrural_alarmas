import { NextResponse } from "next/server";
import { dispositivoValido } from "@/lib/datos/validacion";
import { cookieSesion } from "@/lib/datos/sesion-dispositivo";
import { conCabeceraRequestId, conRequestId } from "@/lib/log/http";
import { crearLogger } from "@/lib/log/logger";
import { verificarAccesoAdmin } from "@/lib/admin/auth";

const log = crearLogger("api.sesion.dispositivo");

export const dynamic = "force-dynamic";

/**
 * Emite la sesión anónima firmada (cookie HttpOnly) para un dispositivoId
 * recién generado en el cliente. A partir de aquí, la autorización se hace
 * siempre contra la cookie, nunca contra el identificador enviado.
 */
export async function POST(req: Request) {
  // La sesión administrativa sustituye a la sesión anónima del dispositivo.
  // Así el admin puede usar la aplicación sin registrar un móvil.
  if ((await verificarAccesoAdmin(req)).ok) {
    return NextResponse.json({ ok: true, admin: true });
  }
  const cuerpo = (await req.json().catch(() => null)) as { dispositivoId?: string } | null;
  const id = cuerpo?.dispositivoId ?? null;
  if (!dispositivoValido(id)) {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  return conRequestId({ user_id: id as string }, async (requestId) => {
    const res = NextResponse.json({ ok: true }, {
      headers: { "Set-Cookie": cookieSesion(id as string) },
    });
    log.info("sesion.dispositivo.ok", { status: 200 });
    return conCabeceraRequestId(res, requestId);
  });
}
