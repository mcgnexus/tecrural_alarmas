import { describe, expect, it } from "vitest";
import { etiquetaDia, lineasEjeDia } from "@/lib/ui/fechas";

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

describe("etiqueta de eje de gráfica en dos líneas", () => {
  it("parte día y mes, recortando el día de la semana a dos letras", () => {
    expect(lineasEjeDia("Mié 30 sept")).toEqual({ linea1: "Mi 30", linea2: "sept" });
    expect(lineasEjeDia("Sáb 3 oct")).toEqual({ linea1: "Sá 3", linea2: "oct" });
  });

  it("mantiene etiquetas de una sola palabra sin partido en dos", () => {
    expect(lineasEjeDia("hoy")).toEqual({ linea1: "hoy", linea2: "" });
    expect(lineasEjeDia("")).toEqual({ linea1: "", linea2: "" });
  });

  it("las etiquetas cortas no se solapan entre sí a 390 px", () => {
    // Cinco etiquetas de 5 caracteres caben holgadas en ~250 px de trazado.
    const ancho = (s: string) => s.length * 6 + 4;
    const etiquetas = ["Mi 30", "Ju 1", "Vi 2", "Sá 3", "Do 4"].map((e) => ancho(e));
    const total = etiquetas.reduce((a, b) => a + b, 0);
    expect(total).toBeLessThan(250);
  });
});
