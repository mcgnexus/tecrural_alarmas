"use client";

import { useState } from "react";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { asegurarSesionDispositivo, obtenerDispositivoId } from "@/lib/datos/dispositivo";

const ids = Object.keys(catalogoCultivos) as CulturaId[];

export function RegistroParcela({
  onGuardada,
}: {
  onGuardada: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [cultivos, setCultivos] = useState<CulturaId[]>(["almendro"]);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [localizando, setLocalizando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function usarUbicacion() {
    if (!("geolocation" in navigator)) {
      setError("Geolocalización no disponible en este navegador.");
      return;
    }
    setLocalizando(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(6));
        setLon(p.coords.longitude.toFixed(6));
        setLocalizando(false);
      },
      () => {
        setLocalizando(false);
        setError("No pudimos obtener tu ubicación. Entra las coordenadas a mano.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  async function guardar() {
    await asegurarSesionDispositivo();
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (!nombre.trim()) {
      setError("Pon un nombre a la parcela.");
      return;
    }
    if (cultivos.length === 0) {
      setError("Selecciona al menos un cultivo.");
      return;
    }
    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      setError("Latitud no válida.");
      return;
    }
    if (!Number.isFinite(lonNum) || lonNum < -180 || lonNum > 180) {
      setError("Longitud no válida.");
      return;
    }
    setCargando(true);
    setError(null);
    try {
      for (const cultivo of cultivos) {
        const resp = await fetch("/api/parcelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispositivoId: obtenerDispositivoId(),
          nombre: nombre.trim(),
          cultivo,
          latitud: latNum,
          longitud: lonNum,
        }),
        });
        if (!resp.ok) throw new Error();
      }
      setNombre("");
      setLat("");
      setLon("");
      onGuardada();
    } catch {
      setError("No se pudo guardar. Revisa la conexión e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const claseLabel = "mb-1.5 block text-sm font-semibold text-stone-800";
  const claseCampo =
    "w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3.5 text-base font-medium text-stone-900 placeholder:text-stone-500 focus:border-brand-700 disabled:bg-stone-50";

  return (
    <section className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-stone-900">Nueva parcela</h2>
      <p className="mt-1 text-base leading-snug text-stone-700">
        Guardada en la nube, sin registro.
      </p>

      <div className="mt-3 grid gap-3">
        <div>
          <label className={claseLabel}>Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="P. ej. La Vega Norte"
            disabled={cargando}
            className={claseCampo}
          />
        </div>
        <div>
          <label className={claseLabel}>Cultivos</label>
          <div className="grid grid-cols-2 gap-2 rounded-xl border-2 border-stone-300 p-3">
            {ids.map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm font-medium text-stone-800">
                <input type="checkbox" checked={cultivos.includes(id)} onChange={() => setCultivos((actuales) => actuales.includes(id) ? actuales.filter((actual) => actual !== id) : [...actuales, id])} disabled={cargando} className="h-5 w-5" />
                {catalogoCultivos[id].nombre}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={claseLabel}>Latitud</label>
            <input
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="37.39…"
              disabled={cargando}
              className={claseCampo}
            />
          </div>
          <div>
            <label className={claseLabel}>Longitud</label>
            <input
              inputMode="decimal"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="-2.78…"
              disabled={cargando}
              className={claseCampo}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={usarUbicacion}
          disabled={localizando || cargando}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-stone-900 bg-white px-4 py-3 text-base font-semibold text-stone-900 hover:bg-stone-50 active:bg-stone-100 disabled:opacity-60"
        >
          Ubicación: {localizando ? "Localizando…" : "Usar mi ubicación actual"}
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={cargando}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 py-3.5 text-base font-bold text-white shadow-sm hover:bg-brand-900 active:bg-brand-950 disabled:opacity-70"
        >
          <span aria-hidden="true">✓</span> {cargando ? "Guardando…" : "Guardar parcela"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>
      ) : null}
    </section>
  );
}
