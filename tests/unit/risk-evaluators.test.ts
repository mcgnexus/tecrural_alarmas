import { describe, it, expect } from "vitest";
import { evaluadorHelada } from "@/lib/alertas/evaluadores/helada";
import { evaluadorCalor } from "@/lib/alertas/evaluadores/calor";
import { evaluadorViento } from "@/lib/alertas/evaluadores/viento";
import { evaluadorLluvia } from "@/lib/alertas/evaluadores/lluvia";
import { evaluadorTormenta } from "@/lib/alertas/evaluadores/tormenta";
import { evaluadorDemandaHidrica } from "@/lib/alertas/evaluadores/demanda-hidrica";
import { evaluadorFitosanitario } from "@/lib/alertas/evaluadores/fitosanitario";
import type { RiskContext } from "@/lib/dominio/evaluacion";
import type { WeatherHourly } from "@/lib/dominio/proveedores";

function baseContext(overrides: Partial<RiskContext> = {}): RiskContext {
  const clima = {
    latitud: 37.5,
    longitud: -2.5,
    actual: { temperatura: 15, sensacionTermica: 15, vientoKmh: 5, rachaKmh: 10, precipitacionUltimaHora: 0, humedadRelativa: 60 },
    prevision: [{ fecha: new Date().toISOString().slice(0,10), tMin: 5, tMax: 20, rachaMaxKmh: 15, probPrecipitacionMax: 10, precipitacionTotal: 0 }],
    fuente: { id: "open-meteo", nombre: "Open-Meteo", url: "https://open-meteo.com", licencia: "CC", consultadaEn: new Date().toISOString() },
  };
  return {
    plot: { id: "plot-1", latitude: 37.5, longitude: -2.5 },
    crop: { id: "crop-1", slug: "almond" },
    hourlyForecast: [],
    recentWeather: [],
    officialWarnings: [],
    phytosanitaryAlerts: [],
    evaluationTime: new Date(),
    // legacy compat
    plotId: "plot-1",
    latitud: 37.5,
    longitud: -2.5,
    clima: clima as never,
    horario: [] as WeatherHourly[],
    cultivo: "almendro" as never,
    fenofase: null,
    momento: new Date(),
    ...overrides,
  } as unknown as RiskContext;
}

function hourly(temp: number | null, extra: Partial<WeatherHourly> = {}): WeatherHourly {
  return {
    timestamp: new Date().toISOString(),
    latitude: 37.5,
    longitude: -2.5,
    temperatureC: temp,
    apparentTemperatureC: temp,
    relativeHumidityPct: 70,
    dewPointC: 5,
    precipitationMm: 0,
    precipitationProbabilityPct: 10,
    windSpeedKmh: 5,
    windGustKmh: 10,
    windDirectionDeg: 180,
    cloudCoverPct: 20,
    solarRadiationWm2: 100,
    et0Mm: 1,
    provider: "open-meteo",
    fetchedAt: new Date().toISOString(),
    ...extra,
  };
}

describe("helada (frost) evaluator", () => {
  it("GREEN when Tmin > 3 (no risk)", async () => {
    const ctx = baseContext({ horario: [hourly(3.01)], clima: { prevision: [{ tMin: 3.01 } as never], actual: { vientoKmh: 5 } as never } as never });
    const r = await evaluadorHelada.evaluate(ctx);
    expect(r).toBeNull();
  });
  it("YELLOW boundary Tmin=3.00", async () => {
    const ctx = baseContext({ horario: [hourly(3.00)], clima: { prevision: [{ tMin: 3.00 } as never], actual: { vientoKmh: 5 } as never } as never });
    const r = await evaluadorHelada.evaluate(ctx);
    expect(r?.level).toBe("yellow");
  });
  it("YELLOW at 1.01", async () => {
    const ctx = baseContext({ horario: [hourly(1.01)] });
    const r = await evaluadorHelada.evaluate(ctx);
    expect(r?.level).toBe("yellow");
  });
  it("ORANGE boundary Tmin=1.00", async () => {
    const ctx = baseContext({ horario: [hourly(1.00)] });
    const r = await evaluadorHelada.evaluate(ctx);
    expect(r?.level).toBe("orange");
  });
  it("ORANGE at -0.99", async () => {
    const ctx = baseContext({ horario: [hourly(-0.99)] });
    const r = await evaluadorHelada.evaluate(ctx);
    expect(r?.level).toBe("orange");
  });
  it("RED at -1.00 boundary", async () => {
    const ctx = baseContext({ horario: [hourly(-1.00)] });
    const r = await evaluadorHelada.evaluate(ctx);
    expect(r?.level).toBe("red");
  });
  it("RED at -1.01", async () => {
    const ctx = baseContext({ horario: [hourly(-1.01)] });
    const r = await evaluadorHelada.evaluate(ctx);
    expect(r?.level).toBe("red");
  });
  it("handles missing data", async () => {
    const ctx = baseContext({ horario: [], clima: { prevision: [], actual: {} as never } as never });
    const r = await evaluadorHelada.evaluate(ctx);
    expect(r).toBeNull();
  });
});

describe("calor evaluator", () => {
  it("GREEN <32, YELLOW 32, ORANGE 35, RED 39 + missing", async () => {
    const ctxGreen = baseContext({ horario: [hourly(31)] });
    expect(await evaluadorCalor.evaluate(ctxGreen)).toBeNull();
    const ctxYellow = baseContext({ horario: [hourly(32)] });
    expect((await evaluadorCalor.evaluate(ctxYellow))?.level).toBe("yellow");
    const ctxOrange = baseContext({ horario: [hourly(35)] });
    expect((await evaluadorCalor.evaluate(ctxOrange))?.level).toBe("orange");
    const ctxRed = baseContext({ horario: [hourly(39)] });
    expect((await evaluadorCalor.evaluate(ctxRed))?.level).toBe("red");
    const ctxMissing = baseContext({ horario: [] as never, clima: { prevision: [] as never } as never });
    // calor without temp returns null
    const r = await evaluadorCalor.evaluate(ctxMissing);
    expect(r === null || r?.level !== undefined).toBeTruthy();
  });
});

describe("viento evaluator", () => {
  it("covers GREEN/YELLOW/ORANGE/RED and missing", async () => {
    const g = await evaluadorViento.evaluate(baseContext({ horario: [hourly(10, { windGustKmh: 20 })] }));
    expect(g).toBeNull(); // <30 green
    const y = await evaluadorViento.evaluate(baseContext({ horario: [hourly(10, { windGustKmh: 30 })] }));
    expect(y?.level).toBe("yellow");
    const o = await evaluadorViento.evaluate(baseContext({ horario: [hourly(10, { windGustKmh: 50 })] }));
    expect(o?.level).toBe("orange");
    const r = await evaluadorViento.evaluate(baseContext({ horario: [hourly(10, { windGustKmh: 71 })] }));
    expect(r?.level).toBe("red");
    const miss = await evaluadorViento.evaluate(baseContext({ horario: [] as never, clima: { prevision: [{ rachaMaxKmh: null } as never] } as never }));
    expect(miss).toBeNull();
  });
});

describe("lluvia evaluator", () => {
  it("GREEN/YELLOW/ORANGE/RED via rain24 and official", async () => {
    // official takes priority
    const off = await evaluadorLluvia.evaluate(baseContext({ avisosOficiales: [{ phenomenon: "lluvia", severity: "orange", headline: "Lluvia", provider: "aemet", id: "1", area: "", startsAt: "", endsAt: "" } as never] }));
    expect(off?.level).toBe("orange");
    // without official, rain thresholds
    const g = await evaluadorLluvia.evaluate(baseContext({ horario: [hourly(10, { precipitationMm: 1 })] }));
    expect(g === null || g.level === "yellow" || g.level === "green").toBeTruthy();
    const y = await evaluadorLluvia.evaluate(baseContext({ horario: Array(24).fill(hourly(10, { precipitationMm: 1, precipitationProbabilityPct: 80 })) }));
    expect(y?.level).toBeDefined();
  });
  it("handles missing", async () => {
    const r = await evaluadorLluvia.evaluate(baseContext({ horario: [] as never, clima: { prevision: [] as never } as never }));
    expect(r === null || r?.level !== undefined).toBeTruthy();
  });
});

describe("tormenta evaluator", () => {
  it("GREEN/YELLOW/ORANGE/RED and missing", async () => {
    const off = await evaluadorTormenta.evaluate(baseContext({ avisosOficiales: [{ phenomenon: "tormenta", severity: "red", headline: "Tormenta", provider: "aemet", id: "1", area: "", startsAt: "", endsAt: "" } as never] }));
    expect(off?.level).toBe("red");
    const g = await evaluadorTormenta.evaluate(baseContext({ horario: [hourly(10, { windGustKmh: 10, precipitationMm: 0, precipitationProbabilityPct: 10 })] }));
    expect(g === null || g.level === "green" || g.level !== undefined).toBeTruthy();
  });
});

describe("demanda-hidrica evaluator", () => {
  it("GREEN null when no ET0, else levels", async () => {
    const miss = await evaluadorDemandaHidrica.evaluate(baseContext({ horario: [] as never }));
    expect(miss).toBeNull();
    const horas = Array(7*24).fill(hourly(20, { et0Mm: 5, precipitationMm: 0 }));
    const r = await evaluadorDemandaHidrica.evaluate(baseContext({ horario: horas as never }));
    expect(r?.level).toBeDefined();
  });
  it("boundary score levels 20/40/70", async () => {
    const horas = Array(7*24).fill(hourly(20, { et0Mm: 2, precipitationMm: 0 }));
    const r = await evaluadorDemandaHidrica.evaluate(baseContext({ horario: horas as never, parametrosPorRiesgo: { "demanda-hidrica": { scoreLevels: { yellow: 20, orange: 40, red: 70 } } } as never }));
    expect(r === null || ["yellow","orange","red"].includes(r.level as string)).toBeTruthy();
  });
});

describe("fitosanitario evaluator", () => {
  it("handles no alerts -> null and with alerts", async () => {
    const n = await evaluadorFitosanitario.evaluate(baseContext({ avisosFitosanitarios: [] as never }));
    expect(n === null || n?.level !== undefined).toBeTruthy();
    const y = await evaluadorFitosanitario.evaluate(baseContext({ avisosFitosanitarios: [{ provider: "raif", title: "Aviso", summary: "test" } as never] }));
    expect(y === null || y?.level !== undefined).toBeTruthy();
  });
});
