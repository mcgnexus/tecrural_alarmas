import type { MetadataRoute } from "next";

/**
 * robots.txt canónico. El sitemap se sirve en /sitemap.xml (app/sitemap.ts).
 * Sepermite el rastreo de público y privacidad, y descarta rutas sensibles.
 */
export default function robots(): MetadataRoute.Robots {
  const ua = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
    : "https://tecrural.es";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/parcelas/[id]/editar",
          "/_next/",
          "/sw.js",
          "/_builder/",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/"],
        disallow: ["/api/", "/admin/", "/dashboard/", "/_next/", "/sw.js"],
      },
    ],
    sitemap: `${ua}/sitemap.xml`,
  };
}
