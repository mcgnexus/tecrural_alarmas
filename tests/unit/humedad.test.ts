import { describe, expect, it } from "vitest";
import {
  colorHumedad,
  etiquetaHumedad,
  nivelHumedad,
} from "@/lib/ui/humedad";

describe("escala de color de humedad ambiente", () => {
  it("clasifica por tramos de humedad relativa", () => {
    expect(nivelHumedad(10)?.id).toBe("muy-seco");
    expect(nivelHumedad(25)?.id).toBe("seco");
    expect(nivelHumedad(35)?.id).toBe("poco-humedo");
    expect(nivelHumedad(50)?.id).toBe("optimo");
    expect(nivelHumedad(70)?.id).toBe("humedo");
    expect(nivelHumedad(85)?.id).toBe("muy-humedo");
    expect(nivelHumedad(95)?.id).toBe("saturacion");
  });

  it("devuelve null para valores no numéricos", () => {
    expect(nivelHumedad(null)).toBeNull();
    expect(nivelHumedad(undefined)).toBeNull();
    expect(nivelHumedad(Number.NaN)).toBeNull();
  });

  it("mantiene un color legible por defecto sin dato", () => {
    expect(colorHumedad(null)).toBe("text-stone-900");
    expect(etiquetaHumedad(null)).toBe("Sin dato");
  });

  it("distingue aire seco y aire saturado con colores distintos", () => {
    expect(colorHumedad(10)).not.toBe(colorHumedad(50));
    expect(colorHumedad(10)).not.toBe(colorHumedad(95));
  });
});
