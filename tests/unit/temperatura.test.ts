import { describe, expect, it } from "vitest";
import {
  colorTemperatura,
  etiquetaTermica,
  nivelTermico,
} from "@/lib/ui/temperatura";

describe("escala térmica de color", () => {
  it("clasifica por tramos de temperatura", () => {
    expect(nivelTermico(-3)?.id).toBe("helada-fuerte");
    expect(nivelTermico(0)?.id).toBe("helada");
    expect(nivelTermico(2)?.id).toBe("riesgo-helada");
    expect(nivelTermico(10)?.id).toBe("frio");
    expect(nivelTermico(18)?.id).toBe("templado");
    expect(nivelTermico(26)?.id).toBe("calido");
    expect(nivelTermico(33)?.id).toBe("calor");
    expect(nivelTermico(40)?.id).toBe("calor-extremo");
  });

  it("devuelve null para valores no numéricos", () => {
    expect(nivelTermico(null)).toBeNull();
    expect(nivelTermico(undefined)).toBeNull();
    expect(nivelTermico(Number.NaN)).toBeNull();
  });

  it("mantiene un color legible por defecto sin dato", () => {
    expect(colorTemperatura(null)).toBe("text-stone-900");
    expect(etiquetaTermica(null)).toBe("Sin dato");
  });

  it("distingue frío y calor con colores distintos", () => {
    expect(colorTemperatura(-1)).not.toBe(colorTemperatura(5));
    expect(colorTemperatura(-1)).not.toBe(colorTemperatura(30));
  });
});
