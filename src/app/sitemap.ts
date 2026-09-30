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

  // Sin lastModified: no hay fechas reales de actualización (contenido
  // estático) y usar `new Date()` haría que todo pareciese modificado en
  // cada generación, provocando rastreo innecesario.
  const paginasGenerales: MetadataRoute.Sitemap = rutas.map((ruta) => ({
    url: `${baseUrl()}${ruta}`,
    changeFrequency: ruta === "/" || ruta === "/alertas" ? "hourly" : "daily",
    priority: ruta === "/" ? 1 : ruta.startsWith("/parcelas") ? 0.8 : 0.6,
  }));

  const paginasMunicipales = MUNICIPIOS_PUBLICOS.map((municipio) => ({
    url: `${baseUrl()}/avisos-helada-viento/${municipio.slug}`,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [...paginasGenerales, ...paginasMunicipales];
}
