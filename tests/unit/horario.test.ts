import { describe, expect, it } from "vitest";
import { horaMasCercana, inicioDelDiaMadrid } from "@/lib/normalizacion/horario";
import type { WeatherHourly } from "@/lib/dominio/proveedores";

function hora(timestamp: string): WeatherHourly {
  return {
    timestamp,
    latitude: 0,
    longitude: 0,
    temperatureC: 20,
    apparentTemperatureC: 20,
    relativeHumidityPct: 50,
    dewPointC: null,
    precipitationMm: 0,
    precipitationProbabilityPct: 0,
    windSpeedKmh: 0,
    windGustKmh: 0,
    windDirectionDeg: 0,
    cloudCoverPct: null,
    solarRadiationWm2: null,
    et0Mm: null,
    provider: "test",
    fetchedAt: "2026-09-21T00:00:00.000Z",
  };
}

describe("inicio del día en Madrid", () => {
  it("en verano (CEST, UTC+2) la medianoche local es las 22:00Z del día anterior", () => {
    const d = inicioDelDiaMadrid(new Date("2026-09-21T16:15:00.000Z"));
    expect(d.toISOString()).toBe("2026-09-20T22:00:00.000Z");
  });

  it("en invierno (CET, UTC+1) la medianoche local es las 23:00Z del día anterior", () => {
    const d = inicioDelDiaMadrid(new Date("2026-01-15T10:00:00.000Z"));
    expect(d.toISOString()).toBe("2026-01-14T23:00:00.000Z");
  });
});

describe("hora más cercana", () => {
  it("elige la hora más próxima aunque sea anterior", () => {
    const ahora = Date.now();
    const anterior = new Date(ahora - 20 * 60 * 1000).toISOString();
    const siguiente = new Date(ahora + 40 * 60 * 1000).toISOString();
    expect(horaMasCercana([hora(anterior), hora(siguiente)]).timestamp).toBe(anterior);
  });

  it("elige la hora siguiente cuando está más cerca", () => {
    const ahora = Date.now();
    const anterior = new Date(ahora - 45 * 60 * 1000).toISOString();
    const siguiente = new Date(ahora + 15 * 60 * 1000).toISOString();
    expect(horaMasCercana([hora(anterior), hora(siguiente)]).timestamp).toBe(siguiente);
  });
});
