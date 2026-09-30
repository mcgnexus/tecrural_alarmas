import { describe, expect, it } from "vitest";
import { etiquetaDia } from "@/lib/ui/fechas";

describe("etiqueta de día con mes", () => {
  it("incluye día de la semana, día y mes sin comas", () => {
    // 1 de octubre de 2026 fue jueves.
    expect(etiquetaDia(new Date(2026, 9, 1))).toBe("Jue 1 oct");
  });

  it("distingue días con el mismo número de días de meses distintos", () => {
    const septiembre = etiquetaDia(new Date(2026, 8, 1));
    const octubre = etiquetaDia(new Date(2026, 9, 1));
    expect(septiembre).not.toBe(octubre);
    // ICU abrevia septiembre como "sept" en algunos entornos.
    expect(septiembre).toMatch(/sep(t?)$/i);
    expect(octubre).toMatch(/oct$/i);
  });

  it("usa el mes en todos los días del periodo, también al cruzar de mes", () => {
    const cruzaDeMes = [
      new Date(2026, 8, 29, 12),
      new Date(2026, 8, 30, 12),
      new Date(2026, 9, 1, 12),
      new Date(2026, 9, 2, 12),
      new Date(2026, 9, 3, 12),
    ].map(etiquetaDia);
    expect(cruzaDeMes[0]).toMatch(/sep(t?)$/i);
    expect(cruzaDeMes[1]).toMatch(/sep(t?)$/i);
    expect(cruzaDeMes[2]).toMatch(/oct$/i);
    expect(cruzaDeMes[3]).toMatch(/oct$/i);
    expect(cruzaDeMes[4]).toMatch(/oct$/i);
  });
});
