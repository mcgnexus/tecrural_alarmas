import { timingSafeEqual } from "node:crypto";
import { sesionAdminValida } from "@/lib/datos/admin-sesiones-repo";

function iguales(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Nombre de la cookie de sesion de administracion. */
export const COOKIE_ADMIN = "tr_admin";

function cookieDePeticion(req: Request): string {
  const cookie = req.headers.get("cookie") ?? "";
  for (const trozo of cookie.split(";")) {
    const corte = trozo.indexOf("=");
    if (corte === -1) continue;
    if (trozo.slice(0, corte).trim() === COOKIE_ADMIN) {
      return decodeURIComponent(trozo.slice(corte + 1).trim());
    }
  }
  return "";
}

/**
 * Cabecera Set-Cookie de sesion. HttpOnly (no la lee JS), SameSite=Strict (no la
 * manda el navegador en peticiones cruzadas). La cookie guarda un **token de
 * sesión aleatorio y revocable**, nunca el ADMIN_SECRET.
 */
export function cookieDeSesion(token: string, maxAgeSegundos = 60 * 60 * 8): string {
  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_ADMIN}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSegundos}${seguro}`;
}

/** Borra la cookie de sesion. */
export function cookieDeCierre(): string {
  return `${COOKIE_ADMIN}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

/** Token de sesión presente en la cookie de administración (o cadena vacía). */
export function tokenDePeticion(req: Request): string {
  return cookieDePeticion(req);
}

/** Secreto maestro enviado por cabecera (automatización/scripts de confianza). */
function secretosDeCabecera(req: Request): string[] {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return [
    req.headers.get("x-admin-secret")?.trim() ?? "",
    bearer,
  ].filter((v) => v.length > 0);
}

/**
 * Comprueba el secreto maestro de administración (solo `ADMIN_SECRET`). Se usa
 * en el login para canjearlo por una sesión. Los secretos internos/worker ya NO
 * dan acceso al panel.
 */
export function verificarSecretoAdmin(secreto: string): {
  ok: true;
} | { ok: false; status: number; error: string } {
  const esperado = process.env.ADMIN_SECRET;
  if (!esperado || !esperado.trim()) {
    return { ok: false, status: 503, error: "Panel admin no configurado (falta ADMIN_SECRET)." };
  }
  if (!secreto || !iguales(secreto, esperado)) {
    return { ok: false, status: 401, error: "No autorizado." };
  }
  return { ok: true };
}

/**
 * Autoriza una petición de administración mediante:
 *  1. la cookie de sesión (token revocable), o
 *  2. el `ADMIN_SECRET` por cabecera/Bearer (automatización).
 */
export async function verificarAccesoAdmin(
  req: Request,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const esperado = process.env.ADMIN_SECRET;
  if (!esperado || !esperado.trim()) {
    return { ok: false, status: 503, error: "Panel admin no configurado (falta ADMIN_SECRET)." };
  }

  const token = cookieDePeticion(req);
  if (token && (await sesionAdminValida(token))) return { ok: true };

  for (const secreto of secretosDeCabecera(req)) {
    if (iguales(secreto, esperado)) return { ok: true };
  }

  return { ok: false, status: 401, error: "No autorizado. Inicia sesion en /admin." };
}
