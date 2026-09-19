import { describe, it, expect } from "vitest";
import { resolverParametrosPorRiesgo } from "@/lib/aplicacion/reglas-resolucion";

describe("reglas-resolucion", () => {
  it("prioriza fenofase > cultivo > global y desempata por version", () => {
    const reglas = [
      { id: "1", code: "helada-global", riskType: "helada", name: "g", description: "", cropId: null, phenologicalStateId: null, parameters: { temperature: { yellow: 5 } }, enabled: true, version: 1, createdAt: new Date(), updatedAt: new Date() } as never,
      { id: "2", code: "helada-cultivo", riskType: "helada", name: "c", description: "", cropId: "crop-1", phenologicalStateId: null, parameters: { temperature: { yellow: 3 } }, enabled: true, version: 1, createdAt: new Date(), updatedAt: new Date() } as never,
      { id: "3", code: "helada-feno", riskType: "helada", name: "f", description: "", cropId: "crop-1", phenologicalStateId: "state-1", parameters: { temperature: { yellow: 2 } }, enabled: true, version: 2, createdAt: new Date(), updatedAt: new Date() } as never,
    ];
    const res = resolverParametrosPorRiesgo(reglas as never, "crop-1", "state-1");
    expect(res["helada"]).toEqual({ temperature: { yellow: 2 } });
  });
  it("usa global si no hay especifica", () => {
    const reglas = [
      { id: "1", code: "viento-global", riskType: "viento", name: "g", description: "", cropId: null, phenologicalStateId: null, parameters: { gustKmh: { yellow: 30 } }, enabled: true, version: 1, createdAt: new Date(), updatedAt: new Date() } as never,
    ];
    const res = resolverParametrosPorRiesgo(reglas as never, "crop-2", null);
    expect(res["viento"]).toEqual({ gustKmh: { yellow: 30 } });
  });
});
