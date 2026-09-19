import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: https: blob:",
  "font-src 'self' data: https:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "frame-src https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

function aplicarCabecerasSeguridad(res: NextResponse) {
  res.headers.set("Content-Security-Policy", CSP);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
}

export function middleware(req: NextRequest) {
  // Rate limiting global para APIs (60 req/min por IP)
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const key = `${ip}:${req.nextUrl.pathname}`;
    const { ok, remaining, resetAt } = rateLimit(key, 60, 60_000);
    const res = ok ? NextResponse.next() : NextResponse.json({ error: "Demasiadas peticiones" }, { status: 429 });
    res.headers.set("X-RateLimit-Remaining", String(remaining));
    res.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
    aplicarCabecerasSeguridad(res);
    // CSRF: validar Origin para mutaciones
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const origin = req.headers.get("origin");
      const host = req.headers.get("host");
      if (origin && host && !origin.includes(host) && !origin.includes("localhost")) {
        aplicarCabecerasSeguridad(res);
        return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
      }
    }
    return res;
  }
  const res = NextResponse.next();
  aplicarCabecerasSeguridad(res);
  return res;
}

export const config = {
  matcher: [
    "/:path*",
    "/api/:path*",
    "/_next/static/:path*",
    "/_next/image/:path*",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
  ],
};
