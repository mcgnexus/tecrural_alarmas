import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { avisoVigente, fenomenoOficial } from "@/lib/ui/avisos-oficiales";
import { MUNICIPIOS_PUBLICOS } from "@/lib/datos/municipios-publicos";

function read(p: string): string {
  return fs.readFileSync(path.join(process.cwd(), p), "utf8");
}

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

describe("aclaración del área oficial AEMET", () => {
  it("etiqueta cada aviso con su área oficial y explica el alcance", () => {
    const comp = read("src/components/campo/avisos-oficiales.tsx");
    expect(comp).toContain("Área oficial AEMET:");
    expect(comp).toContain("zona de aviso compartida por varios municipios, no una medición de tu parcela");
  });

  it("recibe el nombre del municipio y su zona para contextualizar el aviso", () => {
    const comp = read("src/components/campo/avisos-oficiales.tsx");
    expect(comp).toContain("nombre?: string");
    expect(comp).toContain("region?: string");
    const landing = read("src/components/campo/landing-municipio.tsx");
    expect(landing).toContain("region={municipio.region}");
    const home = read("src/components/campo/home-sin-registro.tsx");
    expect(home).toContain("region={MUNICIPIOS_PUBLICOS.find");
  });

  it("mantiene las zonas AEMET de Granada, incluida la Costa Tropical", () => {
    const aemet = read("src/lib/proveedores/aemet.ts");
    const zonas = [...aemet.matchAll(/"1\d{4}": "([^"]+)"/g)].map((m) => m[1]);
    expect(zonas).toContain("Guadix y Baza");
    expect(zonas).toContain("Costa granadina");
  });

  it("asocia Huéscar al Altiplano y los municipios costeros a la Costa Tropical", () => {
    const hescar = MUNICIPIOS_PUBLICOS.find((m) => m.name === "Huéscar");
    expect(hescar?.zona).toBe("altiplano");
    const costeros = MUNICIPIOS_PUBLICOS.filter((m) => m.zona === "costa");
    expect(costeros.length).toBeGreaterThan(0);
    for (const m of costeros) expect(m.region).toContain("Costa Tropical");
  });
});
