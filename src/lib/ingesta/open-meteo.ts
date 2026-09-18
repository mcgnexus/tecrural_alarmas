import {
  PROVEEDOR_OPEN_METEO,
  solicitarPrevision,
} from "@/lib/fuentes/open-meteo";

export interface PrevisionCruda {
  proveedor: string;
  latitud: number;
  longitud: number;
  crudo: unknown;
}

/**
 * Capa 2 (ingesta): obtiene el payload crudo de las fuentes externas y lo
 * etiqueta con su procedencia. No interpreta ni transforma los datos.
 */
export async function obtenerPrevisionCruda(
  lat: number,
  lon: number,
): Promise<PrevisionCruda> {
  const crudo = await solicitarPrevision(lat, lon);
  return {
    proveedor: PROVEEDOR_OPEN_METEO,
    latitud: lat,
    longitud: lon,
    crudo,
  };
}
