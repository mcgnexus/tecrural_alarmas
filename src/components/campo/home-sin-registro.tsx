"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { enlaceWhatsapp } from "@/lib/config/contacto";
import { registrarEventoEmbudo } from "@/lib/analitica";
import { MeteoZona } from "@/components/campo/meteo-zona";

type Municipio = { name: string; province: string; region: string; latitude: number; longitude: number; aemetMunicipio?: string };
type Ubicacion = { lat: number; lon: number; nombre: string; aemetMunicipio?: string };

const servicios = [
  { titulo: "Alertas de campo", texto: "Heladas, calor, lluvia y viento explicados con claridad.", href: "/alertas" },
  { titulo: "Riego con criterio", texto: "Decide cuándo regar con datos de tu parcela y tu cultivo.", href: "/servicios#sensor-humedad" },
  { titulo: "Seguimiento técnico", texto: "Un técnico revisa contigo lo importante de la campaña.", href: "/servicios#seguimiento" },
];

export function HomeSinRegistro() {
  const [zona, setZona] = useState<"altiplano" | "costa" | null>(null);
  const [query, setQuery] = useState("");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wa = useMemo(() => enlaceWhatsapp(ubicacion ? `Hola, soy de ${ubicacion.nombre} y quiero orientación para mi explotación.` : "Hola, quiero orientación para mi explotación."), [ubicacion]);

  async function cargarMunicipios(z?: "altiplano" | "costa") {
    const zonaElegida = z ?? zona;
    if (z) setZona(z);
    if (!zonaElegida && query.trim().length < 2) { setError("Elige una zona o escribe al menos dos letras."); return; }
    setCargando(true); setError(null);
    try {
      const qs = new URLSearchParams();
      if (zonaElegida) qs.set("zona", zonaElegida);
      if (query.trim()) qs.set("q", query.trim());
      const r = await fetch(`/api/v1/locations/search?${qs.toString()}`);
      if (!r.ok) throw new Error();
      const datos = await r.json() as Municipio[];
      setMunicipios(datos);
      if (!datos.length) setError("No encontramos ese municipio.");
    } catch { setError("No pudimos cargar los municipios. Inténtalo de nuevo."); }
    finally { setCargando(false); }
  }

  function elegir(m: Municipio) {
    const u = { lat: Number(m.latitude), lon: Number(m.longitude), nombre: `${m.name}, ${m.province}`, aemetMunicipio: m.aemetMunicipio };
    setUbicacion(u); setMunicipios([]); setQuery("");
    try { localStorage.setItem("tecrural:ubicacion", JSON.stringify(u)); localStorage.setItem("tecrural:zona", zona ?? m.region); } catch {}
    registrarEventoEmbudo("municipality_selected", { municipio: m.name, zona: zona ?? m.region });
  }

  return <div className="flex flex-col gap-5">
    <section className="rounded-3xl border-2 border-earth-700 bg-wheat-50 p-6 shadow-sm md:grid md:grid-cols-[1.4fr_.6fr] md:items-center md:gap-8">
      <div><p className="text-[15px] font-bold uppercase tracking-wider text-olive-700">TecRural Campo</p><h1 className="mt-2 text-[30px] font-black leading-tight text-stone-950">Decide a tiempo. Protege tu campo.</h1><p className="mt-3 text-lg leading-relaxed text-stone-700">Avisos claros y ayuda cercana para agricultores y ganaderos.</p></div>
      <a href="#zona" className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border-2 border-earth-700 bg-white px-5 py-3 text-base font-bold text-earth-900 md:mt-0">Elegir mi zona</a>
    </section>

    <section id="zona" className="scroll-mt-24 rounded-2xl border-2 border-olive-700 bg-white p-5 shadow-sm">
      <p className="text-[15px] font-bold uppercase tracking-wide text-olive-700">Primero, tu ubicación</p><h2 className="mt-1 text-xl font-extrabold text-stone-950">¿En qué municipio está tu explotación?</h2><p className="mt-1 text-base text-stone-700">Así podremos orientarte con datos de tu zona.</p>
      <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => void cargarMunicipios("altiplano")} className={`min-h-[52px] rounded-xl border-2 px-3 text-[15px] font-bold ${zona === "altiplano" ? "border-olive-800 bg-olive-800 text-white" : "border-stone-300"}`}>Altiplano</button><button type="button" onClick={() => void cargarMunicipios("costa")} className={`min-h-[52px] rounded-xl border-2 px-3 text-[15px] font-bold ${zona === "costa" ? "border-olive-800 bg-olive-800 text-white" : "border-stone-300"}`}>Costa Tropical</button></div>
      <label htmlFor="municipio-home" className="mt-4 block text-base font-bold text-stone-900">Buscar municipio</label><div className="mt-1 flex gap-2"><input id="municipio-home" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void cargarMunicipios(); }} autoComplete="address-level2" className="min-h-[52px] min-w-0 flex-1 rounded-xl border-2 border-stone-300 px-4 text-base" placeholder="Ej. Baza o Motril"/><button type="button" onClick={() => void cargarMunicipios()} disabled={cargando} className="min-h-[52px] rounded-xl bg-olive-800 px-4 text-base font-bold text-white">{cargando ? "…" : "Buscar"}</button></div>
      {municipios.length ? <ul className="mt-3 divide-y divide-stone-200 rounded-xl border-2 border-stone-200">{municipios.slice(0,8).map((m) => <li key={`${m.name}-${m.latitude}`}><button type="button" onClick={() => elegir(m)} className="min-h-[52px] w-full px-4 text-left text-base font-semibold">{m.name} · <span className="text-stone-600">{m.province}</span></button></li>)}</ul> : null}
      {ubicacion ? <p role="status" className="mt-3 rounded-xl bg-brand-50 p-3 text-base font-bold text-brand-900">Ubicación elegida: {ubicacion.nombre}</p> : null}{error ? <p role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-[15px] font-semibold text-red-800">{error}</p> : null}
    </section>

    {ubicacion ? <MeteoZona key={`${ubicacion.lat}-${ubicacion.lon}`} ubicacion={ubicacion} /> : null}

    <section className="rounded-2xl bg-olive-900 p-5 text-white"><h2 className="text-xl font-extrabold">Cuéntanos qué necesitas</h2><p className="mt-1 text-base text-wheat-100">Te responde una persona, sin menús ni complicaciones.</p>{wa ? <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => registrarEventoEmbudo("click_whatsapp", { origen: "home", municipio: ubicacion?.nombre ?? null })} className="mt-4 inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-lg font-black text-white hover:bg-emerald-700">Hablar por WhatsApp</a> : <a href="#contacto" className="mt-4 inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-wheat-100 px-5 py-3 text-lg font-black text-olive-950">Pedir una llamada</a>}</section>

    <section><h2 className="text-xl font-extrabold text-stone-950">Ayuda práctica para tu explotación</h2><div className="mt-3 grid gap-3 md:grid-cols-3">{servicios.map((s) => <article key={s.titulo} className="rounded-2xl border-2 border-earth-200 bg-white p-4"><h3 className="text-lg font-extrabold text-stone-950">{s.titulo}</h3><p className="mt-1 text-[15px] leading-relaxed text-stone-700">{s.texto}</p><Link href={s.href} className="mt-3 inline-flex min-h-[44px] items-center font-bold text-olive-800 underline">Ver cómo ayuda</Link></article>)}</div></section>
  </div>;
}
