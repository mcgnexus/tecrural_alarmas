import { obtenerPrevisionCruda } from "@/lib/ingesta/open-meteo";
import { normalizarHorario } from "@/lib/normalizacion/open-meteo";
import { horaMasCercana } from "@/lib/normalizacion/horario";
import { PROVEEDOR_OPEN_METEO } from "@/lib/fuentes/open-meteo";
import type {
  GeoPoint,
  NormalizedForecast,
  NormalizedObservation,
  WeatherProvider,
} from "@/lib/dominio/proveedores";

/**
 * Open-Meteo: predicción horaria georreferenciada y datos homogéneos.
 * Respaldo por defecto del MVP (no requiere credenciales).
 */
export const proveedorOpenMeteo: WeatherProvider = {
  id: PROVEEDOR_OPEN_METEO,
  capacidades: { forecast: true, current: true, warnings: false },
  configurado: () => true,

  async getForecast({ latitud, longitud }: GeoPoint): Promise<NormalizedForecast> {
    const crudo = await obtenerPrevisionCruda(latitud, longitud);
    return normalizarHorario(crudo.crudo, latitud, longitud);
  },

  async getCurrent(location: GeoPoint): Promise<NormalizedObservation> {
    const horas = await proveedorOpenMeteo.getForecast(location);
    return horaMasCercana(horas);
  },
};
