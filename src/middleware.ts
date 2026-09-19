import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export function middleware(req: NextRequest) {
  // Rate limiting + CSRF solo para APIs.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const key = `${ip}:${req.nextUrl.pathname}`;
    const { ok, remaining, resetAt } = rateLimit(key, 60, 60_000);
    const res = ok ? NextResponse.next() : NextResponse.json({ error: "Demasiadas peticiones" }, { status: 429 });
    res.headers.set("X-RateLimit-Remaining", String(remaining));
    res.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
      const origin = req.headers.get("origin");
      const host = req.headers.get("host");
      if (origin && host && !origin.includes(host) && !origin.includes("localhost")) {
        return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
      }
    }
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
