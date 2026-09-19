import { guardarAvisosOficiales } from "@/lib/datos/alertas-oficiales-repo";
import { crearLogger } from "@/lib/log/logger";
import { proveedorRaif } from "@/lib/proveedores/raif";

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
  const saved = avisos.length > 0 ? await guardarAvisosOficiales(avisos) : 0;
  log.info("cron.phytosanitary.ok", { data: { fetched: avisos.length, saved } });
  return { fetched: avisos.length, saved, skipped: false };
}
