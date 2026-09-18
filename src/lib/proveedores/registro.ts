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
import { proveedorSiar } from "./siar";
import { proveedorRaif } from "./raif";

const log = crearLogger("proveedores.registro");

export const PROVEEDORES: WeatherProvider[] = [
  proveedorAemet,
  proveedorOpenMeteo,
  proveedorSiar,
  proveedorRaif,
];

export function proveedoresDisponibles(): WeatherProvider[] {
  return PROVEEDORES.filter((proveedor) => proveedor.configurado());
}

/** Jerarquía: AEMET si está configurado; Open-Meteo como respaldo del MVP. */
export function proveedorPrincipal(): WeatherProvider {
  return proveedorAemet.configurado() ? proveedorAemet : proveedorOpenMeteo;
}

export async function obtenerPronostico(
  location: GeoPoint,
): Promise<NormalizedForecast> {
  const principal = proveedorPrincipal();
  if (principal.configurado() && principal.capacidades.forecast) {
    try {
      return await principal.getForecast(location);
    } catch (error) {
      log.warn(
        "proveedores.pronostico.fallback",
        { external_source: principal.id },
        error,
      );
    }
  }
  return proveedorOpenMeteo.getForecast(location);
}

export async function obtenerObservacion(
  location: GeoPoint,
): Promise<NormalizedObservation | null> {
  for (const proveedor of [proveedorSiar, proveedorAemet, proveedorOpenMeteo]) {
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
  for (const proveedor of [proveedorAemet, proveedorRaif]) {
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
