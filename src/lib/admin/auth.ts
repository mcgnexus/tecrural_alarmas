import { timingSafeEqual } from "node:crypto";

function iguales(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function secretoDePeticion(req: Request): string {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  return (
    req.headers.get("x-admin-secret")?.trim() ||
    req.headers.get("x-internal-secret")?.trim() ||
    req.headers.get("x-service-account-token")?.trim() ||
    bearer ||
    url.searchParams.get("admin_secret")?.trim() ||
    url.searchParams.get("secret")?.trim() ||
    url.searchParams.get("token")?.trim() ||
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
  if (!secreto) return { ok: false, status: 401, error: "No autorizado. Use x-admin-secret." };
  for (const esp of candidatos) if (iguales(secreto, esp)) return { ok: true };
  return { ok: false, status: 401, error: "No autorizado." };
}
