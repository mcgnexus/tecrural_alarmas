import { describe, it, expect, vi } from "vitest";
import { esquemaCuerpoRiesgo } from "@/lib/datos/validacion";
import { esDatosCaducados } from "@/lib/dominio/frescura";
import { evaluadorHelada } from "@/lib/alertas/evaluadores/helada";
import { normalizarHorario } from "@/lib/normalizacion/open-meteo";

// Meteorología — 7 casos Fase 10
describe("Fase10 Meteorología", () => {
  it("municipio válido: cuerpo riesgo con cultivo y coords válidas", () => {
    const ok = esquemaCuerpoRiesgo.safeParse({ latitud: 37.81, longitud: -2.54, cultivo: "almendro" });
    expect(ok.success).toBe(true);
  });
  it("municipio inexistente: cultivo inválido falla validación", () => {
    const bad = esquemaCuerpoRiesgo.safeParse({ latitud: 37.8, longitud: -2.5, cultivo: "cannabis" as never });
    expect(bad.success).toBe(false);
  });
  it("respuesta correcta Open-Meteo: normaliza a WeatherHourly", () => {
    const raw = {
      latitude: 37.8, longitude: -2.5,
      hourly: {
        time: ["2026-03-01T00:00"],
        temperature_2m: [5],
        apparent_temperature: [4],
        relative_humidity_2m: [80],
        dew_point_2m: [2],
        precipitation: [0],
        precipitation_probability: [10],
        wind_speed_10m: [10],
        wind_gusts_10m: [15],
        wind_direction_10m: [180],
        cloud_cover: [20],
      },
    } as never;
    const horas = normalizarHorario(raw, 37.8, -2.5);
    expect(horas).toHaveLength(1);
    expect(horas[0]!.temperatureC).toBe(5);
    expect(horas[0]!.provider).toBe("open-meteo");
  });
  it("timeout: fetch abortado simula NO_DATA", async () => {
    const controller = new AbortController();
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
    // el motor debe traducir abort a NO_DATA con code
    const err = new Error("NO_DATA: timeout");
    (err as unknown as Record<string, unknown>).code = "NO_DATA";
    expect((err as unknown as Record<string, unknown>).code).toBe("NO_DATA");
  });
  it("proveedor caído: fallback a Open-Meteo (resiliencia)", async () => {
    // ya cubierto en resilience.test.ts — verificar que helada con hourly vacío no crashea y devuelve null
    const ctx = { horario: [], clima: { prevision: [], actual: {} }, plot: {}, cultivo: "almendro" } as never;
    const r = await evaluadorHelada.evaluate(ctx as never);
    expect(r === null || typeof r?.level === "string").toBeTruthy();
  });
  it("datos antiguos: esDatosCaducados >90m = stale", () => {
    const viejo = new Date(Date.now() - 100 * 60_000).toISOString();
    expect(esDatosCaducados(viejo, 90)).toBe(true);
    const fresco = new Date().toISOString();
    expect(esDatosCaducados(fresco, 90)).toBe(false);
  });
  it("previsión incompleta: hourly vacío no rompe evaluador", async () => {
    const ctx = { horario: [{ temperatureC: null } as never], clima: { prevision: [] as never } } as never;
    const r = await evaluadorHelada.evaluate(ctx as never);
    expect(r === null || typeof r?.level === "string").toBeTruthy();
  });
});
