"use client";

import { useState } from "react";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { obtenerDispositivoId } from "@/lib/datos/dispositivo";

const ids = Object.keys(catalogoCultivos) as CulturaId[];

export function RegistroParcela({
  onGuardada,
}: {
  onGuardada: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [cultivo, setCultivo] = useState<CulturaId>("almendro");
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
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (!nombre.trim()) {
      setError("Pon un nombre a la parcela.");
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

  const claseLabel = "mb-1 block text-xs font-medium text-stone-500";
  const claseCampo =
    "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 disabled:bg-stone-50";

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-stone-800">Nueva parcela</h2>
      <p className="mt-1 text-[13px] text-stone-500">
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
          <label className={claseLabel}>Cultivo</label>
          <select
            value={cultivo}
            onChange={(e) => setCultivo(e.target.value as CulturaId)}
            disabled={cargando}
            className={claseCampo}
          >
            {ids.map((id) => (
              <option key={id} value={id}>
                {catalogoCultivos[id].nombre}
              </option>
            ))}
          </select>
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
          className="rounded-xl border border-brand-700 px-4 py-2 text-[13px] font-medium text-brand-800 disabled:opacity-60"
        >
          {localizando ? "Localizando…" : "Usar mi ubicación actual"}
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={cargando}
          className="rounded-xl bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
        >
          {cargando ? "Guardando…" : "Guardar parcela"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>
      ) : null}
    </section>
  );
}