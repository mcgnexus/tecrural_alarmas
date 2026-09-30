type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Tope para evitar crecimiento ilimitado del Map en memoria. */
const MAX_BUCKETS = 5000;

function purgar(now: number): void {
  if (buckets.size < MAX_BUCKETS) {
    // Limpieza oportunista solo cuando el mapa es grande: evita recorrerlo
    // en cada petición en despliegues pequeños.
    if (buckets.size < 1000) return;
  }
  for (const [clave, b] of buckets) {
    if (now > b.resetAt) buckets.delete(clave);
    if (buckets.size < MAX_BUCKETS) break;
  }
  // Si sigue lleno (ataque con muchas claves), elimina las más antiguas.
  if (buckets.size >= MAX_BUCKETS) {
    const sobran = buckets.size - MAX_BUCKETS + 1;
    let n = 0;
    for (const clave of buckets.keys()) {
      buckets.delete(clave);
      if (++n >= sobran) break;
    }
  }
}

/**
 * IP del cliente a partir de cabeceras de proxy.
 *
 * El primer valor de `x-forwarded-for` lo puede fijar el cliente y no es
 * fiable; el proxy de producción (Vercel) establece `x-real-ip` y añade su
 * propia entrada al final de `x-forwarded-for`. Por eso se prefiere
 * `x-real-ip` y, en su defecto, la última entrada de `x-forwarded-for`.
 */
export function ipDePeticion(req: Request): string {
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const partes = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ultima = partes[partes.length - 1];
    if (ultima) return ultima;
  }
  return "unknown";
}

/**
 * Limitador best-effort en memoria (por instancia; se pierde al reiniciar y
 * no se comparte entre instancias). Suficiente como freno oportunista; la
 * protección real contra spam/duplicados está en el honeypot y en la
 * deduplicación por visitante en base de datos. Para un límite global
 * estricto haría falta un almacén compartido (Redis/KV).
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  purgar(now);
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
}

export function rateLimitResponse(remaining: number, resetAt: number): HeadersInit {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
  };
}
