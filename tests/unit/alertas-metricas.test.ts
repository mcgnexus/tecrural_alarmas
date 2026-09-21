import { describe, expect, it } from "vitest";
import { metricasDeAlerta, subtituloDeAlerta } from "@/lib/alertas/metricas";

describe("métricas de alerta por tipo", () => {
  it("demanda hídrica (texto clásico) muestra ETc, ETo y Kc", () => {
    const mensaje =
      "El cultivo puede demandar unos 4.6 mm/día (ETo 4.2 mm/día × Kc 1.1). Orientativo; no sustituye a la estación de riego. Sin lluvia destacable prevista, vigila la disponibilidad de riego.";
    const m = metricasDeAlerta("demanda-hidrica", mensaje);
    expect(m.map((x) => x.etiqueta)).toEqual([
      "Demanda del cultivo (ETc)",
      "ETo",
      "Coeficiente Kc",
    ]);
    expect(m[0]!.valor).toBe("4,6 mm/día");
    expect(m[1]!.valor).toBe("4,2 mm/día");
    expect(m[2]!.valor).toBe("1,1");
  });

  it("demanda hídrica NO inventa una mínima de temperatura", () => {
    const m = metricasDeAlerta("demanda-hidrica", "El cultivo puede demandar unos 4.6 mm/día (ETo 4.2 mm/día × Kc 1.1).");
    expect(m.some((x) => x.etiqueta.toLowerCase().includes("mínima"))).toBe(false);
  });

  it("demanda hídrica (evaluador nuevo) usa el formato de 7 días", () => {
    const mensaje = "Demanda hídrica (7 días): ETc 32 mm (Kc 1.1 validado), lluvia efectiva 4 mm (de 5 mm), índice de déficit 28 mm.";
    const m = metricasDeAlerta("demanda-hidrica", mensaje);
    const porEtiqueta = Object.fromEntries(m.map((x) => [x.etiqueta, x.valor]));
    expect(porEtiqueta["Demanda del cultivo (ETc)"]).toBe("32 mm (7 días)");
    expect(porEtiqueta["Coeficiente Kc"]).toBe("1,1");
    expect(porEtiqueta["Déficit (7 días)"]).toBe("28 mm");
  });

  it("helada muestra la mínima", () => {
    const m = metricasDeAlerta("helada", "Mínima prevista de 3.2 °C, igual o inferior al umbral de 4 °C para Floración.");
    expect(m).toEqual([{ etiqueta: "Mínima prevista", valor: "3,2 °C", temperaturaC: 3.2 }]);
  });

  it("golpe de calor muestra la máxima", () => {
    const m = metricasDeAlerta("golpe-de-calor", "Máxima prevista de 39 °C (umbrales: amarillo 34, ...).");
    expect(m).toEqual([{ etiqueta: "Máxima prevista", valor: "39 °C", temperaturaC: 39 }]);
  });

  it("viento muestra racha y viento medio", () => {
    const m = metricasDeAlerta("viento", "Rachas máximas de 62 km/h (viento medio 30 km/h); 4 h por encima de 50 km/h.");
    expect(m.map((x) => x.etiqueta)).toEqual(["Racha máxima", "Viento medio"]);
    expect(m[0]!.valor).toBe("62 km/h");
  });

  it("un tipo desconocido no devuelve métricas", () => {
    expect(metricasDeAlerta("lluvia", "Precipitación de 20 mm.")).toEqual([]);
  });
});

describe("subtítulo de alerta", () => {
  it("adapta la frase al tipo", () => {
    expect(subtituloDeAlerta("helada")).toBe("Esta madrugada");
    expect(subtituloDeAlerta("demanda-hidrica")).toBe("Estimación orientativa de riego");
  });
});
