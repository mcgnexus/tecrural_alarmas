"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { registrarEventoEmbudo } from "@/lib/analitica";
import { MeteoZona } from "@/components/campo/meteo-zona";
import { BloqueValorAgricola } from "@/components/campo/bloque-valor-agricola";
import { FormularioContacto } from "@/components/servicios/formulario-contacto";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { leerUbicacionGuardada, municipioDeUbicacion, type UbicacionGuardada } from "@/lib/datos/ubicacion";

type Municipio = { name: string; province: string; region: string; latitude: number; longitude: number; aemetMunicipio?: string };
type Ubicacion = UbicacionGuardada;

const idsCultivos = Object.keys(catalogoCultivos) as CulturaId[];

export function HomeSinRegistro() {
  const [zona, setZona] = useState<"altiplano" | "costa" | null>(null);
  const [query, setQuery] = useState("");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [cultivo, setCultivo] = useState<CulturaId | "">("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restaurarUbicacion = () => setUbicacion(leerUbicacionGuardada());
    restaurarUbicacion();
    window.addEventListener("tecrural:datos-actualizados", restaurarUbicacion);
    return () => window.removeEventListener("tecrural:datos-actualizados", restaurarUbicacion);
  }, []);

  async function cargarMunicipios(z?: "altiplano" | "costa" | "todas") {
    const zonaElegida = z === "todas" ? null : z ?? zona;
    const textoBusqueda = z && z !== "todas" ? "" : query.trim();
    if (z === "todas") setZona(null);
    if (z && z !== "todas") {
      setZona(z);
      setQuery("");
    }
    if (!z && textoBusqueda.length < 2) { setError("Escribe al menos dos letras del municipio."); return; }
    setCargando(true); setError(null); setMunicipios([]);
    try {
      const qs = new URLSearchParams();
      if (zonaElegida) qs.set("zona", zonaElegida);
       if (textoBusqueda) qs.set("q", textoBusqueda);
      const r = await fetch(`/api/v1/locations/search?${qs.toString()}`, { signal: AbortSignal.timeout(15000) });
      if (!r.ok) throw new Error();
      const datos = await r.json() as Municipio[];
      setMunicipios(datos);
      if (!datos.length) setError("No encontramos ese municipio.");
    } catch { setError("No pudimos cargar los municipios. Inténtalo de nuevo."); }
    finally { setCargando(false); }
  }

  function elegir(m: Municipio) {
    const u = { lat: Number(m.latitude), lon: Number(m.longitude), nombre: `${m.name}, ${m.province}`, province: m.province, aemetMunicipio: m.aemetMunicipio };
    setUbicacion(u); setMunicipios([]); setQuery("");
     try { localStorage.setItem("tecrural:ubicacion", JSON.stringify(u)); localStorage.setItem("tecrural:zona", zona ?? m.region); window.dispatchEvent(new Event("tecrural:datos-actualizados")); } catch {}
    registrarEventoEmbudo("municipality_selected", { municipio: m.name, zona: zona ?? m.region });
  }

  return <div className="flex flex-col gap-5">
    {/* BLOQUE 1: propuesta principal */}
    <section className="rounded-3xl border-2 border-earth-700 bg-wheat-50 p-6 shadow-sm">
      <p className="text-[15px] font-bold uppercase tracking-wider text-olive-700">TecRural Campo</p>
      <h1 className="mt-2 text-[30px] font-black leading-tight text-stone-950">Protege tu cultivo frente a heladas y viento</h1>
      <p className="mt-3 text-lg leading-relaxed text-stone-700">Consulta el tiempo de tu zona y recibe avisos sencillos sobre heladas y viento que pueden afectar a tu cultivo.</p>

      <div id="zona" className="scroll-mt-24 mt-6 rounded-2xl border-2 border-olive-700 bg-white p-5 shadow-sm">
        <p className="text-[15px] font-bold uppercase tracking-wide text-olive-700">Paso 1 — tu zona</p>
        <h2 className="mt-1 text-xl font-extrabold text-stone-950">¿En qué municipio está tu explotación?</h2>
        <p className="mt-1 text-base text-stone-700">Así podremos mostrarte el tiempo y los riesgos de tu zona.</p>
        <label htmlFor="municipio-home" className="mt-4 block text-base font-bold text-stone-900">Buscar municipio</label>
        <p className="mt-1 text-sm text-stone-600">Escribe el nombre directamente; no necesitas conocer la zona.</p>
        <div className="mt-1 flex gap-2"><input id="municipio-home" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void cargarMunicipios(); }} autoComplete="address-level2" className="min-h-[52px] min-w-0 flex-1 rounded-xl border-2 border-stone-300 px-4 text-base" placeholder="Ej. Huéscar, Baza o Motril"/><button type="button" onClick={() => void cargarMunicipios()} disabled={cargando} className="min-h-[52px] rounded-xl bg-olive-800 px-4 text-base font-bold text-white">{cargando ? "Buscando…" : "Buscar"}</button></div>
        {cargando ? <p role="status" aria-live="polite" className="mt-2 text-sm font-semibold text-olive-900">Buscando municipios… La ubicación seleccionada no cambiará hasta que elijas un resultado.</p> : null}
        <details className="mt-3 rounded-xl border border-stone-200 p-3">
          <summary className="cursor-pointer text-sm font-bold text-stone-700">Explorar por zona (opcional)</summary>
          <p className="mt-2 text-sm text-stone-600">Altiplano: Huéscar, Baza, Puebla de Don Fadrique, Castril, Orce, Galera y Cúllar. Costa Tropical: Almuñécar, La Herradura, Salobreña y Motril.</p>
          <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" disabled={cargando} onClick={() => void cargarMunicipios("altiplano")} className={`min-h-[44px] rounded-xl border-2 px-3 text-sm font-bold ${zona === "altiplano" ? "border-olive-800 bg-olive-800 text-white" : "border-stone-300"}`}>Altiplano</button><button type="button" disabled={cargando} onClick={() => void cargarMunicipios("costa")} className={`min-h-[44px] rounded-xl border-2 px-3 text-sm font-bold ${zona === "costa" ? "border-olive-800 bg-olive-800 text-white" : "border-stone-300"}`}>Costa Tropical</button></div>
        </details>
        {municipios.length ? <ul className="mt-3 divide-y divide-stone-200 rounded-xl border-2 border-stone-200">{municipios.slice(0,8).map((m) => <li key={`${m.name}-${m.latitude}`}><button type="button" onClick={() => elegir(m)} className="min-h-[52px] w-full px-4 text-left text-base font-semibold">{m.name} · <span className="text-stone-600">{m.province}</span></button></li>)}</ul> : null}
        {error && !cargando && query.trim().length >= 2 && municipios.length === 0 ? <div className="mt-3"><p role="alert" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-[15px] font-semibold text-amber-900">{error}</p>{error.includes("No pudimos") ? <button type="button" onClick={() => void cargarMunicipios()} className="mt-2 min-h-[44px] rounded-xl bg-olive-800 px-4 text-sm font-bold text-white">Reintentar búsqueda</button> : zona ? <button type="button" onClick={() => void cargarMunicipios("todas")} className="mt-2 min-h-[44px] rounded-xl border-2 border-olive-800 px-4 text-sm font-bold text-olive-900">Buscar en todas las zonas</button> : <p className="mt-2 text-sm text-stone-600">Comprueba la escritura o prueba con otro nombre. También puedes elegir una zona en “Explorar por zona”.</p>}</div> : error ? <div className="mt-3"><p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-[15px] font-semibold text-red-800">{error}</p>{error.includes("No pudimos") ? <button type="button" onClick={() => void cargarMunicipios(zona ?? "todas")} className="mt-2 min-h-[44px] rounded-xl bg-olive-800 px-4 text-sm font-bold text-white">Reintentar búsqueda</button> : null}</div> : null}
        {ubicacion ? <p role="status" className="mt-3 rounded-xl bg-brand-50 p-3 text-base font-bold text-brand-900">Ubicación seleccionada: {ubicacion.nombre}</p> : null}
      </div>

      <div className="mt-6 rounded-2xl border-2 border-stone-200 bg-white p-5">
        <label htmlFor="cultivo-home" className="block text-base font-bold text-stone-900">Tu cultivo</label>
        <p className="mt-1 text-sm text-stone-600">Para adaptar helada y viento a tu caso.</p>
        {/* Cultivos incluidos en MVP: Almendro, Olivar, Pistacho, Aguacate, Mango, Chirimoyo, Cereal + Otro */}
        <select id="cultivo-home" value={cultivo} onChange={(e) => { const raw = e.target.value; const v = raw === "otro" ? "" : raw as CulturaId | ""; setCultivo(v); try { localStorage.setItem("tecrural:cultivo", raw === "otro" ? "Otro" : v ? catalogoCultivos[v].nombre : ""); window.dispatchEvent(new Event("tecrural:datos-actualizados")); } catch {} if (raw) registrarEventoEmbudo("crop_selected", { cultivo: raw, municipio: ubicacion?.nombre ?? null }); }} className="mt-2 min-h-[52px] w-full rounded-xl border-2 border-stone-300 bg-white px-4 text-base font-semibold text-stone-900">
          <option value="">Elige tu cultivo</option>
          {idsCultivos.map((id) => <option key={id} value={id}>{catalogoCultivos[id].nombre}</option>)}
          <option value="otro">Otro</option>
        </select>
      </div>

      <a href="#captacion" onClick={() => registrarEventoEmbudo("lead_started", { origen: "cta_principal" })} className="mt-6 inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-brand-800 px-5 py-3 text-lg font-black text-white hover:bg-brand-900">
        Recibir avisos de mi zona
      </a>
      <p className="mt-2 text-center text-sm text-stone-600">Gratis, sin registro. Sin mensajes innecesarios.</p>
      {!ubicacion ? <a href="#zona" className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border-2 border-stone-300 bg-white px-5 py-3 text-base font-bold text-stone-800">Elegir mi municipio</a> : null}
    </section>

    {/* BLOQUE 2: consulta meteorológica (solo tras municipio) */}
    {ubicacion ? <section id="prevision" className="scroll-mt-24 flex flex-col gap-3">
      <h2 className="text-xl font-extrabold text-stone-950">Tiempo de tu zona</h2>
      <MeteoZona key={`${ubicacion.lat}-${ubicacion.lon}`} ubicacion={ubicacion} />
    </section> : null}

    {/* BLOQUE 3: explicación valor agrícola */}
    {ubicacion ? <BloqueValorAgricola key={`${ubicacion.lat}-${ubicacion.lon}-${cultivo}`} ubicacion={ubicacion} cultivo={cultivo || undefined} /> : null}

    {/* BLOQUE 4: captación */}
    <section id="captacion" className="scroll-mt-24">
      <h2 className="text-xl font-extrabold text-stone-950">Recibe avisos por WhatsApp</h2>
      <p className="mt-1 text-base text-stone-700">Avisos gratuitos y solo cuando haya algo relevante para tu municipio y cultivo.</p>
      <div className="mt-3"><FormularioContacto key={ubicacion?.nombre ?? "sin-ubicacion"} municipioInicial={ubicacion ? municipioDeUbicacion(ubicacion.nombre) : ""} cultivoInicial={cultivo ? catalogoCultivos[cultivo].nombre : ""} onCultivoChange={(nombre) => setCultivo(idsCultivos.find((id) => catalogoCultivos[id].nombre === nombre) ?? "")} activarAvisosGratis ubicacionAvisos={ubicacion ? { lat: ubicacion.lat, lon: ubicacion.lon } : null} /></div>
    </section>

    {/* BLOQUE 5: confianza */}
    <section id="como-funciona" className="scroll-mt-24 rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm" aria-labelledby="confianza-titulo">
      <h2 id="confianza-titulo" className="text-lg font-extrabold text-stone-950">¿Cómo funciona?</h2>
      <ol className="mt-3 grid gap-2 text-[15px] leading-relaxed text-stone-700 list-decimal pl-5">
        <li>Eliges tu municipio y cultivo.</li>
        <li>Consultas el tiempo y los riesgos de helada y viento para 5 días.</li>
        <li>Al enviar el formulario, los avisos gratis quedan activados en este dispositivo. El equipo puede contactarte después para comprobar los datos; recibirás WhatsApp si una evaluación programada detecta un riesgo relevante.</li>
      </ol>
      <ul className="mt-3 grid gap-2 text-[15px] leading-relaxed text-stone-700">
        <li>• Fuentes: AEMET y Open-Meteo.</li>
        <li>• Datos actualizados cada hora. Fecha visible en el bloque de tiempo.</li>
        <li>• Información orientativa: no sustituye a AEMET ni a un técnico.</li>
        <li>• Sin mensajes innecesarios.</li>
      </ul>
      <p className="mt-3 text-sm text-stone-600">Consulta nuestra <Link href="/privacidad" className="font-bold text-brand-800 underline">política de privacidad</Link>. Para solicitar la baja o eliminar tus datos, escribe a mcgtecrural@gmail.com.</p>
      <a href="#captacion" className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-brand-800 px-5 py-3 text-base font-bold text-white">Recibir avisos de mi zona</a>
    </section>
  </div>;
}
