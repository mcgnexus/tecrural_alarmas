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

const MUNICIPIOS_CERCANOS: Municipio[] = [
  { name: "Huéscar", province: "Granada", region: "Altiplano de Granada", latitude: 37.8106, longitude: -2.5412, aemetMunicipio: "18098" },
  { name: "Baza", province: "Granada", region: "Altiplano de Granada", latitude: 37.4897, longitude: -2.7735, aemetMunicipio: "18023" },
  { name: "Puebla de Don Fadrique", province: "Granada", region: "Altiplano de Granada", latitude: 37.9587, longitude: -2.4354, aemetMunicipio: "18164" },
  { name: "Castril", province: "Granada", region: "Altiplano de Granada", latitude: 37.7969, longitude: -2.9415, aemetMunicipio: "18046" },
  { name: "Orce", province: "Granada", region: "Altiplano de Granada", latitude: 37.6425, longitude: -2.4788, aemetMunicipio: "18145" },
  { name: "Galera", province: "Granada", region: "Altiplano de Granada", latitude: 37.6833, longitude: -2.55, aemetMunicipio: "18077" },
  { name: "Cúllar", province: "Granada", region: "Altiplano de Granada", latitude: 37.5833, longitude: -2.4744, aemetMunicipio: "18057" },
  { name: "Almuñécar", province: "Granada", region: "Costa Tropical", latitude: 36.7352, longitude: -3.6916, aemetMunicipio: "18017" },
  { name: "La Herradura", province: "Granada", region: "Costa Tropical", latitude: 36.6206, longitude: -3.7348, aemetMunicipio: "18017" },
  { name: "Salobreña", province: "Granada", region: "Costa Tropical", latitude: 36.7447, longitude: -3.5849, aemetMunicipio: "18173" },
  { name: "Motril", province: "Granada", region: "Costa Tropical", latitude: 36.7448, longitude: -3.3426, aemetMunicipio: "18140" },
];

function municipioMasCercano(lat: number, lon: number): Municipio {
  let mejor = MUNICIPIOS_CERCANOS[0];
  let dMin = Infinity;
  for (const m of MUNICIPIOS_CERCANOS) {
    const d = (lat - m.latitude) ** 2 + (lon - m.longitude) ** 2;
    if (d < dMin) { dMin = d; mejor = m; }
  }
  return mejor;
}

export function HomeSinRegistro() {
  const [zona, setZona] = useState<"altiplano" | "costa" | null>(null);
  const [query, setQuery] = useState("");
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [cultivo, setCultivo] = useState<CulturaId | "">("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geolocalizando, setGeolocalizando] = useState(false);

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

  function usarMiUbicacion() {
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no permite compartir ubicación. Usa la búsqueda por nombre.");
      return;
    }
    setGeolocalizando(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const cercano = municipioMasCercano(latitude, longitude);
        elegir(cercano);
        setGeolocalizando(false);
        if (accuracy != null && accuracy > 5000) {
          setError("Ubicación poco precisa (varios km). Hemos seleccionado el municipio más cercano; corrígelo arriba si no es el tuyo. Recuerda: la previsión es municipal, no una medición de tu parcela.");
        } else {
          setError(null);
        }
        registrarEventoEmbudo("geolocation_used", { municipio: cercano.name, accuracy: accuracy ?? null });
      },
      (err) => {
        setGeolocalizando(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("No has concedido permiso de ubicación. Puedes seguir buscando el municipio por nombre.");
        } else if (err.code === err.TIMEOUT) {
          setError("No pudimos obtener tu ubicación a tiempo. Inténtalo de nuevo o busca por nombre.");
        } else {
          setError("No pudimos obtener tu ubicación. Usa la búsqueda manual por nombre.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
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
        <div className="mt-1 flex gap-2"><input id="municipio-home" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void cargarMunicipios(); }} autoComplete="address-level2" className="min-h-[52px] min-w-0 flex-1 rounded-xl border-2 border-stone-300 px-4 text-base" placeholder="Ej. Huéscar, Baza o Motril"/><button type="button" onClick={() => void cargarMunicipios()} disabled={cargando || geolocalizando} className="min-h-[52px] rounded-xl bg-olive-800 px-4 text-base font-bold text-white">{cargando ? "Buscando…" : "Buscar"}</button></div>
        <button type="button" onClick={usarMiUbicacion} disabled={cargando || geolocalizando} className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border-2 border-stone-300 bg-white px-4 text-[15px] font-bold text-stone-800 hover:bg-stone-50 disabled:opacity-60">
          <span aria-hidden="true">📍</span> {geolocalizando ? "Localizando…" : "Usar mi ubicación"}
        </button>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">Voluntario y solo si lo permites. Usamos tu ubicación para seleccionar el municipio más cercano. La previsión es municipal (AEMET/Open-Meteo por municipio), no una medición de tu parcela. Si no concedes permiso o la ubicación es poco precisa, sigue con la búsqueda manual.</p>
        {geolocalizando ? <p role="status" aria-live="polite" className="mt-2 text-sm font-semibold text-olive-900">Obteniendo tu ubicación… La usaremos solo para elegir el municipio más cercano.</p> : null}
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

      <a href={ubicacion ? "#prevision" : "#zona"} onClick={() => registrarEventoEmbudo("lead_started", { origen: "cta_principal" })} className="mt-6 inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-brand-800 px-5 py-3 text-lg font-black text-white hover:bg-brand-900">
        Ver tiempo y riesgos
      </a>
      <p className="mt-2 text-center text-sm text-stone-600">Gratis, sin registro. Primero elige tu municipio.</p>
    </section>

    {/* BLOQUE 2: consulta meteorológica (solo tras municipio) */}
    {ubicacion ? <section id="prevision" className="scroll-mt-24 flex flex-col gap-3">
      <h2 className="text-xl font-extrabold text-stone-950">Tiempo de tu zona</h2>
      <MeteoZona key={`${ubicacion.lat}-${ubicacion.lon}`} ubicacion={ubicacion} />
    </section> : null}

    {/* BLOQUE 3: explicación valor agrícola */}
    {ubicacion ? <BloqueValorAgricola key={`${ubicacion.lat}-${ubicacion.lon}-${cultivo}`} ubicacion={ubicacion} cultivo={cultivo || undefined} /> : null}

    {/* CTA intercalada: activar avisos solo tras ver previsión */}
    <section aria-label="Activar avisos" className="flex flex-col gap-2">
      {ubicacion ? (
        <>
          <a href="#captacion" onClick={() => registrarEventoEmbudo("lead_started", { origen: "cta_post_prevision" })} className="inline-flex min-h-[56px] w-full items-center justify-center rounded-xl bg-brand-800 px-5 py-3 text-lg font-black text-white hover:bg-brand-900">
            Activar avisos gratis
          </a>
          <p className="text-center text-sm text-stone-600">Para {ubicacion.nombre} · Solo si hay riesgo relevante</p>
        </>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-4 text-center">
          <p className="text-sm font-semibold text-stone-700">Elige tu municipio arriba para activar avisos gratuitos</p>
          <a href="#zona" className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-stone-300 bg-white px-4 text-sm font-bold text-stone-800">Elegir municipio</a>
        </div>
      )}
    </section>

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
        <li>Consultas el tiempo y el resumen agrícola para 5 días.</li>
        <li>Si te interesa, activas los avisos gratuitos en el formulario.</li>
      </ol>
      <details className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm leading-relaxed text-stone-700">
        <summary className="cursor-pointer font-bold text-stone-800">Detalles</summary>
        <ul className="mt-2 grid gap-2">
          <li>• Fuentes: AEMET y Open-Meteo.</li>
          <li>• Datos actualizados cada hora. Fecha visible en el bloque de tiempo.</li>
          <li>• Información orientativa: no sustituye a AEMET ni a un técnico.</li>
          <li>• Sin mensajes innecesarios.</li>
        </ul>
        <p className="mt-2 text-sm">Consulta la <Link href="/privacidad" className="font-bold text-brand-800 underline">política de privacidad</Link>. Para darte de baja, escribe a mcgtecrural@gmail.com.</p>
      </details>
      <a href="#captacion" className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-brand-800 px-5 py-3 text-base font-bold text-white">Recibir avisos de mi zona</a>
    </section>
  </div>;
}
