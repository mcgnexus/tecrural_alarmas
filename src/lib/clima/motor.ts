import { previsionEnPunto } from "./cache";
import { agregarHorario } from "./agregacion";
import {
  guardarHorario,
  leerHorarioReciente,
  obtenerOCrearUbicacion,
} from "@/lib/datos/clima-repo";
import { guardarAvisosOficiales } from "@/lib/datos/alertas-oficiales-repo";
import { crearLogger } from "@/lib/log/logger";
import {
  obtenerAvisosOficiales as obtenerAvisosProveedores,
  obtenerPronostico,
  proveedorPrincipal,
} from "@/lib/proveedores/registro";
import type { ClimaPunto } from "@/lib/dominio/tipos";
import type { OfficialWarning, WeatherHourly } from "@/lib/dominio/proveedores";

const log = crearLogger("clima.motor");

const TTL_CACHE_S = 15 * 60;

/**
 * Capa 4: consume el puerto `WeatherProvider` (formato canónico
 * `WeatherHourly[]`), reutiliza puntos meteorológicos por rejilla
 * (`plataforma.weather_locations` + `weather_hourly`) y agrega al modelo
 * diario `ClimaPunto`.
 */
export async function obtenerClimaPunto(
  lat: number,
  lon: number,
): Promise<ClimaPunto> {
  return previsionEnPunto(lat, lon, async () => {
    let ubicacion: { id: string } | null = null;
    try {
      ubicacion = await obtenerOCrearUbicacion(lat, lon);
    } catch (error) {
      log.warn("clima.motor.ubicacion.error", {}, error);
    }

    if (ubicacion) {
      try {
        const recientes = await leerHorarioReciente(
          ubicacion.id,
          new Date(Date.now() - TTL_CACHE_S * 1000),
        );
        if (recientes.length > 0) {
          log.debug("clima.motor.cache.acierto", {
            external_source: recientes[0]?.provider ?? "desconocido",
          });
          return agregarHorario(recientes);
        }
      } catch (error) {
        log.warn("clima.motor.cache.error", {}, error);
      }
    }

    const inicio = Date.now();
    try {
      const horas = await obtenerPronostico({ latitud: lat, longitud: lon });
      if (ubicacion) {
        try {
          await guardarHorario(ubicacion.id, horas);
        } catch (error) {
          log.warn("clima.motor.persistencia.error", {}, error);
        }
      }
      const punto = agregarHorario(horas);
      log.info("clima.motor.ok", {
        external_source: punto.fuente.id,
        duracion_ms: Date.now() - inicio,
        data: { horas: horas.length },
      });
      return punto;
    } catch (error) {
      log.error(
        "clima.motor.error",
        {
          external_source: proveedorPrincipal().id,
          duracion_ms: Date.now() - inicio,
        },
        error,
      );
      throw error;
    }
  });
}

/** Serie horaria normalizada (formato interno canónico) para un punto. */
export async function obtenerClimaHorario(
  lat: number,
  lon: number,
): Promise<WeatherHourly[]> {
  return obtenerPronostico({ latitud: lat, longitud: lon });
}

/** Avisos oficiales (AEMET meteorológicos + RAIF fitosanitarios). */
export async function obtenerAvisosOficiales(
  lat: number,
  lon: number,
): Promise<OfficialWarning[]> {
  const avisos = await obtenerAvisosProveedores({
    latitud: lat,
    longitud: lon,
  });
  try {
    await guardarAvisosOficiales(avisos);
  } catch (error) {
    log.warn("clima.avisos.persistencia.error", {}, error);
  }
  return avisos;
}
