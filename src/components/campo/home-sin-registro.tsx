"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { enlaceWhatsapp } from "@/lib/config/contacto";
import { registrarEventoEmbudo } from "@/lib/analitica";
import { MeteoZona } from "@/components/campo/meteo-zona";
import { AvisosOficialesAemet } from "@/components/campo/avisos-oficiales";
import { ListaAvisosFitosanitarios } from "@/components/fitosanitario/lista-avisos";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { CtaWhatsapp } from "@/components/campo/cta-whatsapp";

type Municipio = { name: string; province: string; region: string; latitude: number; longitude: number; aemetMunicipio?: string };
type Ubicacion = { lat: number; lon: number; nombre: string; province?: string; aemetMunicipio?: string };

const idsCultivos = Object.keys(catalogoCultivos) as CulturaId[];

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
  const [cultivo, setCultivo] = useState<CulturaId | "">("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wa = useMemo(() => {
    const municipio = ubicacion ? ubicacion.nombre.split(",")[0]?.trim() : "";
    const nombreCultivo = cultivo ? catalogoCultivos[cultivo].nombre : "";
    const mensaje = nombreCultivo
      ? `Hola, soy${municipio ? ` de ${municipio}` : ""} y quiero recibir avisos de mi cultivo de ${nombreCultivo} por WhatsApp.`
      : `Hola, quiero recibir avisos de mi cultivo por WhatsApp${municipio ? ` (${municipio})` : ""}.`;
    return enlaceWhatsapp(mensaje);
  }, [ubicacion, cultivo]);

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
    const u = { lat: Number(m.latitude), lon: Number(m.longitude), nombre: `${m.name}, ${m.province}`, province: m.province, aemetMunicipio: m.aemetMunicipio };
    setUbicacion(u); setMunicipios([]); setQuery("");
     try { localStorage.setItem("tecrural:ubicacion", JSON.stringify(u)); localStorage.setItem("tecrural:zona", zona ?? m.region); window.dispatchEvent(new Event("tecrural:datos-actualizados")); } catch {}
    registrarEventoEmbudo("municipality_selected", { municipio: m.name, zona: zona ?? m.region });
  }

  return <div className="flex flex-col gap-5">
    <section className="rounded-3xl border-2 border-earth-700 bg-wheat-50 p-6 shadow-sm md:grid md:grid-cols-[1.4fr_.6fr] md:items-center md:gap-8">
       <div><p className="text-[15px] font-bold uppercase tracking-wider text-olive-700">TecRural Campo</p><h1 className="mt-2 text-[30px] font-black leading-tight text-stone-950">Recibe avisos útiles para proteger tu explotación.</h1><p className="mt-3 text-lg leading-relaxed text-stone-700">Podrás recibir por WhatsApp avisos claros sobre heladas, calor, lluvia, viento y riesgos para tu cultivo, adaptados a tu municipio.</p><ul className="mt-4 grid gap-2 text-[15px] font-semibold text-stone-800"><li className="flex gap-2"><span aria-hidden="true" className="text-olive-700">✓</span>Avisos cuando haya riesgo relevante para tu zona.</li><li className="flex gap-2"><span aria-hidden="true" className="text-olive-700">✓</span>Recomendaciones fáciles de entender.</li><li className="flex gap-2"><span aria-hidden="true" className="text-olive-700">✓</span>Información adaptada a tu cultivo.</li><li className="flex gap-2"><span aria-hidden="true" className="text-olive-700">✓</span>Sin recibir mensajes innecesarios.</li><li className="flex gap-2"><span aria-hidden="true" className="text-olive-700">✓</span>Servicio gratuito durante esta fase.</li></ul><p className="mt-4 text-sm leading-relaxed text-stone-700">Recibirás avisos solo cuando haya información relevante para tu zona o cultivo; no enviamos mensajes diarios si no son necesarios.</p><div className="mt-5"><CtaWhatsapp /></div></div>
       <a href="#zona" className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl border-2 border-earth-700 bg-white px-5 py-3 text-base font-bold text-earth-900 md:mt-0">Elegir mi zona</a>
    </section>

    <section id="zona" className="scroll-mt-24 rounded-2xl border-2 border-olive-700 bg-white p-5 shadow-sm">
      <p className="text-[15px] font-bold uppercase tracking-wide text-olive-700">Primero, tu ubicación</p><h2 className="mt-1 text-xl font-extrabold text-stone-950">¿En qué municipio está tu explotación?</h2><p className="mt-1 text-base text-stone-700">Así podremos orientarte con datos de tu zona.</p>
      <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => void cargarMunicipios("altiplano")} className={`min-h-[52px] rounded-xl border-2 px-3 text-[15px] font-bold ${zona === "altiplano" ? "border-olive-800 bg-olive-800 text-white" : "border-stone-300"}`}>Altiplano</button><button type="button" onClick={() => void cargarMunicipios("costa")} className={`min-h-[52px] rounded-xl border-2 px-3 text-[15px] font-bold ${zona === "costa" ? "border-olive-800 bg-olive-800 text-white" : "border-stone-300"}`}>Costa Tropical</button></div>
      <label htmlFor="municipio-home" className="mt-4 block text-base font-bold text-stone-900">Buscar municipio</label><div className="mt-1 flex gap-2"><input id="municipio-home" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void cargarMunicipios(); }} autoComplete="address-level2" className="min-h-[52px] min-w-0 flex-1 rounded-xl border-2 border-stone-300 px-4 text-base" placeholder="Ej. Baza o Motril"/><button type="button" onClick={() => void cargarMunicipios()} disabled={cargando} className="min-h-[52px] rounded-xl bg-olive-800 px-4 text-base font-bold text-white">{cargando ? "…" : "Buscar"}</button></div>
      {municipios.length ? <ul className="mt-3 divide-y divide-stone-200 rounded-xl border-2 border-stone-200">{municipios.slice(0,8).map((m) => <li key={`${m.name}-${m.latitude}`}><button type="button" onClick={() => elegir(m)} className="min-h-[52px] w-full px-4 text-left text-base font-semibold">{m.name} · <span className="text-stone-600">{m.province}</span></button></li>)}</ul> : null}
      {ubicacion ? <p role="status" className="mt-3 rounded-xl bg-brand-50 p-3 text-base font-bold text-brand-900">Ubicación elegida: {ubicacion.nombre}</p> : null}{error ? <p role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-[15px] font-semibold text-red-800">{error}</p> : null}
    </section>

    {ubicacion ? <div className="grid gap-5 lg:grid-cols-2">
      <MeteoZona key={`${ubicacion.lat}-${ubicacion.lon}`} ubicacion={ubicacion} />
      <AvisosOficialesAemet key={`aemet-${ubicacion.lat}-${ubicacion.lon}`} ubicacion={ubicacion} />
    </div> : null}

    {ubicacion?.province ? <section className="rounded-2xl border-2 border-earth-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-xl font-extrabold text-stone-950">Avisos fitosanitarios de {ubicacion.province}</h2><span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Gratis, sin registro</span></div>
      <div className="mt-3"><ListaAvisosFitosanitarios key={ubicacion.province} province={ubicacion.province} limite={3} /></div>
      <Link href="/fitosanitario" className="mt-3 inline-flex min-h-[44px] items-center font-bold text-olive-800 underline">Ver todos los avisos fitosanitarios</Link>
    </section> : null}

    <section className="rounded-2xl bg-olive-900 p-5 text-white">
      <h2 className="text-xl font-extrabold">Avisos de tu cultivo por WhatsApp</h2>
      <p className="mt-1 text-base text-wheat-100">Dinos qué cultivas y te avisamos gratis cuando haya riesgo de helada, calor o plagas.</p>
      <label htmlFor="cultivo-home" className="mt-4 block text-base font-bold text-wheat-100">Tu cultivo</label>
     <select id="cultivo-home" value={cultivo} onChange={(e) => { const v = e.target.value as CulturaId | ""; setCultivo(v); try { localStorage.setItem("tecrural:cultivo", v ? catalogoCultivos[v].nombre : ""); window.dispatchEvent(new Event("tecrural:datos-actualizados")); } catch {} if (v) registrarEventoEmbudo("crop_selected", { cultivo: v, municipio: ubicacion?.nombre ?? null }); }} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-wheat-100 bg-white px-4 text-base font-semibold text-stone-900">
        <option value="">Elige tu cultivo</option>
        {idsCultivos.map((id) => <option key={id} value={id}>{catalogoCultivos[id].nombre}</option>)}
      </select>
       {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => registrarEventoEmbudo("click_whatsapp", { origen: "home", municipio: ubicacion?.nombre ?? null, cultivo: cultivo || null })} className="mt-4 inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-lg font-black text-white hover:bg-emerald-700" aria-label="Recibe avisos gratis por WhatsApp sobre mi cultivo">Recibe avisos gratis por WhatsApp</a> : <a href="#contacto" className="mt-4 inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-wheat-100 px-5 py-3 text-lg font-black text-olive-950">Recibe avisos gratis por WhatsApp</a>}
      <p className="mt-2 text-[12px] leading-relaxed text-wheat-100">Sin compromiso. Solo te avisamos de lo importante para tu cultivo.</p>
    </section>

    <section><h2 className="text-xl font-extrabold text-stone-950">Ayuda práctica para tu explotación</h2><div className="mt-3 grid gap-3 md:grid-cols-3">{servicios.map((s) => <article key={s.titulo} className="rounded-2xl border-2 border-earth-200 bg-white p-4"><h3 className="text-lg font-extrabold text-stone-950">{s.titulo}</h3><p className="mt-1 text-[15px] leading-relaxed text-stone-700">{s.texto}</p><Link href={s.href} className="mt-3 inline-flex min-h-[44px] items-center font-bold text-olive-800 underline">Ver cómo ayuda</Link></article>)}</div></section>
  </div>;
}
