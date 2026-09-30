import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

function read(p:string){ return fs.readFileSync(path.join(process.cwd(), p),"utf8"); }

describe("Fase10 UX", () => {
  it("CTA principal prioriza probar antes de pedir datos", () => {
    const home = read("src/components/campo/home-sin-registro.tsx");
    // Hero prioriza ver tiempo/riesgos antes de pedir datos
    expect(home).toContain("Ver tiempo y riesgos");
    // La llamada principal aparece junto al resumen y personaliza cultivo/zona
    expect(home).toContain("Recibir estos avisos por WhatsApp");
    expect(home).toContain("nombreCultivoSeleccionado");
    expect(home).toContain('href="#captacion"');
    // No debe haber Recibir avisos antes de elegir municipio en bloque superior
    const heroRecibir = (home.match(/Recibir avisos de mi zona/g) || []).length;
    expect(heroRecibir).toBeLessThanOrEqual(1);
  });
  it("formulario único en portada", () => {
    const page = read("src/app/(campo)/page.tsx");
    const home = read("src/components/campo/home-sin-registro.tsx");
    const countPage = (page.match(/<FormularioContacto/g) || []).length;
    const countHome = (home.match(/<FormularioContacto/g) || []).length;
    expect(countPage).toBe(0); // page ya no duplica
    expect(countHome).toBe(1); // solo uno en home
  });
  it("navegación con acceso directo a AEMET y a alarmas agrícolas", () => {
    const nav = read("src/components/campo/bottom-nav.tsx");
    expect(nav).toContain('Inicio');
    expect(nav).toContain('Tiempo');
    expect(nav).toContain('AEMET');
    expect(nav).toContain('Alarma');
    expect(nav).toContain('¿Cómo funciona?');
    // Acceso directo a los dos bloques de avisos
    expect(nav).toContain('/#avisos-aemet');
    expect(nav).toContain('/#alertas-agricolas');
    // Sin municipio elegido, esas entradas llevan al selector de zona
    expect(nav).toContain('requiereUbicacion');
    expect(nav).toContain('requiereUbicacion && !tieneUbicacion ? "/#zona"');
    // Rejilla adaptada a las 6 entradas
    expect(nav).toContain('grid-cols-6');
    expect(nav).not.toContain('Parcelas');
    expect(nav).not.toContain('Servicios');
    expect(nav).not.toContain('Ajustes');
  });
  it("las secciones enlazadas del menú siempre existen", () => {
    // El ancla #avisos-aemet debe estar en la sección de AEMET.
    const aemet = read("src/components/campo/avisos-oficiales.tsx");
    expect(aemet).toContain('id="avisos-aemet"');
    // #alertas-agricolas debe existir aunque no haya alarmas, para que el
    // enlace del menú nunca quede roto.
    const bloque = read("src/components/campo/bloque-valor-agricola.tsx");
    expect(bloque).toContain('id="alertas-agricolas"');
    expect(bloque).toContain("No hay ninguna alarma agrícola activa");
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
