export interface GeoPoint {
  latitud: number;
  longitud: number;
  /** Código AEMET del municipio, cuando la ubicación procede del selector. */
  aemetMunicipio?: string;
}

/** Formato interno canónico para datos horarios, vengan de donde vengan. */
export interface WeatherHourly {
  timestamp: string;
  latitude: number;
  longitude: number;

  temperatureC: number | null;
  apparentTemperatureC: number | null;

  relativeHumidityPct: number | null;
  dewPointC: number | null;

  precipitationMm: number | null;
  precipitationProbabilityPct: number | null;

  windSpeedKmh: number | null;
  windGustKmh: number | null;
  windDirectionDeg: number | null;

  cloudCoverPct: number | null;
  solarRadiationWm2: number | null;

  et0Mm: number | null;

  provider: string;
  fetchedAt: string;
}

/** Formato interno canónico para avisos oficiales. */
export interface OfficialWarning {
  id: string;
  provider: string;
  phenomenon: string;
  severity: string;
  startsAt: string;
  endsAt: string;
  area: string;
  headline: string;
  description?: string;
  sourceUrl?: string;
}

export type NormalizedForecast = WeatherHourly[];

export type NormalizedObservation = WeatherHourly;

export interface CapacidadesProveedor {
  forecast: boolean;
  current: boolean;
  warnings: boolean;
}

/**
 * Puerto común de fuentes meteorológicas/agroclimáticas.
 * Devuelve siempre los formatos internos canónicos (`WeatherHourly`,
 * `OfficialWarning`). Los adaptadores viven en `lib/proveedores`.
 */
export interface WeatherProvider {
  readonly id: string;
  readonly capacidades: CapacidadesProveedor;
  configurado(): boolean;
  getForecast(location: GeoPoint): Promise<NormalizedForecast>;
  getCurrent?(location: GeoPoint): Promise<NormalizedObservation>;
  getWarnings?(location: GeoPoint): Promise<OfficialWarning[]>;
}
