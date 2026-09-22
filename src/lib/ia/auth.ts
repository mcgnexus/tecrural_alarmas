import { timingSafeEqual } from "node:crypto";

function iguales(a: string, b: string): boolean {
  const izquierda = Buffer.from(a);
  const derecha = Buffer.from(b);
  return izquierda.length === derecha.length && timingSafeEqual(izquierda, derecha);
}

export function autenticarAgente(req: Request): { ok: true } | { ok: false; status: number; error: string } {
  const esperado = process.env.AI_API_TOKEN?.trim();
  if (!esperado) return { ok: false, status: 503, error: "API de agentes no configurada." };
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  if (!token || !iguales(token, esperado)) return { ok: false, status: 401, error: "Token de agente no válido." };
  return { ok: true };
}

export function respuestaNoAutorizada(resultado: { status: number; error: string }) {
  return Response.json({ error: resultado.error }, { status: resultado.status, headers: { "WWW-Authenticate": "Bearer" } });
}
