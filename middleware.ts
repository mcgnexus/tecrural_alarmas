export { middleware } from "./src/middleware";

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
