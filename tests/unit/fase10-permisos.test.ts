import { describe, it, expect } from "vitest";
import { canUseFeature, canAccessServer, planForUser } from "@/lib/planes/permisos";

describe("Fase10 Permisos por plan", () => {
  it("gratuito no puede demanda hídrica", () => {
    expect(canUseFeature("free", "water_demand")).toBe(false);
  });
  it("gratuito puede helada y viento", () => {
    expect(canUseFeature("free", "frost_alert")).toBe(true);
    expect(canUseFeature("free", "wind_alert")).toBe(true);
    expect(canUseFeature("free", "weather_current")).toBe(true);
    expect(canUseFeature("free", "weather_forecast")).toBe(true);
  });
  it("premium accede a funciones correspondientes", () => {
    expect(canUseFeature("pro", "water_demand")).toBe(true);
    expect(canUseFeature("pro", "sensors")).toBe(true);
    expect(canUseFeature("pro", "image_diagnosis")).toBe(true);
    expect(canUseFeature("monitor", "sensors")).toBe(true);
    expect(canUseFeature("essential", "rain_alert")).toBe(true);
  });
  it("endpoint premium bloqueado aunque se conozca URL: servidor 403", () => {
    const plan = planForUser(); // free por defecto
    expect(canAccessServer(plan, "image_diagnosis")).toBe(false);
    expect(canAccessServer(plan, "sensors")).toBe(false);
    // pro sí pasa
    expect(canAccessServer("pro", "image_diagnosis")).toBe(true);
  });
  it("no muestra funcionalidad gratuita si requiere suscripción", () => {
    // rain_alert no debe ser true para free
    expect(canUseFeature("free", "rain_alert")).toBe(false);
    expect(canUseFeature("free", "heat_alert")).toBe(false);
  });
});
