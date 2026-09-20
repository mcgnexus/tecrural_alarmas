import { NextResponse } from "next/server";
import {
  cookieDeCierre,
  cookieDeSesion,
  verificarAccesoAdmin,
} from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

/**
 * Sesion de administracion por cookie HttpOnly.
 *
 * El secreto llega en el cuerpo (nunca en la URL) y se devuelve como cookie, de
 * modo que las paginas que necesitan administracion no lo ponen en el enlace.
 */
export async function GET(req: Request) {
  const auth = verificarAccesoAdmin(req);
  return NextResponse.json({ autenticado: auth.ok, error: auth.ok ? null : auth.error }, { status: auth.ok ? 200 : 401 });
}

export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as { secret?: unknown } | null;
  const secret = typeof cuerpo?.secret === "string" ? cuerpo.secret.trim() : "";
  if (!secret) {
    return NextResponse.json({ error: "Falta el secreto." }, { status: 400 });
  }

  const auth = verificarAccesoAdmin(new Request(req.url, { headers: { "x-admin-secret": secret } }));
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const respuesta = NextResponse.json({ ok: true, caducaEn: 60 * 60 * 8 });
  respuesta.headers.append("Set-Cookie", cookieDeSesion(secret));
  return respuesta;
}

export async function DELETE() {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.headers.append("Set-Cookie", cookieDeCierre());
  return respuesta;
}
