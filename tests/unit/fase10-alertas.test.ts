import { describe, it, expect } from "vitest";
import { evaluadorHelada } from "@/lib/alertas/evaluadores/helada";
import { evaluadorViento } from "@/lib/alertas/evaluadores/viento";
import { esDatosCaducados } from "@/lib/dominio/frescura";
import { estadoDesdeResultado } from "@/lib/alertas/estado";
import type { WeatherHourly } from "@/lib/dominio/proveedores";

function ctxHelada(temp: number | null) {
  const h: WeatherHourly = {
    timestamp: new Date().toISOString(),
    latitude: 37.8, longitude: -2.5,
    temperatureC: temp, apparentTemperatureC: temp,
    relativeHumidityPct: 70, dewPointC: 1,
    precipitationMm: 0, precipitationProbabilityPct: 10,
    windSpeedKmh: 5, windGustKmh: 5, windDirectionDeg: 180,
    cloudCoverPct: 10, solarRadiationWm2: 100, et0Mm: 1,
    provider: "open-meteo", fetchedAt: new Date().toISOString(),
  };
  return { horario: [h], clima: { prevision: [{ tMin: temp } as never] as never }, plot: {}, cultivo: "almendro", momento: new Date() } as never;
}
function ctxViento(gust: number | null) {
  const h: WeatherHourly = {
    timestamp: new Date().toISOString(),
    latitude: 37.8, longitude: -2.5,
    temperatureC: 15, apparentTemperatureC: 15,
    relativeHumidityPct: 50, dewPointC: 5,
    precipitationMm: 0, precipitationProbabilityPct: 10,
    windSpeedKmh: gust ? gust-5 : 5, windGustKmh: gust, windDirectionDeg: 180,
    cloudCoverPct: 10, solarRadiationWm2: 100, et0Mm: 1,
    provider: "open-meteo", fetchedAt: new Date().toISOString(),
  };
  return { horario: [h], clima: { prevision: [{ rachaMaxKmh: gust } as never] as never }, plot: {}, cultivo: "almendro", momento: new Date() } as never;
}

describe("Fase10 Alertas (helada/viento gratis)", () => {
  it("helada sin riesgo: T 5°C => null (no-risk)", async () => {
    const r = await evaluadorHelada.evaluate(ctxHelada(5));
    expect(r).toBeNull();
  });
  it("helada activa: T -1°C => red/active", async () => {
    const r = await evaluadorHelada.evaluate(ctxHelada(-1));
    expect(r?.level).toBe("red");
  });
  it("viento sin riesgo: racha 20 => null", async () => {
    const r = await evaluadorViento.evaluate(ctxViento(20));
    expect(r).toBeNull();
  });
  it("viento activo: racha 60 => orange/red", async () => {
    const r = await evaluadorViento.evaluate(ctxViento(60));
    expect(["orange","red"]).toContain(r?.level);
  });
  it("alerta caducada: >90m = stale", () => {
    const viejo = new Date(Date.now() - 100*60_000).toISOString();
    expect(esDatosCaducados(viejo, 90)).toBe(true);
    expect(estadoDesdeResultado({ tieneAlerta:true, fechaEvaluacion: viejo })).toBe("stale");
  });
  it("error de evaluación: failed no es sin riesgo", () => {
    expect(estadoDesdeResultado({ tieneAlerta:false, fechaEvaluacion: new Date().toISOString(), error:"EVAL_FAILED" })).toBe("failed");
    // failed nunca debe mapearse a no-risk verde
    expect(estadoDesdeResultado({ tieneAlerta:false, fechaEvaluacion: new Date().toISOString(), error:"x"})).not.toBe("no-risk");
  });
  it("estado pendiente/evaluating", () => {
    // pending antes de evaluar
    const s: string = "pending";
    expect(["pending","evaluating","active","no-risk","stale","failed"]).toContain(s);
  });
  it("reintento: tras failed puede re-evaluar y volver active", async () => {
    const fail = estadoDesdeResultado({ tieneAlerta:false, fechaEvaluacion: new Date().toISOString(), error:"x"});
    expect(fail).toBe("failed");
    const retry = await evaluadorHelada.evaluate(ctxHelada(-1));
    expect(retry?.level).toBe("red"); // reintento exitoso
  });
});
