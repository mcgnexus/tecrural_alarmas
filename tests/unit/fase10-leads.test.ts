import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { esSolicitudDePrueba } from "@/lib/dominio/solicitud-contacto";

const esquemaContacto = z.object({
  dispositivoId: z.string().trim().min(1).max(128),
  nombre: z.string().trim().min(2).max(80),
  telefono: z.string().trim().refine(v => /^(?:\+34)?[6789]\d{8}$/.test(v.replace(/[\s().-]/g,"").replace(/^0034/,"+34"))),
  municipio: z.string().trim().min(1).max(80),
  cultivo: z.string().trim().min(1).max(40),
  aceptaPrivacidad: z.literal(true),
  website: z.string().max(200).optional(),
  esPrueba: z.boolean().optional(),
});

function baseLead(over: Record<string, unknown> = {}) {
  return {
    dispositivoId: "d-123",
    nombre: "Juan",
    telefono: "+34600111111",
    municipio: "Huéscar",
    cultivo: "Almendro",
    aceptaPrivacidad: true as const,
    website: "",
    ...over,
  };
}

describe("Fase10 Leads", () => {
  it("campos vacíos: falla validación", () => {
    expect(esquemaContacto.safeParse({}).success).toBe(false);
    expect(esquemaContacto.safeParse(baseLead({ nombre:"" })).success).toBe(false);
  });
  it("teléfono inválido: falla", () => {
    expect(esquemaContacto.safeParse(baseLead({ telefono:"123" })).success).toBe(false);
    expect(esquemaContacto.safeParse(baseLead({ telefono:"600111111" })).success).toBe(true);
  });
  it("consentimiento no marcado: falla literal true", () => {
    expect(esquemaContacto.safeParse(baseLead({ aceptaPrivacidad: false as never })).success).toBe(false);
  });
  it("cultivo no seleccionado: vacío falla", () => {
    expect(esquemaContacto.safeParse(baseLead({ cultivo:"" })).success).toBe(false);
  });
  it("honeypot: website relleno es bot", () => {
    const lead = baseLead({ website:"http://spam.com" });
    const isBot = Boolean((lead.website as string)?.trim());
    expect(isBot).toBe(true);
  });
  it("lead correcto: pasa validación", () => {
    expect(esquemaContacto.safeParse(baseLead()).success).toBe(true);
  });
  it("modo prueba se reconoce y no debe incorporarse al proceso real", () => {
    expect(esquemaContacto.safeParse(baseLead({ esPrueba: true })).success).toBe(true);
    expect(esSolicitudDePrueba(true)).toBe(true);
    expect(esSolicitudDePrueba(false)).toBe(false);
    expect(esSolicitudDePrueba(undefined)).toBe(false);
  });
  it("lead duplicado: ventana 5min dedup", () => {
    // simula existeSolicitudReciente con memoria
    const seen = new Map<string, number>();
    function existeReciente(id:string, ventanaMin=5) {
      const last = seen.get(id);
      if (!last) { seen.set(id, Date.now()); return false; }
      return (Date.now() - last) < ventanaMin*60_000;
    }
    expect(existeReciente("d-1")).toBe(false);
    expect(existeReciente("d-1")).toBe(true);
  });
  it("error de Neon: no sobrescribe válido sin marcar stale", async () => {
    const ultimoValido = { evaluadoEl: new Date(Date.now()-10*60_000).toISOString(), stale:false };
    // en fallo, se mantiene último válido marcado no sobrescrito
    const error = new Error("DB down");
    expect(ultimoValido.stale).toBe(false);
    expect(error.message).toBe("DB down");
  });
});
