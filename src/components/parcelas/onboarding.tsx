"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { asegurarSesionDispositivo, obtenerDispositivoId } from "@/lib/datos/dispositivo";
import { registrarEventoEmbudo } from "@/lib/analitica";

const CULTIVOS = Object.keys(catalogoCultivos) as CulturaId[];

type Municipio = { name: string; province: string; latitude: number; longitude: number; aemetMunicipio?: string };

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [lat, setLat] = useState<string>("");
  const [lon, setLon] = useState<string>("");
  const [ubicacionNombre, setUbicacionNombre] = useState<string>("");
  const [modoMapa, setModoMapa] = useState(false);
  const [query, setQuery] = useState("");
  const [zona, setZona] = useState<"altiplano" | "costa" | null>(null);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [localizando, setLocalizando] = useState(false);
  const [cultivo, setCultivo] = useState<CulturaId | null>(null);
  const [nombre, setNombre] = useState("");
  const [privacidad, setPrivacidad] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ubicacionOk = lat !== "" && lon !== "" && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));

  function usarGPS() {
    if (!("geolocation" in navigator)) {
      setError("Tu navegador no permite ubicación.");
      return;
    }
    setLocalizando(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(6));
        setLon(p.coords.longitude.toFixed(6));
        setUbicacionNombre(`${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`);
        setLocalizando(false);
      },
      () => {
        setLocalizando(false);
        setError("No pudimos obtener tu ubicación. Prueba mapa o municipio.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  async function cargarZona(z: "altiplano" | "costa") {
    setZona(z);
    setBuscando(true);
    setError(null);
    try {
      const r = await fetch(`/api/v1/locations/search?zona=${z}`);
      if (!r.ok) throw new Error();
      const datos = (await r.json()) as Municipio[];
      setMunicipios(datos);
    } catch {
      setError("No se pudo cargar municipios.");
    } finally {
      setBuscando(false);
    }
  }

  async function buscarMunicipio() {
    if (query.trim().length < 2) {
      setError("Escribe al menos 2 letras.");
      return;
    }
    setBuscando(true);
    setError(null);
    try {
      const url = zona ? `/api/v1/locations/search?q=${encodeURIComponent(query.trim())}&zona=${zona}` : `/api/v1/locations/search?q=${encodeURIComponent(query.trim())}`;
      const r = await fetch(url);
      if (!r.ok) throw new Error();
      const datos = (await r.json()) as Municipio[];
      setMunicipios(datos);
      if (datos.length === 0) setError("Sin resultados.");
    } catch {
      setError("No se pudo buscar.");
    } finally {
      setBuscando(false);
    }
  }

  function elegirMunicipio(m: Municipio) {
    registrarEventoEmbudo("municipality_selected", { municipio: m.name, origen: "onboarding" });
    setLat(String(m.latitude));
    setLon(String(m.longitude));
    setUbicacionNombre(`${m.name}, ${m.province}`);
    setMunicipios([]);
    setQuery("");
  }

  async function guardar() {
    if (!ubicacionOk || !cultivo || !nombre.trim()) {
      setError("Completa ubicación, cultivo y nombre.");
      return;
    }
    if (!privacidad) {
      setError("Debes aceptar la política de privacidad para continuar.");
      return;
    }
    await asegurarSesionDispositivo();
    setGuardando(true);
    setError(null);
    try {
      const resp = await fetch("/api/parcelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispositivoId: obtenerDispositivoId(),
          nombre: nombre.trim(),
          cultivo,
          latitud: Number(lat),
          longitud: Number(lon),
        }),
      });
      if (!resp.ok) throw new Error();
      onComplete();
      router.push("/alertas");
    } catch {
      setError("No se pudo guardar. Revisa la conexión.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex flex-1 items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${paso >= n ? "bg-brand-800 text-white" : "bg-stone-200 text-stone-600"}`}>{n}</div>
            {n < 3 ? <div className={`h-1 flex-1 rounded ${paso > n ? "bg-brand-800" : "bg-stone-200"}`} /> : null}
          </div>
        ))}
      </div>
      <p className="text-center text-sm font-semibold text-stone-600">Paso {paso} de 3</p>

      {paso === 1 ? (
        <section className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-stone-900">¿Dónde está tu parcela?</h2>
          <p className="mt-1 text-base text-stone-700">Elige cómo ubicarla. Sin teléfono.</p>

          <div className="mt-4 grid gap-3">
            <button
              type="button"
              onClick={usarGPS}
              disabled={localizando}
              className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl bg-brand-800 px-5 py-4 text-base font-bold text-white hover:bg-brand-900 disabled:opacity-60"
            >
              Gps: {localizando ? "Localizando…" : "GPS — Usar mi ubicación"}
            </button>

            <button
              type="button"
              onClick={() => setModoMapa((v) => !v)}
              className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border-2 border-stone-900 bg-white px-5 py-4 text-base font-bold text-stone-900 hover:bg-stone-50"
            >
              Mapa: Mapa — Elegir en mapa
            </button>
            {modoMapa ? (
              <div className="rounded-xl border-2 border-stone-200 p-3">
                <p className="text-sm font-medium text-stone-700">Mueve el mapa tocando lat/lon o usa los campos:</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Lat 37.39" inputMode="decimal" className="min-h-[48px] rounded-xl border-2 border-stone-300 px-4 py-3 text-base font-medium" />
                  <input value={lon} onChange={(e) => setLon(e.target.value)} placeholder="Lon -2.78" inputMode="decimal" className="min-h-[48px] rounded-xl border-2 border-stone-300 px-4 py-3 text-base font-medium" />
                </div>
                <div className="mt-2 flex h-24 items-center justify-center rounded-xl bg-stone-100 text-sm font-medium text-stone-600">Mapa interactivo (usa los campos)</div>
              </div>
            ) : null}

            <div className="rounded-2xl border-2 border-stone-200 p-4">
              <p className="text-sm font-bold text-stone-900">Municipio</p>
              <p className="mb-2 text-xs font-medium text-stone-600">Elige zona primero</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => cargarZona("altiplano")} className={`min-h-[48px] rounded-xl border-2 px-3 py-2 text-sm font-bold ${zona === "altiplano" ? "border-brand-800 bg-brand-800 text-white" : "border-stone-300 bg-white"}`}>Altiplano</button>
                <button type="button" onClick={() => cargarZona("costa")} className={`min-h-[48px] rounded-xl border-2 px-3 py-2 text-sm font-bold ${zona === "costa" ? "border-brand-800 bg-brand-800 text-white" : "border-stone-300 bg-white"}`}>Costa Tropical</button>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") buscarMunicipio(); }}
                  placeholder="Ej. Baza"
                  className="min-h-[48px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base font-medium"
                />
                <button type="button" onClick={buscarMunicipio} disabled={buscando} className="min-h-[48px] shrink-0 rounded-xl border-2 border-stone-900 bg-white px-4 py-3 text-base font-bold">
                  {buscando ? "…" : "Buscar"}
                </button>
              </div>
              {municipios.length > 0 ? (
                <ul className="mt-2 divide-y divide-stone-200 rounded-xl border-2 border-stone-200">
                  {municipios.map((m) => (
                    <li key={`${m.name}-${m.latitude}`}>
                      <button type="button" onClick={() => elegirMunicipio(m)} className="flex min-h-[48px] w-full items-center justify-between px-4 py-3 text-left hover:bg-stone-50">
                        <span className="text-base font-semibold">{m.name} <span className="text-sm text-stone-600">· {m.province}</span></span>
                        <span>→</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {ubicacionOk ? <p className="rounded-xl border-2 border-brand-200 bg-brand-50 px-4 py-3 text-base font-semibold text-brand-900">Ubicación: {ubicacionNombre || `${lat}, ${lon}`}</p> : null}
            {error ? <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}

            <button
              type="button"
              onClick={() => setPaso(2)}
              disabled={!ubicacionOk}
              className="mt-2 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-brand-800 px-5 py-3.5 text-base font-bold text-white hover:bg-brand-900 disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        </section>
      ) : null}

      {paso === 2 ? (
        <section className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-stone-900">¿Qué cultivas?</h2>
          <p className="mt-1 text-base text-stone-700">Toca una tarjeta.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {CULTIVOS.map((id) => {
              const c = catalogoCultivos[id];
              const activo = cultivo === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCultivo(id)}
                  className={`flex min-h-[96px] flex-col items-center justify-center gap-1 rounded-2xl border-2 p-4 text-center ${activo ? "border-brand-800 bg-brand-50" : "border-stone-200 bg-white hover:bg-stone-50"}`}
                >
                  <span className="text-base font-bold text-stone-900">{c.nombre}</span>
                </button>
              );
            })}
          </div>
          {error ? <p role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setPaso(1)} className="min-h-[48px] flex-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-3 text-base font-bold">← Atrás</button>
            <button type="button" onClick={() => { if (!cultivo) setError("Elige un cultivo."); else setPaso(3); }} className="min-h-[48px] flex-1 rounded-xl bg-brand-800 px-4 py-3 text-base font-bold text-white disabled:opacity-50">Siguiente →</button>
          </div>
        </section>
      ) : null}

      {paso === 3 ? (
        <section className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-extrabold text-stone-900">Ponle un nombre</h2>
          <p className="mt-1 text-base text-stone-700">Ejemplo:</p>
          <p className="text-base font-semibold italic text-stone-600">Almendros Los Llanos</p>
          <label className="mt-4 block text-sm font-bold text-stone-900">Nombre de la parcela</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Almendros Los Llanos"
            className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-stone-300 px-4 py-3.5 text-base font-medium text-stone-900 placeholder:text-stone-500"
          />

          <div className="mt-4 rounded-xl border-2 border-stone-900 bg-stone-50 p-4">
            <p className="text-sm font-bold text-stone-900">Privacidad — consentimiento explícito</p>
            <p className="mt-1 text-sm leading-snug text-stone-700">
              Usamos tus datos solo para alertas. Ver <a href="/privacidad" target="_blank" className="font-semibold text-brand-800 underline">política de privacidad</a> (finalidad clara, minimización).
            </p>
            <label className="mt-3 flex items-start gap-3 rounded-xl border-2 border-stone-300 bg-white p-3">
              <input type="checkbox" checked={privacidad} onChange={(e) => setPrivacidad(e.target.checked)} className="mt-1 h-5 w-5" />
              <span className="text-sm font-medium text-stone-900">
                Acepto la política de privacidad. <span className="font-bold">Obligatorio</span>
              </span>
            </label>
            <label className="mt-2 flex items-start gap-3 rounded-xl border-2 border-stone-200 bg-white p-3">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-1 h-5 w-5" />
              <span className="text-sm font-medium text-stone-900">
                Acepto comunicaciones comerciales. <span className="text-stone-600">Opcional, separado</span> — activar alerta no equivale a publicidad.
              </span>
            </label>
            <p className="mt-2 text-xs text-stone-500">Guardamos consent_version y consent_timestamp. RGPD/LOPDGDD pendiente de validación legal.</p>
          </div>

          {error ? <p role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => setPaso(2)} className="min-h-[48px] flex-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-3 text-base font-bold">← Atrás</button>
            <button type="button" onClick={guardar} disabled={guardando} className="min-h-[52px] flex-1 rounded-xl bg-brand-800 px-5 py-3.5 text-base font-bold text-white hover:bg-brand-900 disabled:opacity-60">
              {guardando ? "Guardando…" : "Ver mis alertas"}
            </button>
          </div>
          <p className="mt-3 text-center text-sm text-stone-600">Sin teléfono. Lo pedirás solo si activas avisos.</p>
        </section>
      ) : null}
    </div>
  );
}
