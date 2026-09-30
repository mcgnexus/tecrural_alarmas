import { describe, expect, it } from "vitest";
import { reglaLluvia } from "@/lib/agronomia/reglas/lluvia";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { ClimaPunto } from "@/lib/clima/tipos";
import type { ContextoAgronomico } from "@/lib/agronomia/contexto";
import { ajustarCultivoPorParametros } from "@/lib/agronomia/reglas-config";

const FUENTE = {
  id: "aemet",
  nombre: "AEMET",
  url: "https://aemet.es",
  licencia: "Uso libre",
  consultadaEn: "2026-01-01T00:00:00.000Z",
};

function contexto(precipitacionTotal: number, probPrecipitacionMax = 50): ContextoAgronomico {
  const clima: ClimaPunto = {
    latitud: 37.8,
    longitud: -2.6,
    actual: {
      temperatura: 12,
      sensacionTermica: 11,
      vientoKmh: 8,
      rachaKmh: 14,
      precipitacionUltimaHora: 0,
      humedadRelativa: 60,
    },
    prevision: [
      {
        fecha: "2026-01-02",
        tMin: 4,
        tMax: 12,
        rachaMaxKmh: 18,
        probPrecipitacionMax,
        precipitacionTotal,
      },
    ],
    fuente: FUENTE,
  };
  return {
    clima,
    cultivo: catalogoCultivos.almendro,
    fenofase: null,
    momento: new Date("2026-01-01T12:00:00.000Z"),
  };
}

describe("regla de lluvia", () => {
  it("no avisa por debajo del umbral de aviso", () => {
    const aviso = catalogoCultivos.almendro.umbrales.lluviaAvisoMm;
    expect(reglaLluvia.evaluar(contexto(aviso - 0.1))).toEqual([]);
  });

  it("avisa con severidad aviso al superar el umbral", () => {
    const aviso = catalogoCultivos.almendro.umbrales.lluviaAvisoMm;
    const hallazgos = reglaLluvia.evaluar(contexto(aviso + 5));
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]!.tipo).toBe("lluvia");
    expect(hallazgos[0]!.severidad).toBe("aviso");
  });

  it("eleva a alerta al superar el umbral crítico", () => {
    const critica = catalogoCultivos.almendro.umbrales.lluviaCriticaMm;
    const hallazgos = reglaLluvia.evaluar(contexto(critica + 1));
    expect(hallazgos[0]!.severidad).toBe("alerta");
  });

  it("la probabilidad por sí sola no dispara la alerta", () => {
    expect(reglaLluvia.evaluar(contexto(0, 100))).toEqual([]);
  });

  it("usa umbrales distintos por cultivo", () => {
    // 30 mm: supera el aviso del almendro (20) sin llegar a su crítico (40),
    // y queda justo en el aviso del olivar (30).
    expect(reglaLluvia.evaluar(contexto(30))[0]?.severidad).toBe("aviso");
    // 29 mm está por debajo del aviso del olivar: el olivar no avisa.
    expect(
      reglaLluvia.evaluar({ ...contexto(29), cultivo: catalogoCultivos.olivar }),
    ).toEqual([]);
  });

  it("el mensaje incluye mm acumulados y probabilidad", () => {
    const hallazgos = reglaLluvia.evaluar(contexto(33, 80));
    expect(hallazgos[0]!.mensaje).toContain("33 mm");
    expect(hallazgos[0]!.mensaje).toContain("80 %");
  });
});

describe("umbrales de lluvia configurables", () => {
  it("ajusta los umbrales desde parameters.rain24h", () => {
    const cultivo = ajustarCultivoPorParametros(catalogoCultivos.almendro, "lluvia", {
      thresholds: { rain24h: { yellow: 5, red: 12 } },
    });
    expect(cultivo.umbrales.lluviaAvisoMm).toBe(5);
    expect(cultivo.umbrales.lluviaCriticaMm).toBe(12);
  });

  it("no toca otros umbrales con una regla de lluvia", () => {
    const cultivo = ajustarCultivoPorParametros(catalogoCultivos.almendro, "lluvia", {
      thresholds: { rain24h: { yellow: 5, red: 12 } },
    });
    expect(cultivo.umbrales.tminHelada).toBe(catalogoCultivos.almendro.umbrales.tminHelada);
  });
});
