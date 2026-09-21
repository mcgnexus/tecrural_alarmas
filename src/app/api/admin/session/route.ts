import { NextResponse } from "next/server";
import {
  cookieDeCierre,
  cookieDeSesion,
  tokenDePeticion,
  verificarAccesoAdmin,
  verificarSecretoAdmin,
} from "@/lib/admin/auth";
import { crearSesionAdmin, revocarSesionAdmin } from "@/lib/datos/admin-sesiones-repo";

export const dynamic = "force-dynamic";

/**
 * Sesion de administracion por cookie HttpOnly.
 *
 * El secreto llega en el cuerpo (nunca en la URL) y se canjea por un token de
 * sesión aleatorio y revocable; la cookie no guarda el ADMIN_SECRET.
 */
export async function GET(req: Request) {
  const auth = await verificarAccesoAdmin(req);
  return NextResponse.json({ autenticado: auth.ok, error: auth.ok ? null : auth.error }, { status: auth.ok ? 200 : 401 });
}

export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as { secret?: unknown } | null;
  const secret = typeof cuerpo?.secret === "string" ? cuerpo.secret.trim() : "";
  if (!secret) {
    return NextResponse.json({ error: "Falta el secreto." }, { status: 400 });
  }

  const auth = verificarSecretoAdmin(secret);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { token, expiresAt } = await crearSesionAdmin();
  const maxAge = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  const respuesta = NextResponse.json({ ok: true, caducaEn: maxAge });
  respuesta.headers.append("Set-Cookie", cookieDeSesion(token, maxAge));
  return respuesta;
}

export async function DELETE(req: Request) {
  await revocarSesionAdmin(tokenDePeticion(req));
  const respuesta = NextResponse.json({ ok: true });
  respuesta.headers.append("Set-Cookie", cookieDeCierre());
  return respuesta;
}
