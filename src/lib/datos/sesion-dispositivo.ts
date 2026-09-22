import { createHmac, timingSafeEqual } from "node:crypto";
import { dispositivoValido } from "@/lib/datos/validacion";
import { crearLogger } from "@/lib/log/logger";

const log = crearLogger("datos.sesion-dispositivo");

export const COOKIE_SESION = "tecrural_sesion";

/**
 * Sesión anónima firmada: el servidor emite una cookie HttpOnly
 * `id.firma` (HMAC-SHA256) y toda autorización se hace contra la cookie,
 * no contra el identificador enviado por el cliente.
 */
function secreto(): string {
  const valor =
    process.env.DEVICE_SESSION_SECRET ||
    process.env.INTERNAL_SECRET ||
    process.env.ADMIN_SECRET ||
    "";
  if (valor) return valor;
  if (process.env.NODE_ENV === "production") {
    log.warn("sesion.secreto.ausente", {}, new Error("DEVICE_SESSION_SECRET no configurado"));
  }
  return "tecrural-dev-insecure-secret";
}

function firmar(id: string): string {
  return createHmac("sha256", secreto()).update(id).digest("base64url");
}

export function valorCookieSesion(id: string): string {
  return `${id}.${firmar(id)}`;
}

export function cookieSesion(id: string): string {
  const seguro = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_SESION}=${valorCookieSesion(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}${seguro}`;
}

function firmaValida(id: string, firma: string): boolean {
  const esperada = Buffer.from(firmar(id));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length) return false;
  return timingSafeEqual(esperada, recibida);
}

/** Extrae el dispositivoId autenticado desde la cookie de sesión, o null. */
export function dispositivoAutenticado(req: Request): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const par = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_SESION}=`));
  if (!par) return null;
  const valor = par.slice(COOKIE_SESION.length + 1);
  const punto = valor.lastIndexOf(".");
  if (punto <= 0) return null;
  const id = valor.slice(0, punto);
  const firma = valor.slice(punto + 1);
  if (!dispositivoValido(id) || !firmaValida(id, firma)) return null;
  return id;
}

export type IdentidadDispositivo =
  | { ok: true; dispositivoId: string }
  | { ok: false; status: number; error: string };

/**
 * Autorización de servidor: devuelve el dispositivoId de la cookie firmada.
 * Si el cliente envía un identificador (query/body), debe coincidir con la
 * cookie; un identificador sin sesión firmada se rechaza (401).
 */
export function exigirDispositivo(
  req: Request,
  valorCliente: string | null,
): IdentidadDispositivo {
  const autenticado = dispositivoAutenticado(req);
  if (!autenticado) {
    if (valorCliente) {
      return { ok: false, status: 401, error: "Sesión de dispositivo no válida." };
    }
    return { ok: false, status: 400, error: "Falta la sesión de dispositivo." };
  }
  if (valorCliente && valorCliente !== autenticado) {
    return { ok: false, status: 403, error: "El dispositivo indicado no coincide con la sesión." };
  }
  return { ok: true, dispositivoId: autenticado };
}
