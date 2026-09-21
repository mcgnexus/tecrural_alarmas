import { NextResponse } from "next/server";
import { borrarCuenta } from "@/lib/aplicacion/cuentas";
import { cookieCierreUsuario, usuarioAutenticado } from "@/lib/datos/sesion-usuario";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("api.account.delete");
export const dynamic = "force-dynamic";

/** Borra la cuenta y anonimiza sus datos. */
export async function POST(req: Request) {
  const userId = usuarioAutenticado(req);
  if (!userId) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  try {
    await borrarCuenta(userId);
    const respuesta = NextResponse.json({ ok: true });
    respuesta.headers.append("Set-Cookie", cookieCierreUsuario());
    log.info("account.delete.ok", { user_id: userId });
    return respuesta;
  } catch (error) {
    log.error("account.delete.error", {}, error);
    return NextResponse.json({ error: "No se pudo borrar la cuenta." }, { status: 503 });
  }
}
