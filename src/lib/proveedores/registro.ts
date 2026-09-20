import type {
  GeoPoint,
  NormalizedForecast,
  NormalizedObservation,
  OfficialWarning,
  WeatherProvider,
} from "@/lib/dominio/proveedores";
import { crearLogger } from "@/lib/log/logger";
import { proveedorAemet } from "./aemet";
import { proveedorOpenMeteo } from "./open-meteo";
import { proveedorRaif } from "./raif";

const log = crearLogger("proveedores.registro");

export const PROVEEDORES: WeatherProvider[] = [
  proveedorAemet,
  proveedorOpenMeteo,
  proveedorRaif,
];

export function proveedoresDisponibles(): WeatherProvider[] {
  return PROVEEDORES.filter((proveedor) => proveedor.configurado());
}

/** Jerarquía: AEMET si está configurado; Open-Meteo como respaldo. */
export function proveedorPrincipal(): WeatherProvider {
  return proveedorAemet.configurado() ? proveedorAemet : proveedorOpenMeteo;
}

/**
 * Pronóstico híbrido: AEMET para las próximas horas y Open-Meteo para
 * extender la serie hasta 7 días, de modo que el motor de riesgo conserve su
 * horizonte semanal. Si una fuente falla, se sirve la otra; si fallan ambas, NO_DATA.
 */
export async function obtenerPronostico(
  location: GeoPoint,
): Promise<NormalizedForecast> {
  let oficial: NormalizedForecast | null = null;
  if (proveedorAemet.configurado() && proveedorAemet.capacidades.forecast) {
    try {
      oficial = await proveedorAemet.getForecast(location);
    } catch (error) {
      log.warn(
        "proveedores.pronostico.fallback",
        { external_source: proveedorAemet.id },
        error,
      );
    }
  }

  let extension: NormalizedForecast | null = null;
  if (proveedorOpenMeteo.configurado() && proveedorOpenMeteo.capacidades.forecast) {
    try {
      extension = await proveedorOpenMeteo.getForecast(location);
    } catch (error) {
      log.warn(
        "proveedores.pronostico.fallback",
        { external_source: proveedorOpenMeteo.id },
        error,
      );
    }
  }

  if (!oficial && !extension) {
    const err = new Error("NO_DATA: Datos temporalmente no disponibles");
    (err as unknown as Record<string, unknown>).code = "NO_DATA";
    throw err;
  }
  if (!oficial) return extension as NormalizedForecast;
  if (!extension) return oficial;

  // AEMET aporta el tramo oficial; Open-Meteo solo rellena lo posterior.
  const corte = Math.max(...oficial.map((h) => Date.parse(h.timestamp)));
  const cola = extension.filter((h) => Date.parse(h.timestamp) > corte);
  const serie = [...oficial, ...cola].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );
  log.info("proveedores.pronostico.hibrido", {
    data: { oficial: oficial.length, extension: cola.length },
  });
  return serie;
}

export async function obtenerObservacion(
  location: GeoPoint,
): Promise<NormalizedObservation | null> {
  for (const proveedor of [proveedorAemet, proveedorOpenMeteo]) {
    if (
      !proveedor.configurado() ||
      !proveedor.capacidades.current ||
      !proveedor.getCurrent
    ) {
      continue;
    }
    try {
      return await proveedor.getCurrent(location);
    } catch (error) {
      log.warn(
        "proveedores.observacion.error",
        { external_source: proveedor.id },
        error,
      );
    }
  }
  return null;
}

export async function obtenerAvisosOficiales(
  location: GeoPoint,
): Promise<OfficialWarning[]> {
  const avisos: OfficialWarning[] = [];
  // Este contrato es exclusivamente meteorológico oficial. RAIF se consume
  // por el flujo fitosanitario y no debe aparecer como aviso AEMET.
  for (const proveedor of [proveedorAemet]) {
    if (
      !proveedor.configurado() ||
      !proveedor.capacidades.warnings ||
      !proveedor.getWarnings
    ) {
      continue;
    }
    try {
      avisos.push(...(await proveedor.getWarnings(location)));
    } catch (error) {
      log.warn(
        "proveedores.avisos.error",
        { external_source: proveedor.id },
        error,
      );
    }
  }
  return avisos;
}
