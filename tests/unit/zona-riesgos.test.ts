import { describe, expect, it } from "vitest";
import { riesgoRelevanteEnZona, zonaCultivoPorCoordenadas } from "@/lib/cultivos/zona";

describe("prioridad de riesgos por zona", () => {
  it("identifica Costa Tropical en Motril y Almuñécar", () => {
    expect(zonaCultivoPorCoordenadas(36.7448, -3.3426)).toBe("costa");
    expect(zonaCultivoPorCoordenadas(36.7352, -3.6916)).toBe("costa");
  });

  it("identifica Altiplano en Baza", () => {
    expect(zonaCultivoPorCoordenadas(37.4897, -2.7735)).toBe("altiplano");
  });

  it("descarta helada en Costa Tropical y mantiene viento", () => {
    expect(riesgoRelevanteEnZona("helada", "costa")).toBe(false);
    expect(riesgoRelevanteEnZona("viento", "costa")).toBe(true);
    expect(riesgoRelevanteEnZona("helada", "altiplano")).toBe(true);
  });
});
