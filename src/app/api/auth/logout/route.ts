import { NextResponse } from "next/server";
import { cookieCierreUsuario } from "@/lib/datos/sesion-usuario";

export const dynamic = "force-dynamic";

/** Cierra la sesión de cuenta. */
export async function POST() {
  const respuesta = NextResponse.json({ ok: true });
  respuesta.headers.append("Set-Cookie", cookieCierreUsuario());
  return respuesta;
}
