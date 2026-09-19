import type {
  NormalizedForecast,
  OfficialWarning,
  WeatherProvider,
} from "@/lib/dominio/proveedores";

const PROVEEDOR = "raif";

/**
 * RAIF: avisos fitosanitarios, información por cultivo y contexto regional.
 * Se alimenta de un feed JSON configurado (`RAIF_FEED_URL`); sin feed devuelve
 * una lista vacía para no bloquear al resto de proveedores.
 */
export const proveedorRaif: WeatherProvider = {
  id: PROVEEDOR,
  capacidades: { forecast: false, current: false, warnings: true },
  configurado: () => Boolean(process.env.RAIF_FEED_URL),

  async getForecast(): Promise<NormalizedForecast> {
    throw new Error("RAIF no ofrece predicción meteorológica");
  },

  async getWarnings(): Promise<OfficialWarning[]> {
    let url = process.env.RAIF_FEED_URL;
    if (!url) return [];

    const token =
      process.env.RAIF_TOKEN ??
      process.env.RAIF_API_KEY ??
      process.env.OPENCLAW_RAIF_TOKEN ??
      process.env.RAIF_API_TOKEN ??
      "";
    const headers: Record<string, string> = { accept: "application/json" };
    if (token) {
      headers["authorization"] = `Bearer ${token}`;
      headers["x-api-key"] = token;
      headers["x-raif-token"] = token;
    }

    // Soporta URL base https://raif-gamma.vercel.app/ → prueba /api/alerts, /api/feed, /api/documents
    const candidatos = [url];
    if (url === "https://raif-gamma.vercel.app" || url === "https://raif-gamma.vercel.app/") {
      candidatos.push("https://raif-gamma.vercel.app/api/alerts", "https://raif-gamma.vercel.app/api/feed", "https://raif-gamma.vercel.app/api/documents");
    }

    let datos: unknown = null;
    let ultimoError: unknown = null;
    for (const u of candidatos) {
      try {
        const respuesta = await fetch(u, {
          headers,
          signal: AbortSignal.timeout(10_000),
        });
        if (!respuesta.ok) throw new Error(`RAIF HTTP ${respuesta.status} @ ${u}`);
        datos = await respuesta.json();
        // si es array, es el feed correcto
        if (Array.isArray(datos)) break;
        // si es objeto con .data o .alerts, intentar
        if (datos && typeof datos === "object" && Array.isArray((datos as Record<string, unknown>).data)) {
          datos = (datos as Record<string, unknown>).data;
          break;
        }
        if (datos && typeof datos === "object" && Array.isArray((datos as Record<string, unknown>).alerts)) {
          datos = (datos as Record<string, unknown>).alerts;
          break;
        }
        // si no es array, probar siguiente candidato
        datos = null;
      } catch (e) {
        ultimoError = e;
      }
    }
    if (datos === null) {
      if (ultimoError) throw ultimoError;
      return [];
    }
    const lista = Array.isArray(datos) ? (datos as Record<string, unknown>[]) : [];

    return lista.map((aviso, indice) => ({
      id: String(aviso.id ?? `raif-${indice}`),
      provider: PROVEEDOR,
      phenomenon: String(aviso.fenomeno ?? aviso.plaga ?? "Aviso fitosanitario"),
      severity: String(aviso.severidad ?? aviso.nivel ?? "info").toLowerCase(),
      startsAt: String(aviso.desde ?? aviso.startsAt ?? ""),
      endsAt: String(aviso.hasta ?? aviso.endsAt ?? ""),
      area: String(aviso.area ?? ""),
      headline: String(aviso.titulo ?? aviso.headline ?? "Aviso fitosanitario"),
      description:
        typeof aviso.descripcion === "string"
          ? aviso.descripcion
          : typeof aviso.description === "string"
            ? aviso.description
            : undefined,
      sourceUrl:
        typeof aviso.url === "string"
          ? aviso.url
          : typeof aviso.sourceUrl === "string"
            ? aviso.sourceUrl
            : undefined,
    }));
  },
};
