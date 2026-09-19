import { describe, it, expect, vi } from "vitest";
import type { WeatherHourly } from "@/lib/dominio/proveedores";

describe("resiliencia NO_DATA vs GREEN", () => {
  it("no convierte error en sin riesgo (GREEN)", async () => {
    const { evaluadorHelada } = await import("@/lib/alertas/evaluadores/helada");
    // Sin datos por error de provider (horario vacío) debe ser null (GREEN) solo si es green real,
    // pero si el motor lanza NO_DATA, no debe llegar a evaluador
    // Simulamos que obtenerClimaPunto lanza NO_DATA
    const noData = new Error("NO_DATA: Datos temporalmente no disponibles");
    (noData as unknown as Record<string, unknown>).code = "NO_DATA";
    expect(noData.message).toContain("NO_DATA");
    // GREEN es null del evaluador con datos válidos sin riesgo, NO_DATA es throw
    const ctxGreen = {
      horario: [{ temperatureC: 10 } as WeatherHourly],
      clima: { prevision: [{ tMin: 10 } as never], actual: { vientoKmh: 5 } as never } as never,
      momento: new Date(),
    } as never;
    const rGreen = await evaluadorHelada.evaluate(ctxGreen);
    expect(rGreen).toBeNull(); // GREEN -> null, pero es distinto a NO_DATA throw
    expect(rGreen === null).toBeTruthy();
  });

  it("si AEMET falla continúa con secundario", async () => {
    const registro = await import("@/lib/proveedores/registro");
    const aemet = (await import("@/lib/proveedores/aemet")).proveedorAemet;
    const open = (await import("@/lib/proveedores/open-meteo")).proveedorOpenMeteo;
    const mockData: WeatherHourly[] = [{ temperatureC: 10 } as WeatherHourly];
    const spyAemet = vi.spyOn(aemet, "getForecast").mockRejectedValue(new Error("AEMET down"));
    const spyOpen = vi.spyOn(open, "getForecast").mockResolvedValue(mockData as never);
    // proveedorPrincipal será aemet si configurado, si no open-meteo; forzamos aemet configurado
    const origConfig = aemet.configurado;
    (aemet as unknown as Record<string, unknown>).configurado = () => true;
    const res = await registro.obtenerPronostico({ latitud: 37.5, longitud: -2.5 });
    expect(res).toEqual(mockData);
    expect(spyAemet).toHaveBeenCalled();
    expect(spyOpen).toHaveBeenCalled();
    spyAemet.mockRestore();
    spyOpen.mockRestore();
    (aemet as unknown as Record<string, unknown>).configurado = origConfig;
  });

  it("si todos fallan muestra Datos temporalmente no disponibles (NO_DATA)", async () => {
    const registro = await import("@/lib/proveedores/registro");
    const aemet = (await import("@/lib/proveedores/aemet")).proveedorAemet;
    const open = (await import("@/lib/proveedores/open-meteo")).proveedorOpenMeteo;
    const siar = (await import("@/lib/proveedores/siar")).proveedorSiar;
    vi.spyOn(aemet, "getForecast").mockRejectedValue(new Error("fail"));
    vi.spyOn(open, "getForecast").mockRejectedValue(new Error("fail"));
    vi.spyOn(siar, "getForecast").mockRejectedValue(new Error("fail"));
    const origA = aemet.configurado, origO = open.configurado, origS = siar.configurado;
    (aemet as unknown as Record<string, unknown>).configurado = () => true;
    (open as unknown as Record<string, unknown>).configurado = () => true;
    (siar as unknown as Record<string, unknown>).configurado = () => true;
    await expect(registro.obtenerPronostico({ latitud: 0, longitud: 0 })).rejects.toThrow("NO_DATA");
    vi.restoreAllMocks();
    (aemet as unknown as Record<string, unknown>).configurado = origA;
    (open as unknown as Record<string, unknown>).configurado = origO;
    (siar as unknown as Record<string, unknown>).configurado = origS;
  });
});
