import { describe, expect, it } from "vitest";
import { catalogoCultivos, faseActiva, mesEnRango } from "@/lib/cultivos/catalogo";
import { zonaCultivoPorCoordenadas } from "@/lib/cultivos/zona";

describe("zona de cultivo por coordenadas", () => {
  it("asigna altiplano al norte (Baza)", () => {
    expect(zonaCultivoPorCoordenadas(37.4897, -2.7735)).toBe("altiplano");
  });

  it("asigna costa al sur (Motril)", () => {
    expect(zonaCultivoPorCoordenadas(36.7448, -3.3426)).toBe("costa");
  });

  it("devuelve null lejos de las zonas conocidas", () => {
    expect(zonaCultivoPorCoordenadas(40.4168, -3.7038)).toBeNull();
  });
});

describe("rango de meses", () => {
  it("admite rangos que cruzan el año", () => {
    expect(mesEnRango(12, 11, 1)).toBe(true);
    expect(mesEnRango(1, 11, 1)).toBe(true);
    expect(mesEnRango(6, 11, 1)).toBe(false);
  });
});

describe("fase fenológica por fecha y zona", () => {
  const almendro = catalogoCultivos.almendro;

  it("usa la ventana genérica sin zona", () => {
    // 15 de enero: en la ventana genérica el almendro está en reposo.
    expect(faseActiva(almendro, new Date(2026, 0, 15))?.id).toBe("reposo");
  });

  it("en la costa adelanta la floración", () => {
    // En Costa Tropical la floración empieza antes (enero).
    expect(faseActiva(almendro, new Date(2026, 0, 15), "costa")?.id).toBe("floracion");
  });

  it("en el altiplano mantiene el reposo en enero", () => {
    expect(faseActiva(almendro, new Date(2026, 0, 15), "altiplano")?.id).toBe("reposo");
  });

  it("el mango florece antes en la costa que en el altiplano", () => {
    const mango = catalogoCultivos.mango;
    // Marzo: costa ya en floración; altiplano también (override 3-5) -> comprobamos abril
    expect(faseActiva(mango, new Date(2026, 3, 15), "costa")?.id).toBe("floracion");
    expect(faseActiva(mango, new Date(2026, 3, 15), "altiplano")?.id).toBe("floracion");
    // Mayo: costa en cuajado, altiplano sigue en floración.
    expect(faseActiva(mango, new Date(2026, 4, 15), "costa")?.id).toBe("cuajado");
    expect(faseActiva(mango, new Date(2026, 4, 15), "altiplano")?.id).toBe("floracion");
  });
});
