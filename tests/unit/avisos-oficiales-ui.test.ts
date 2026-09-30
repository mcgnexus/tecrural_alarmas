import { describe, expect, it } from "vitest";
import { avisoVigente, fenomenoOficial } from "@/lib/ui/avisos-oficiales";

describe("clasificación de avisos oficiales visibles al agricultor", () => {
  it.each([
    ["Lluvia", "Lluvia acumulada en 1 hora"],
    ["Precipitación", "Aviso de precipitaciones"],
  ])("identifica lluvia: %s", (phenomenon, headline) => {
    expect(fenomenoOficial({ phenomenon, headline })).toBe("lluvia");
  });

  it.each([
    ["Temperaturas mínimas", "Aviso por bajas temperaturas"],
    ["Helada", "Riesgo de helada"],
  ])("identifica helada/temperatura mínima: %s", (phenomenon, headline) => {
    expect(fenomenoOficial({ phenomenon, headline })).toBe("helada");
  });

  it("identifica viento y no confunde otros fenómenos", () => {
    expect(fenomenoOficial({ phenomenon: "Viento", headline: "Rachas máximas" })).toBe("viento");
    expect(fenomenoOficial({ phenomenon: "Nieve", headline: "Nevadas" })).toBeNull();
  });
});

describe("vigencia de aviso oficial", () => {
  it("acepta avisos activos y previstos dentro de 72 horas", () => {
    const ahora = Date.parse("2026-01-01T12:00:00Z");
    expect(avisoVigente({ startsAt: "2026-01-01T11:00:00Z", endsAt: "2026-01-01T13:00:00Z" }, ahora)).toBe(true);
    expect(avisoVigente({ startsAt: "2026-01-03T12:00:00Z", endsAt: "2026-01-03T13:00:00Z" }, ahora)).toBe(true);
    expect(avisoVigente({ startsAt: "", endsAt: "2026-01-01T13:00:00Z" }, ahora)).toBe(true);
  });

  it("descarta avisos aún no iniciados o ya caducados", () => {
    const ahora = Date.parse("2026-01-01T12:00:00Z");
    expect(avisoVigente({ startsAt: "2026-01-05T13:00:00Z", endsAt: "2026-01-05T14:00:00Z" }, ahora)).toBe(false);
    expect(avisoVigente({ startsAt: "2026-01-01T10:00:00Z", endsAt: "2026-01-01T11:00:00Z" }, ahora)).toBe(false);
  });
});
