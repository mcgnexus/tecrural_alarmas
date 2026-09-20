import type { MetadataRoute } from "next";

/** Dominio canónico configurable (NEXT_PUBLIC_SITE_URL) o fallback de producción. */
function baseUrl(): string {
  const env =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_URL ||
    "https://tecrural.es";
  return env.replace(/\/+$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rutas = [
    "/",
    "/privacidad",
    "/servicios",
    "/parcelas",
    "/alertas",
    "/fitosanitario",
  ];

  return rutas.map((ruta) => ({
    url: `${baseUrl()}${ruta}`,
    lastModified: new Date(),
    changeFrequency: ruta === "/" || ruta === "/alertas" ? "hourly" : "daily",
    priority: ruta === "/" ? 1 : ruta.startsWith("/parcelas") ? 0.8 : 0.6,
  }));
}
