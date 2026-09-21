import type {
  NormalizedForecast,
  OfficialWarning,
  WeatherProvider,
} from "@/lib/dominio/proveedores";
import { RAIF_RSS_URL } from "@/lib/raif/config";
import { normalizarRaifItem, parsearRaifRss } from "@/lib/raif/rss";

const PROVEEDOR = "raif";

/**
 * RAIF: avisos fitosanitarios, información por cultivo y contexto regional.
 * El RSS detecta novedades. El artículo y sus PDF enlazados son la fuente del
 * contenido; no se consume una API JSON ni se hace scraping desde el cliente.
 */
export const proveedorRaif: WeatherProvider = {
  id: PROVEEDOR,
  capacidades: { forecast: false, current: false, warnings: true },
  configurado: () => true,

  async getForecast(): Promise<NormalizedForecast> {
    throw new Error("RAIF no ofrece predicción meteorológica");
  },

  async getWarnings(): Promise<OfficialWarning[]> {
    const respuesta = await fetch(process.env.RAIF_RSS_URL ?? RAIF_RSS_URL, {
      headers: { accept: "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!respuesta.ok) throw new Error(`RAIF RSS HTTP ${respuesta.status}`);
    const items = parsearRaifRss(await respuesta.text());
    return items.map((item) => {
      const alerta = normalizarRaifItem(item);
      return {
      id: alerta.externalId,
      provider: PROVEEDOR,
      phenomenon: alerta.pestOrDisease ?? "Aviso fitosanitario",
      severity: alerta.severity ?? "info",
      startsAt: alerta.validFrom ?? alerta.publishedAt ?? "",
      endsAt: alerta.validTo ?? "",
      area: alerta.municipality ?? alerta.region ?? alerta.province ?? "",
      headline: alerta.title,
      description: alerta.technicalDescription ?? alerta.summary ?? undefined,
      sourceUrl: alerta.sourceArticleUrl,
      rawPayload: { ...alerta },
    };
    }).filter((aviso) => {
      const payload = aviso.rawPayload as { cropSlug?: string | null; pestOrDisease?: string | null };
      return itemEsFitosanitario(aviso, payload);
    });
  },
};

function itemEsFitosanitario(aviso: OfficialWarning, payload: { cropSlug?: string | null; pestOrDisease?: string | null }): boolean {
  return payload.cropSlug != null || payload.pestOrDisease != null || /fitosanitaria|plaga|enfermedad|repilo|monilia|gusano|mosca|pudenta/i.test(`${aviso.headline} ${aviso.phenomenon}`);
}
