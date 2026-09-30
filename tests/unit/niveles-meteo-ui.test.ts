import { describe, expect, it } from "vitest";
import { colorViento, etiquetaViento, nivelViento } from "@/lib/ui/viento";
import { colorLluvia, etiquetaLluvia, nivelLluvia } from "@/lib/ui/lluvia";

describe("niveles de viento por importancia", () => {
  it("sube de color según aumenta la velocidad", () => {
    expect(etiquetaViento(5)).toBe("Calma");
    expect(etiquetaViento(20)).toBe("Viento suave");
    expect(etiquetaViento(35)).toBe("Viento moderado");
    expect(etiquetaViento(50)).toBe("Viento fuerte");
    expect(etiquetaViento(65)).toBe("Viento muy fuerte");
    expect(etiquetaViento(85)).toBe("Viento extremo: no trabajes en campo");
  });

  it("el color cambia al cruzar cada tramo", () => {
    const colores = [5, 20, 35, 50, 65, 85].map((kmh) => colorViento(kmh));
    expect(new Set(colores).size).toBeGreaterThan(3);
    expect(colorViento(85)).toContain("red");
  });

  it("devuelve null y un color neutro cuando no hay dato", () => {
    expect(nivelViento(null)).toBeNull();
    expect(colorViento(undefined)).toBe("text-stone-900");
    expect(etiquetaViento(Number.NaN)).toBe("Sin dato");
  });
});

describe("niveles de lluvia por importancia", () => {
  it("sube de color según se acumula el agua", () => {
    expect(etiquetaLluvia(0)).toBe("Sin lluvia relevante");
    expect(etiquetaLluvia(3)).toBe("Lluvia ligera");
    expect(etiquetaLluvia(12)).toBe("Lluvia moderada");
    expect(etiquetaLluvia(25)).toBe("Lluvia abundante");
    expect(etiquetaLluvia(45)).toBe("Lluvia muy abundante: posible daño en el cultivo");
    expect(etiquetaLluvia(80)).toBe("Lluvia extrema: riesgo de inundación");
  });

  it("el color cambia al cruzar cada tramo", () => {
    const colores = [0, 3, 12, 25, 45, 80].map((mm) => colorLluvia(mm));
    expect(new Set(colores).size).toBeGreaterThan(3);
    expect(colorLluvia(80)).toContain("red");
  });

  it("devuelve null y un color neutro cuando no hay dato", () => {
    expect(nivelLluvia(null)).toBeNull();
    expect(colorLluvia(undefined)).toBe("text-stone-900");
    expect(etiquetaLluvia(Number.NaN)).toBe("Sin dato");
  });
});
