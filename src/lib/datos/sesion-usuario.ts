import { createHmac, timingSafeEqual } from "node:crypto";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("datos.sesion-usuario");

export const COOKIE_USUARIO = "tecrural_usuario";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Sesión de cuenta firmada (HMAC), igual patrón que la sesión de dispositivo:
 * la cookie `userId.firma` va HttpOnly y el servidor la valida sin consultar la
 * base de datos.
 */
function secreto(): string {
  const valor =
    process.env.DEVICE_SESSION_SECRET ||
    process.env.INTERNAL_SECRET ||
    process.env.ADMIN_SECRET ||
    "";
  if (valor) return valor;
  if (process.env.NODE_ENV === "production") {
    log.error("sesion-usuario.secreto.ausente", {}, new Error("DEVICE_SESSION_SECRET no configurado"));
    throw new Error("Sesiones no disponibles: falta DEVICE_SESSION_SECRET.");
  }
  return "tecrural-dev-insecure-secret";
}

function firmar(id: string): string {
  return createHmac("sha256", secreto()).update(id).digest("base64url");
}

export function valorCookieUsuario(id: string): string {
  return `${id}.${firmar(id)}`;
}

export function cookieSesionUsuario(id: string, maxAgeSegundos = 60 * 60 * 24 * 365): string {
  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_USUARIO}=${valorCookieUsuario(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSegundos}${seguro}`;
}

export function cookieCierreUsuario(): string {
  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_USUARIO}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${seguro}`;
}

function firmaValida(id: string, firma: string): boolean {
  const esperada = Buffer.from(firmar(id));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length) return false;
  return timingSafeEqual(esperada, recibida);
}

/** Extrae el userId autenticado de la cookie de cuenta, o null. */
export function usuarioAutenticado(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const par = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_USUARIO}=`));
  if (!par) return null;
  const valor = par.slice(COOKIE_USUARIO.length + 1);
  const punto = valor.lastIndexOf(".");
  if (punto <= 0) return null;
  const id = valor.slice(0, punto);
  const firma = valor.slice(punto + 1);
  if (!UUID.test(id) || !firmaValida(id, firma)) return null;
  return id;
}
