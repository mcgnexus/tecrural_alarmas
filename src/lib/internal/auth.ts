import { timingSafeEqual } from "node:crypto";

function secretosIguales(a: string, b: string): boolean {
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
    req.headers.get("x-internal-secret")?.trim() ||
    req.headers.get("x-worker-secret")?.trim() ||
    req.headers.get("x-service-account-token")?.trim() ||
    req.headers.get("x-cron-secret")?.trim() ||
    bearer ||
    url.searchParams.get("secreto")?.trim() ||
    url.searchParams.get("secret")?.trim() ||
    url.searchParams.get("token")?.trim() ||
    ""
  );
}

export function verificarAccesoInterno(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const candidatos = [
    process.env.INTERNAL_SECRET,
    process.env.INTERNAL_CRON_SECRET,
    process.env.WORKER_SECRET,
    process.env.INTERNAL_SERVICE_ACCOUNT_TOKEN,
    process.env.CRON_SECRET,
  ].filter((v): v is string => Boolean(v && v.trim().length > 0));

  if (candidatos.length === 0) {
    return { ok: false, status: 503, error: "Servicio interno no configurado (falta INTERNAL_SECRET/WORKER_SECRET)." };
  }

  const secreto = secretoDePeticion(req);
  if (!secreto) {
    return { ok: false, status: 401, error: "No autorizado." };
  }

  for (const esperado of candidatos) {
    if (secretosIguales(secreto, esperado)) return { ok: true };
  }

  return { ok: false, status: 401, error: "No autorizado." };
}
