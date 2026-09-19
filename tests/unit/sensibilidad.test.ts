import { describe, it, expect } from "vitest";
import { aplicarSensibilidad } from "@/lib/agronomia/sensibilidad";
import { evaluadorHelada } from "@/lib/alertas/evaluadores/helada";
import { evaluadorCalor } from "@/lib/alertas/evaluadores/calor";
import type { RiskContext } from "@/lib/dominio/evaluacion";
import type { WeatherHourly } from "@/lib/dominio/proveedores";

function baseCtx(overrides: Partial<RiskContext> = {}): RiskContext {
  const clima = {
    latitud: 37.5, longitud: -2.5,
    actual: { temperatura: 10, sensacionTermica: 10, vientoKmh: 5, rachaKmh: 10, precipitacionUltimaHora: 0, humedadRelativa: 60 } as never,
    prevision: [{ fecha: new Date().toISOString().slice(0,10), tMin: 2, tMax: 33, rachaMaxKmh: 15, probPrecipitacionMax: 10, precipitacionTotal: 0 } as never],
    fuente: { id: "test", nombre: "test", url: "", licencia: "", consultadaEn: new Date().toISOString() },
  };
  return {
    plot: { id: "p1", latitude: 37.5, longitude: -2.5 },
    crop: { id: "c1", slug: "almond" },
    hourlyForecast: [],
    recentWeather: [],
    officialWarnings: [],
    phytosanitaryAlerts: [],
    evaluationTime: new Date(),
    plotId: "p1", latitud: 37.5, longitud: -2.5, clima: clima as never,
    horario: [] as WeatherHourly[], cultivo: "almendro" as never, fenofase: null, momento: new Date(),
    ...overrides,
  } as unknown as RiskContext;
}
function hourly(temp: number | null, extra: Partial<WeatherHourly> = {}): WeatherHourly {
  return { timestamp: new Date().toISOString(), latitude: 37.5, longitude: -2.5, temperatureC: temp, apparentTemperatureC: temp, relativeHumidityPct: 70, dewPointC: 5, precipitationMm: 0, precipitationProbabilityPct: 10, windSpeedKmh: 5, windGustKmh: 10, windDirectionDeg: 180, cloudCoverPct: 20, solarRadiationWm2: 100, et0Mm: 1, provider: "test", fetchedAt: new Date().toISOString(), ...extra };
}

describe("sensibilidad helper", () => {
  it("aplica escala por sensibilidad", () => {
    expect(aplicarSensibilidad("yellow", 3, 2).nivel).toBe("orange");
    expect(aplicarSensibilidad("orange", 3, 0.5).nivel).toBe("yellow");
    expect(aplicarSensibilidad("yellow", 10, 2).score).toBe(20);
  });
});

describe("helada con sensibilidad", () => {
  it("mismo Tmin produce nivel distinto por coldSensitivity", async () => {
    const ctxBase = baseCtx({ horario: [hourly(1.5)], coldSensitivity: 1 } as never);
    const rBase = await evaluadorHelada.evaluate(ctxBase);
    expect(rBase?.level).toBe("yellow"); // 1.5 <=3 yellow
    const ctxSens = baseCtx({ horario: [hourly(1.5)], coldSensitivity: 1.6 } as never);
    const rSens = await evaluadorHelada.evaluate(ctxSens);
    // con sensibilidad 1.6 debe escalar yellow->orange
    expect(rSens?.level).toBe("orange");
  });
});

describe("calor con sensibilidad ya existente", () => {
  it("score escala con sensibilidad", async () => {
    const ctx = baseCtx({ horario: [hourly(33)], parametrosPorRiesgo: { "golpe-de-calor": { sensitivity: { crop: 2, phenology: 1 } } } as never });
    const r = await evaluadorCalor.evaluate(ctx);
    expect(r?.score).toBeGreaterThan(33);
  });
});
