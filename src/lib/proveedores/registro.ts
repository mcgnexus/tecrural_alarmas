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
  const secundarios: WeatherProvider[] = [proveedorAemet, proveedorOpenMeteo, proveedorSiar].filter(
    (p) => p.id !== principal.id,
  );
  const orden = [principal, ...secundarios].filter((p) => p.configurado() && p.capacidades.forecast);

  let ultimoError: unknown = null;
  for (const proveedor of orden) {
    try {
      const datos = await proveedor.getForecast(location);
      if (proveedor.id !== principal.id) {
        log.info("proveedores.pronostico.fallback.ok", { external_source: proveedor.id });
      }
      return datos;
    } catch (error) {
      ultimoError = error;
      log.warn(
        "proveedores.pronostico.fallback",
        { external_source: proveedor.id },
        error,
      );
    }
  }
  // Todos fallaron → NO_DATA, no convertir a GREEN
  const err = new Error("NO_DATA: Datos temporalmente no disponibles");
  (err as unknown as Record<string, unknown>).cause = ultimoError;
  (err as unknown as Record<string, unknown>).code = "NO_DATA";
  throw err;
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
