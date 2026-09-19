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
    const url = process.env.RAIF_FEED_URL;
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

    const respuesta = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10_000),
    });
    if (!respuesta.ok) throw new Error(`RAIF HTTP ${respuesta.status}`);

    const datos = (await respuesta.json()) as unknown;
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
