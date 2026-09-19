import { describe, expect, it, vi, beforeAll } from "vitest";

const payloadAemet = [
  {
    prediccion: {
      dia: [
        {
          fecha: "2026-09-19T00:00:00",
          temperatura: [
            { value: "20", periodo: "00" },
            { value: "25", periodo: "12" },
          ],
          sensTermica: [{ value: "19", periodo: "00" }],
          humedadRelativa: [
            { value: "50", periodo: "00" },
            { value: "40", periodo: "12" },
          ],
          precipitacion: [
            { value: "0", periodo: "0005" },
            { value: "1", periodo: "12" },
          ],
          probPrecipitacion: [{ value: "10", periodo: "0005" }],
          vientoAndRachaMax: [
            { direccion: ["N"], velocidad: ["10"], periodo: "00" },
            { value: "30", periodo: "00" },
            { direccion: ["SO"], velocidad: ["20"], periodo: "12" },
            { value: "45", periodo: "12" },
          ],
        },
      ],
    },
  },
];

beforeAll(() => {
  process.env.AEMET_API_KEY = "test-key";
  process.env.AEMET_MUNICIPIO = "18002";
});

describe("proveedor AEMET: parseo de predicción horaria municipal", () => {
  it("interpreta arrays {periodo,value}, rangos y viento intercalado", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ estado: 200, datos: "https://x/datos" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(payloadAemet), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { proveedorAemet } = await import("@/lib/proveedores/aemet");
    const horas = await proveedorAemet.getForecast({
      latitud: 37.5,
      longitud: -2.5,
    });

    expect(horas.length).toBeGreaterThan(0);
    expect(horas.every((h) => h.provider === "aemet")).toBe(true);

    // 00:00 local Madrid (CEST, UTC+2) → 22:00Z del día anterior
    const medianoche = horas.find((h) => h.temperatureC === 20);
    expect(medianoche).toBeDefined();
    expect(medianoche!.timestamp).toBe("2026-09-18T22:00:00.000Z");

    // Rango "0005" se expande a las horas 0..5
    const conRango = horas.filter((h) => h.precipitationProbabilityPct === 10);
    expect(conRango.length).toBe(6);

    // Viento: velocidad y racha separadas, con dirección cardinal
    const h0 = horas.find((h) => h.temperatureC === 20)!;
    expect(h0.windSpeedKmh).toBe(10);
    expect(h0.windGustKmh).toBe(30);
    expect(h0.windDirectionDeg).toBe(0);
  });
});
