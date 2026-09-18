import type { ClimaPunto } from "./tipos";
import { crearLogger } from "@/lib/log/logger";
import { claveGrid } from "@/lib/dominio/coordenadas";

export { claveGrid };

const log = crearLogger("clima.en-memoria");

const TTL_MS = 15 * 60 * 1000;

interface Entrada {
  creadaEn: number;
  punto: ClimaPunto;
}

const cache = new Map<string, Entrada>();

export async function previsionEnPunto(
  lat: number,
  lon: number,
  cargar: () => Promise<ClimaPunto>,
): Promise<ClimaPunto> {
  const clave = claveGrid(lat, lon);
  const entrada = cache.get(clave);
  const valida = entrada !== undefined && Date.now() - entrada.creadaEn < TTL_MS;
  if (valida && entrada) {
    log.debug("clima.memoria.acierto");
    return entrada.punto;
  }

  const punto = await cargar();
  cache.set(clave, { creadaEn: Date.now(), punto });
  log.debug("clima.memoria.almacenado");
  return punto;
}
