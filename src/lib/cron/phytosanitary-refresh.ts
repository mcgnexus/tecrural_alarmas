import { guardarAvisosOficiales } from "@/lib/datos/alertas-oficiales-repo";
import { guardarAlertasFitosanitarias } from "@/lib/datos/fitosanitario-repo";
import { obtenerDb } from "@/lib/datos/db";
import { cultivos } from "@/lib/datos/plataforma-schema";
import { crearLogger } from "@/lib/log/logger";
import { proveedorRaif } from "@/lib/proveedores/raif";
import { eq } from "drizzle-orm";

const log = crearLogger("cron.phytosanitary-refresh");

export interface PhytosanitaryResult {
  fetched: number;
  saved: number;
  skipped: boolean;
}

/**
 * Una vez al día: actualizar RAIF.
 */
export async function ejecutarPhytosanitaryRefresh(): Promise<PhytosanitaryResult> {
  if (!proveedorRaif.configurado() || !proveedorRaif.getWarnings) {
    log.info("cron.phytosanitary.skip", { data: { reason: "RAIF no configurado" } });
    return { fetched: 0, saved: 0, skipped: true };
  }

  const avisos = await proveedorRaif.getWarnings({ latitud: 37.5, longitud: -2.5 });
  const savedOficial = avisos.length > 0 ? await guardarAvisosOficiales(avisos) : 0;

  // Parche: también puebla phytosanitary_alerts con crop/zona para filtro por cultivo
  let savedFito = 0;
  if (avisos.length > 0) {
    try {
      const db = obtenerDb();
      const mapaCultivo: Record<string, string> = {};
      const filas = await db.select({ id: cultivos.id, slug: cultivos.slug }).from(cultivos);
      for (const r of filas) mapaCultivo[r.slug] = r.id;

      const porPlaga: Record<string, string> = {
        repilo: "olive",
        prays: "olive",
        "mosca del olivo": "olive",
        olivo: "olive",
        almendro: "almond",
        monilia: "almond",
        fusicoccum: "almond",
        pistacho: "pistachio",
        cereal: "cereal",
        aguacate: "avocado",
        mango: "mango",
        chirimoya: "custard_apple",
        chirimoyo: "custard_apple",
      };

      const fitos = avisos.map((aviso, idx) => {
        const texto = `${aviso.phenomenon} ${aviso.headline}`.toLowerCase();
        let slug: string | null = null;
        for (const [clave, s] of Object.entries(porPlaga)) {
          if (texto.includes(clave)) { slug = s; break; }
        }
        const cropId = slug ? (mapaCultivo[slug] ?? null) : null;
        // area puede ser "Granada" o "Huéscar, Granada"
        const area = aviso.area ?? "";
        const partes = area.split(",").map((p) => p.trim()).filter(Boolean);
        const province = partes.length > 1 ? partes[partes.length - 1] : (area || null);
        const municipality = partes.length > 1 ? partes[0] : null;

        return {
          provider: aviso.provider,
          externalId: aviso.id ?? `raif-${idx}`,
          cropId,
          title: aviso.headline,
          summary: aviso.description ?? aviso.headline,
          province: province || null,
          municipality: municipality || null,
          severity: aviso.severity ?? null,
          publishedAt: aviso.startsAt ? new Date(aviso.startsAt).toISOString() : new Date().toISOString(),
          sourceUrl: aviso.sourceUrl ?? null,
          rawPayload: aviso as unknown as Record<string, unknown>,
        };
      });

      savedFito = await guardarAlertasFitosanitarias(fitos as never);
    } catch (e) {
      log.warn("cron.phytosanitary.fitosanitario.error", {}, e);
    }
  }

  log.info("cron.phytosanitary.ok", { data: { fetched: avisos.length, saved: savedOficial, savedFito } });
  return { fetched: avisos.length, saved: savedOficial + savedFito, skipped: false };
}
