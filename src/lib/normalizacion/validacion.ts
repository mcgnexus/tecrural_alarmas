import type { WeatherHourly } from "@/lib/dominio/proveedores";

const RANGOS: Record<keyof Pick<WeatherHourly, "temperatureC" | "apparentTemperatureC" | "dewPointC" | "relativeHumidityPct" | "precipitationMm" | "precipitationProbabilityPct" | "windSpeedKmh" | "windGustKmh" | "windDirectionDeg" | "cloudCoverPct" | "solarRadiationWm2" | "et0Mm">, [number, number]> = {
  temperatureC: [-80, 60],
  apparentTemperatureC: [-80, 60],
  dewPointC: [-80, 60],
  relativeHumidityPct: [0, 100],
  precipitationMm: [0, 500],
  precipitationProbabilityPct: [0, 100],
  windSpeedKmh: [0, 300],
  windGustKmh: [0, 400],
  windDirectionDeg: [0, 360],
  cloudCoverPct: [0, 100],
  solarRadiationWm2: [0, 1400],
  et0Mm: [0, 20],
};

export function esValorValido(campo: keyof typeof RANGOS, valor: number | null): boolean {
  if (valor === null) return true; // null es válido (dato faltante, no inválido)
  const [min, max] = RANGOS[campo];
  return valor >= min && valor <= max;
}

export function validarHorario(hora: WeatherHourly): WeatherHourly {
  const copia = { ...hora };
  for (const campo of Object.keys(RANGOS) as (keyof typeof RANGOS)[]) {
    const v = copia[campo] as number | null;
    if (v !== null && !esValorValido(campo, v)) {
      // valor fuera de rango → marcar como null y loguear
      (copia as Record<string, unknown>)[campo] = null;
    }
  }
  return copia;
}

export function validarSerie(horas: WeatherHourly[]): WeatherHourly[] {
  return horas.map(validarHorario).filter((h) => {
    // filtrar horas completamente inválidas (sin temperatura ni viento ni precipitación)
    const tieneAlgo = h.temperatureC !== null || h.windSpeedKmh !== null || h.precipitationMm !== null;
    return tieneAlgo;
  });
}
