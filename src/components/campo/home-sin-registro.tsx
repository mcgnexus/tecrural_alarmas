"use client";

import Link from "next/link";
import { useState } from "react";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import type { Alerta } from "@/lib/dominio/tipos";
import { CtaPrincipal } from "./cta-principal";
import { esDatosCaducados, haceMinutos } from "@/lib/dominio/frescura";

type Ubicacion = { lat: number; lon: number; nombre: string };
type Municipio = { name: string; province: string; region: string; latitude: number; longitude: number };

const CULTIVOS = Object.keys(catalogoCultivos) as CulturaId[];

const RIESGOS_ORDEN: { key: string; etiqueta: string }[] = [
  { key: "helada", etiqueta: "Helada" },
  { key: "golpe-de-calor", etiqueta: "Calor" },
  { key: "lluvia", etiqueta: "Lluvia" },
  { key: "tormenta", etiqueta: "Tormenta" },
  { key: "viento", etiqueta: "Viento" },
];

function nivelColor(severidad?: string): { bg: string; dot: string; label: string } {
  switch (severidad) {
    case "critica": return { bg: "bg-red-100 border-red-300", dot: "🔴", label: "Rojo" };
    case "alerta": return { bg: "bg-amber-100 border-amber-300", dot: "🟠", label: "Naranja" };
    case "aviso": return { bg: "bg-yellow-100 border-yellow-300", dot: "🟡", label: "Amarillo" };
    default: return { bg: "bg-emerald-100 border-emerald-300", dot: "🟢", label: "Verde" };
  }
}

export function HomeSinRegistro() {
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [buscandoGeo, setBuscandoGeo] = useState(false);
  const [query, setQuery] = useState("");
  const [zona, setZona] = useState<"altiplano" | "costa" | null>(null);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [buscandoMun, setBuscandoMun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluando, setEvaluando] = useState(false);
  const [alertas, setAlertas] = useState<Alerta[] | null>(null);
  const [weather, setWeather] = useState<{ temperatura: number | null; maxima: number | null; minima: number | null; precipitacion: number | null; viento: number | null; proveedor: string; actualizado: string } | null>(null);
  const [cultivo, setCultivo] = useState<CulturaId>("almendro");
  const [mostrarCultivo, setMostrarCultivo] = useState(false);

  async function cargarWeather(ubi: Ubicacion) {
    try {
      const r = await fetch(`/api/v1/weather/current?lat=${ubi.lat}&lon=${ubi.lon}`);
      if (!r.ok) return;
      const j = await r.json() as { temperatureC: number | null; provider: string; fetchedAt: string; precipitationMm?: number | null; windSpeedKmh?: number | null };
      // also fetch forecast for max/min
      const rf = await fetch(`/api/v1/weather/forecast?lat=${ubi.lat}&lon=${ubi.lon}&hours=24`);
      let maxima: number | null = null, minima: number | null = null;
      if (rf.ok) {
        const horas = await rf.json() as { temperatureC: number | null }[];
        const temps = (Array.isArray(horas) ? horas : []).map((h) => h.temperatureC).filter((v): v is number => typeof v === "number");
        if (temps.length) { maxima = Math.max(...temps); minima = Math.min(...temps); }
      }
      setWeather({ temperatura: j.temperatureC ?? null, maxima, minima, precipitacion: (j as unknown as { precipitationMm: number | null }).precipitationMm ?? null, viento: (j as unknown as { windSpeedKmh: number | null }).windSpeedKmh ?? null, proveedor: j.provider, actualizado: j.fetchedAt });
    } catch { /* error externo no rompe app — se ignora y se muestra NO_DATA si aplica */ }
  }

  async function evaluarCon(ubi: Ubicacion, cult: CulturaId) {
    setEvaluando(true);
    setError(null);
    try {
      const resp = await fetch("/api/riesgo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitud: ubi.lat, longitud: ubi.lon, cultivo: cult }),
      });
      if (!resp.ok) {
        const j = (await resp.json().catch(() => ({}))) as { code?: string };
        if (j.code === "NO_DATA") throw new Error("NO_DATA");
        throw new Error();
      }
      const datos = await resp.json();
      setAlertas(datos.alertas as Alerta[]);
      cargarWeather(ubi);
    } catch (e) {
      if (e instanceof Error && e.message === "NO_DATA") setError("NO_DATA");
      else setError("No se pudo obtener el riesgo ahora. Inténtalo de nuevo.");
    } finally {
      setEvaluando(false);
    }
  }

  function usarUbicacion() {
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no permite ubicación.");
      return;
    }
    setBuscandoGeo(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const ubi: Ubicacion = { lat: p.coords.latitude, lon: p.coords.longitude, nombre: `${p.coords.latitude.toFixed(3)}, ${p.coords.longitude.toFixed(3)}` };
        setUbicacion(ubi);
        setBuscandoGeo(false);
        evaluarCon(ubi, cultivo);
      },
      () => {
        setBuscandoGeo(false);
        setError("No pudimos obtener tu ubicación. Elige un municipio.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  async function cargarZona(z: "altiplano" | "costa") {
    setZona(z);
    setBuscandoMun(true);
    setError(null);
    try {
      const r = await fetch(`/api/v1/locations/search?zona=${z}`);
      if (!r.ok) throw new Error();
      const datos = (await r.json()) as Municipio[];
      setMunicipios(datos);
    } catch {
      setError("No se pudo cargar municipios de la zona.");
    } finally {
      setBuscandoMun(false);
    }
  }

  async function buscarMunicipio() {
    if (query.trim().length < 2) {
      setError("Escribe al menos 2 letras.");
      return;
    }
    setBuscandoMun(true);
    setError(null);
    try {
      const url = zona ? `/api/v1/locations/search?q=${encodeURIComponent(query.trim())}&zona=${zona}` : `/api/v1/locations/search?q=${encodeURIComponent(query.trim())}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error();
      const datos = (await r.json()) as Municipio[];
      setMunicipios(datos);
      if (datos.length === 0) setError("Sin resultados. Prueba otro nombre.");
    } catch {
      setError("No se pudo buscar municipios.");
    } finally {
      setBuscandoMun(false);
    }
  }

  function elegirMunicipio(m: Municipio) {
    const ubi: Ubicacion = { lat: Number(m.latitude), lon: Number(m.longitude), nombre: `${m.name}, ${m.province}` };
    setUbicacion(ubi);
    setMunicipios([]);
    setQuery("");
    evaluarCon(ubi, cultivo);
  }

  function personalizar() {
    if (!ubicacion) return;
    evaluarCon(ubicacion, cultivo);
    setMostrarCultivo(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border-2 border-stone-900 bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">TecRural Campo</h1>
        <p className="mt-1 text-xl font-bold leading-tight text-stone-800">¿Qué está pasando en tu zona?</p>
        <p className="mt-2 text-base leading-snug text-stone-700">Consulta el riesgo sin crear cuenta. Datos de AEMET y SiAR, explicados para tu campo.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-700">Elige ubicación</h2>
        <button
          type="button"
          onClick={usarUbicacion}
          disabled={buscandoGeo || evaluando}
          className="inline-flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-800 px-5 py-4 text-base font-bold text-white shadow-sm hover:bg-brand-900 active:bg-brand-950 disabled:opacity-60"
        >
          <span aria-hidden="true">📍</span> {buscandoGeo ? "Localizando…" : "Usar mi ubicación"}
        </button>

        <div className="rounded-2xl border-2 border-stone-200 bg-white p-4 shadow-sm">
          <label className="mb-1.5 block text-sm font-bold text-stone-900">Elegir municipio</label>
          <p className="mb-2 text-xs font-medium text-stone-600">Primero elige zona, luego municipio</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => cargarZona("altiplano")} className={`min-h-[56px] rounded-xl border-2 px-3 py-3 text-sm font-bold ${zona === "altiplano" ? "border-brand-800 bg-brand-800 text-white" : "border-stone-300 bg-white text-stone-900"}`}>🏔️ Altiplano de Granada</button>
            <button type="button" onClick={() => cargarZona("costa")} className={`min-h-[56px] rounded-xl border-2 px-3 py-3 text-sm font-bold ${zona === "costa" ? "border-brand-800 bg-brand-800 text-white" : "border-stone-300 bg-white text-stone-900"}`}>🏖️ Costa Tropical</button>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              id="municipio"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") buscarMunicipio(); }}
              placeholder="Ej. Baza, Huéscar…"
              className="min-h-[48px] w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-base font-medium text-stone-900 placeholder:text-stone-500 focus:border-brand-700"
            />
            <button
              type="button"
              onClick={buscarMunicipio}
              disabled={buscandoMun}
              className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-3 text-base font-bold text-stone-900 hover:bg-stone-50 disabled:opacity-50"
            >
              {buscandoMun ? "…" : "🔍 Buscar"}
            </button>
          </div>
          {municipios.length > 0 ? (
            <ul className="mt-3 max-h-56 overflow-auto rounded-xl border-2 border-stone-200 divide-y divide-stone-200">
              {municipios.map((m) => (
                <li key={`${m.name}-${m.latitude}`}>
                  <button
                    type="button"
                    onClick={() => elegirMunicipio(m)}
                    className="flex min-h-[48px] w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-stone-50"
                  >
                    <span className="text-base font-semibold text-stone-900">{m.name} <span className="text-sm font-medium text-stone-600">· {m.province}</span></span>
                    <span aria-hidden="true">→</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {ubicacion ? (
          <p className="rounded-xl border-2 border-brand-200 bg-brand-50 px-4 py-3 text-base font-semibold text-brand-900">
            📍 {ubicacion.nombre}
          </p>
        ) : null}
        {error ? (
          error === "NO_DATA" ? (
            <p role="alert" className="rounded-xl border-2 border-stone-300 bg-stone-100 p-4 text-center text-base font-bold text-stone-700">Datos temporalmente no disponibles — no es “sin riesgo”.</p>
          ) : (
            <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-base font-semibold text-red-800">{error}</p>
          )
        ) : null}
      </section>

      {weather ? (
        <section className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-stone-900">Tiempo en tu zona</h2>
          <p className="mt-1 text-xs font-medium text-stone-600">{haceMinutos(weather.actualizado)} · Proveedor {weather.proveedor} · error externo no rompe app</p>
          {esDatosCaducados(weather.actualizado, 90) ? <p role="alert" className="mt-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-2 text-center text-sm font-bold text-amber-800">⚠ Datos meteorológicos pendientes de actualización</p> : null}
          <div className={`mt-3 grid grid-cols-2 gap-2 text-center ${esDatosCaducados(weather.actualizado, 90) ? "opacity-60" : ""}`}>
            <div className="rounded-xl border-2 border-stone-200 p-3"><p className="text-xs font-bold uppercase text-stone-600">Temperatura</p><p className="text-lg font-extrabold">{weather.temperatura !== null ? `${weather.temperatura}°C` : "—"}</p></div>
            <div className="rounded-xl border-2 border-stone-200 p-3"><p className="text-xs font-bold uppercase text-stone-600">Máxima</p><p className="text-lg font-extrabold">{weather.maxima !== null ? `${weather.maxima}°C` : "—"}</p></div>
            <div className="rounded-xl border-2 border-stone-200 p-3"><p className="text-xs font-bold uppercase text-stone-600">Mínima</p><p className="text-lg font-extrabold">{weather.minima !== null ? `${weather.minima}°C` : "—"}</p></div>
            <div className="rounded-xl border-2 border-stone-200 p-3"><p className="text-xs font-bold uppercase text-stone-600">Precipitación</p><p className="text-lg font-extrabold">{weather.precipitacion !== null ? `${weather.precipitacion} mm` : "—"}</p></div>
            <div className="col-span-2 rounded-xl border-2 border-stone-200 p-3"><p className="text-xs font-bold uppercase text-stone-600">Viento</p><p className="text-lg font-extrabold">{weather.viento !== null ? `${weather.viento} km/h` : "—"}</p></div>
          </div>
        </section>
      ) : null}
      {ubicacion ? (
        <section className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900">Riesgos próximos</h2>
          {evaluando ? (
            <p className="mt-3 text-base font-medium text-stone-700">Evaluando…</p>
          ) : alertas ? (
            <ul className="mt-3 flex flex-col gap-2">
              {RIESGOS_ORDEN.map((r) => {
                const al = alertas.find((a) => a.tipo === r.key);
                const estilo = nivelColor(al?.severidad);
                return (
                  <li key={r.key} className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 ${estilo.bg}`}>
                    <span className="flex items-center gap-2 text-base font-bold text-stone-900">
                      <span aria-hidden="true" className="text-lg">{estilo.dot}</span> {r.etiqueta}
                    </span>
                    <span className="text-sm font-semibold uppercase tracking-wide text-stone-800">{estilo.label}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="mt-4 rounded-xl border-2 border-brand-200 bg-brand-50 p-4">
            <p className="text-base font-bold text-stone-900">¿Quieres afinar la alerta?</p>
            <p className="mt-1 text-sm leading-snug text-stone-700">El cultivo y la fase cambian los umbrales.</p>
            {!mostrarCultivo ? (
              <button
                type="button"
                onClick={() => setMostrarCultivo(true)}
                className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 py-3 text-base font-bold text-white hover:bg-brand-900"
              >
                ➕ Añade tu cultivo para personalizar las alertas
              </button>
            ) : (
              <div className="mt-3 flex flex-col gap-3">
                <label className="text-sm font-bold text-stone-900">Cultivo</label>
                <select
                  value={cultivo}
                  onChange={(e) => setCultivo(e.target.value as CulturaId)}
                  className="min-h-[48px] w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-base font-medium text-stone-900"
                >
                  {CULTIVOS.map((id) => (
                    <option key={id} value={id}>{catalogoCultivos[id].nombre}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={personalizar}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-brand-800 px-5 py-3 text-base font-bold text-white"
                >
                  Actualizar riesgos
                </button>
              </div>
            )}
            <Link href="/parcelas" className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1 text-sm font-semibold text-brand-800 underline underline-offset-4">
              O guarda tu parcela para recibir avisos →
            </Link>
          </div>
          <div className="mt-4">
            <CtaPrincipal ubicacion={ubicacion} />
          </div>
        </section>
      ) : null}
      {!ubicacion ? <CtaPrincipal ubicacion={null} /> : null}
    </div>
  );
}
