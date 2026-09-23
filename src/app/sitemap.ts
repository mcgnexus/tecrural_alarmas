import type { MetadataRoute } from "next";
import { MUNICIPIOS_PUBLICOS } from "@/lib/datos/municipios-publicos";

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

  const paginasGenerales: MetadataRoute.Sitemap = rutas.map((ruta) => ({
    url: `${baseUrl()}${ruta}`,
    lastModified: new Date(),
    changeFrequency: ruta === "/" || ruta === "/alertas" ? "hourly" : "daily",
    priority: ruta === "/" ? 1 : ruta.startsWith("/parcelas") ? 0.8 : 0.6,
  }));

  const paginasMunicipales = MUNICIPIOS_PUBLICOS.map((municipio) => ({
    url: `${baseUrl()}/avisos-helada-viento/${municipio.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...paginasGenerales, ...paginasMunicipales];
}
