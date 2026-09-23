import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function read(p:string){ return fs.readFileSync(path.join(process.cwd(), p),"utf8"); }

describe("Fase10 UX", () => {
  it("una sola CTA principal Recibir avisos de mi zona", () => {
    const home = read("src/components/campo/home-sin-registro.tsx");
    const ctas = (home.match(/Recibir avisos de mi zona/g) || []).length;
    // debe existir y ser la principal (2-3 apariciones máx: hero + como funciona)
    expect(ctas).toBeGreaterThanOrEqual(2);
    expect(ctas).toBeLessThanOrEqual(3);
    // secundarios también llevan al mismo formulario
    expect(home).toContain('href="#captacion"');
  });
  it("formulario único en portada", () => {
    const page = read("src/app/(campo)/page.tsx");
    const home = read("src/components/campo/home-sin-registro.tsx");
    const countPage = (page.match(/<FormularioContacto/g) || []).length;
    const countHome = (home.match(/<FormularioContacto/g) || []).length;
    expect(countPage).toBe(0); // page ya no duplica
    expect(countHome).toBe(1); // solo uno en home
  });
  it("navegación pública simplificada: Inicio Tiempo Avisos ¿Cómo funciona?", () => {
    const nav = read("src/components/campo/bottom-nav.tsx");
    expect(nav).toContain('Inicio');
    expect(nav).toContain('Tiempo');
    expect(nav).toContain('Avisos');
    expect(nav).toContain('¿Cómo funciona?');
    expect(nav).not.toContain('Parcelas');
    expect(nav).not.toContain('Servicios');
    expect(nav).not.toContain('Ajustes');
  });
  it("textos de error comprensibles", () => {
    const form = read("src/components/servicios/formulario-contacto.tsx");
    expect(form).toContain("Datos incompletos");
    expect(form).toContain("Error temporal");
    expect(form).toContain("No se pudo enviar");
    const bloque = read("src/components/campo/bloque-valor-agricola.tsx");
    expect(bloque).toContain("No disponible");
    expect(bloque).toContain("Datos desactualizados");
  });
  it("estados de carga visibles", () => {
    const meteo = read("src/components/campo/meteo-zona.tsx");
    expect(meteo).toContain("Consultando el tiempo y la previsión");
    const bloque = read("src/components/campo/bloque-valor-agricola.tsx");
    expect(bloque).toContain("Interpretando riesgos");
    const form = read("src/components/servicios/formulario-contacto.tsx");
    expect(form).toContain("Validando");
    expect(form).toContain("Enviando");
  });
});
