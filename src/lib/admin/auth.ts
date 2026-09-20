import { timingSafeEqual } from "node:crypto";

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
 * manda el navegador en peticiones cruzadas) y el secreto va en la cookie, no en
 * la URL: no queda en el historial, ni en los logs del servidor, ni en el Referer.
 */
export function cookieDeSesion(secreto: string, maxAgeSegundos = 60 * 60 * 8): string {
  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_ADMIN}=${encodeURIComponent(secreto)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSegundos}${seguro}`;
}

/** Borra la cookie de sesion. */
export function cookieDeCierre(): string {
  return `${COOKIE_ADMIN}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

function secretoDePeticion(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return (
    cookieDePeticion(req) ||
    req.headers.get("x-admin-secret")?.trim() ||
    req.headers.get("x-internal-secret")?.trim() ||
    req.headers.get("x-service-account-token")?.trim() ||
    bearer ||
    ""
  );
}

export function verificarAccesoAdmin(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const candidatos = [
    process.env.ADMIN_SECRET,
    process.env.INTERNAL_SECRET,
    process.env.INTERNAL_SERVICE_ACCOUNT_TOKEN,
    process.env.WORKER_SECRET,
  ].filter((v): v is string => Boolean(v && v.trim().length > 0));

  if (candidatos.length === 0) {
    return { ok: false, status: 503, error: "Panel admin no configurado (falta ADMIN_SECRET)." };
  }
  const secreto = secretoDePeticion(req);
  if (!secreto) return { ok: false, status: 401, error: "No autorizado. Inicia sesion en /admin." };
  for (const esp of candidatos) if (iguales(secreto, esp)) return { ok: true };
  return { ok: false, status: 401, error: "No autorizado." };
}
