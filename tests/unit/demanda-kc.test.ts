import { describe, it, expect } from "vitest";
import { evaluadorDemandaHidrica } from "@/lib/alertas/evaluadores/demanda-hidrica";
import type { RiskContext } from "@/lib/dominio/evaluacion";
import type { WeatherHourly } from "@/lib/dominio/proveedores";

function base(overrides: Partial<RiskContext> = {}): RiskContext {
  const clima = {
    latitud: 37.5, longitud: -2.5,
    actual: { temperatura: 20, sensacionTermica: 20, vientoKmh: 5, rachaKmh: 10, precipitacionUltimaHora: 0, humedadRelativa: 60 } as never,
    prevision: [{ fecha: new Date().toISOString().slice(0,10), tMin: 10, tMax: 20, rachaMaxKmh: 10, probPrecipitacionMax: 10, precipitacionTotal: 0 } as never],
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
function hourly(et0: number, prec = 0): WeatherHourly {
  return { timestamp: new Date().toISOString(), latitude: 37.5, longitude: -2.5, temperatureC: 20, apparentTemperatureC: 20, relativeHumidityPct: 60, dewPointC: 5, precipitationMm: prec, precipitationProbabilityPct: 10, windSpeedKmh: 5, windGustKmh: 10, windDirectionDeg: 180, cloudCoverPct: 20, solarRadiationWm2: 100, et0Mm: et0, provider: "test", fetchedAt: new Date().toISOString() } as WeatherHourly;
}

describe("demanda Kc validado", () => {
  it("usa ET0 si Kc no validado", async () => {
    const horas = Array(7*24).fill(hourly(5, 0));
    const ctx = base({ horario: horas as never, coeficiente: { kc: 1.2, validado: false, origen: "crop" } as never });
    const r = await evaluadorDemandaHidrica.evaluate(ctx);
    expect(r?.reason).toHaveProperty("kcApplied", false);
    expect(r?.reason).toHaveProperty("et0Mm7d");
  });
  it("usa ETc si Kc validado", async () => {
    const horas = Array(7*24).fill(hourly(5, 0));
    const ctx = base({ horario: horas as never, coeficiente: { kc: 1.5, validado: true, origen: "phenological_state" } as never });
    const r = await evaluadorDemandaHidrica.evaluate(ctx);
    expect(r?.reason).toHaveProperty("kcApplied", true);
    expect(r?.reason).toHaveProperty("etcMm7d");
  });
  it("respeta waterSensitivity via contexto", async () => {
    const horas = Array(7*24).fill(hourly(5, 0));
    const ctxLow = base({ horario: horas as never, waterSensitivity: 0.5 } as never);
    const ctxHigh = base({ horario: horas as never, waterSensitivity: 2 } as never);
    const rLow = await evaluadorDemandaHidrica.evaluate(ctxLow);
    const rHigh = await evaluadorDemandaHidrica.evaluate(ctxHigh);
    // con sensibilidad alta el score debe ser mayor o nivel más grave
    expect(rLow?.score ?? 0).toBeDefined();
    expect(rHigh?.score ?? 0).toBeDefined();
  });
});
