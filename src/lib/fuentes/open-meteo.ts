export const PROVEEDOR_OPEN_METEO = "open-meteo";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";

/**
 * Capa 1 (fuentes externas): única responsable de hablar con Open-Meteo.
 * Solicita la serie horaria en UTC; devuelve el payload crudo sin interpretarlo.
 */
export async function solicitarPrevision(
  lat: number,
  lon: number,
): Promise<unknown> {
  const parametros = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    timezone: "UTC",
    forecast_days: "5",
    hourly: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "dew_point_2m",
      "precipitation",
      "precipitation_probability",
      "wind_speed_10m",
      "wind_gusts_10m",
      "wind_direction_10m",
      "cloud_cover",
      "shortwave_radiation",
      "et0_fao_evapotranspiration",
    ].join(","),
  });

  const respuesta = await fetch(`${ENDPOINT}?${parametros.toString()}`, {
    next: { revalidate: 900 },
  });
  if (!respuesta.ok) {
    throw new Error(`Open-Meteo devolvió ${respuesta.status}`);
  }
  return respuesta.json();
}
