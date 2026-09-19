import { describe, it, expect } from "vitest";
import { evaluarRiesgos } from "@/lib/alertas/evaluadores";
import type { WeatherHourly, OfficialWarning } from "@/lib/dominio/proveedores";
import type { RiskContext } from "@/lib/dominio/evaluacion";

function mockProviderHourly(temp: number): WeatherHourly[] {
  return [{
    timestamp: new Date().toISOString(),
    latitude: 37.5,
    longitude: -2.5,
    temperatureC: temp,
    apparentTemperatureC: temp,
    relativeHumidityPct: 60,
    dewPointC: 2,
    precipitationMm: 0,
    precipitationProbabilityPct: 5,
    windSpeedKmh: 5,
    windGustKmh: 10,
    windDirectionDeg: 180,
    cloudCoverPct: 10,
    solarRadiationWm2: 100,
    et0Mm: 1,
    provider: "open-meteo",
    fetchedAt: new Date().toISOString(),
  }];
}

function normalizer(hourly: WeatherHourly[]): WeatherHourly[] {
  // trivial normalizer: ensure provider set and sorted
  return [...hourly].sort((a,b)=> a.timestamp.localeCompare(b.timestamp));
}

describe("integration provider → normalizer → DB → evaluador → risk_event", () => {
  it("flows helada from provider to risk_event", async () => {
    const raw = mockProviderHourly(-1.5); // should be RED
    const normalized = normalizer(raw);
    // simulate DB save/load roundtrip
    const saved = JSON.parse(JSON.stringify(normalized)) as WeatherHourly[];
    const loaded = saved;

    const ctx: RiskContext = {
      plot: { id: "p1", latitude: 37.5, longitude: -2.5 },
      crop: { id: "c1", slug: "almond" },
      hourlyForecast: loaded,
      recentWeather: loaded,
      officialWarnings: [] as OfficialWarning[],
      phytosanitaryAlerts: [],
      evaluationTime: new Date(),
      // legacy compat
      plotId: "p1",
      latitud: 37.5,
      longitud: -2.5,
      clima: { latitud: 37.5, longitud: -2.5, actual: { temperatura: -1.5, sensacionTermica: -1.5, vientoKmh: 5, rachaKmh: 10, precipitacionUltimaHora: 0, humedadRelativa: 60 } as never, prevision: [{ tMin: -1.5 } as never], fuente: { id: "open-meteo", nombre: "Open-Meteo", url: "", licencia: "", consultadaEn: new Date().toISOString() } } as never,
      horario: loaded,
      cultivo: "almendro" as never,
      fenofase: null,
      momento: new Date(),
    } as unknown as RiskContext;

    const resultados = await evaluarRiesgos(ctx);
    const helada = resultados.find((r) => (r.riskType ?? r.type) === "helada");
    expect(helada).toBeDefined();
    expect(["red","RED"].includes(String(helada?.level))).toBeTruthy();

    // simulate risk_event persistence shape
    const riskEvent = {
      plotId: "p1",
      riskType: (helada?.riskType ?? helada?.type) as string,
      level: String(helada?.level).toLowerCase(),
      score: helada?.score,
      headline: helada?.headline,
      summary: helada?.summary,
    };
    expect(riskEvent.level).toBe("red");
    expect(riskEvent.riskType).toBe("helada");
  });

  it("official warning propagates to risk_event", async () => {
    const ctx: RiskContext = {
      plot: { id: "p1", latitude: 37.5, longitude: -2.5 },
      crop: { id: "c1", slug: "almond" },
      hourlyForecast: mockProviderHourly(20),
      recentWeather: [],
      officialWarnings: [{ id: "off-1", provider: "aemet", phenomenon: "lluvia", severity: "orange", area: "", headline: "Lluvia oficial", startsAt: "", endsAt: "" } as OfficialWarning],
      phytosanitaryAlerts: [],
      evaluationTime: new Date(),
      plotId: "p1",
      latitud: 37.5,
      longitud: -2.5,
      clima: { prevision: [] as never, actual: {} as never, fuente: { id: "aemet" } as never } as never,
      horario: mockProviderHourly(20),
      cultivo: "almendro" as never,
      fenofase: null,
      momento: new Date(),
    } as unknown as RiskContext;
    const res = await evaluarRiesgos(ctx);
    const lluvia = res.find((r) => (r.riskType ?? r.type) === "lluvia");
    expect(lluvia?.level).toBeDefined();
    expect((lluvia?.reason as Record<string,unknown>)?.source ?? lluvia?.sourceType).toBeTruthy();
  });
});
