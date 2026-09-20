"use client";

import { useEffect, useState } from "react";

type Ubicacion = { lat: number; lon: number; nombre: string; aemetMunicipio?: string };

type Hora = {
  timestamp: string;
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  relativeHumidityPct: number | null;
  precipitationMm: number | null;
  precipitationProbabilityPct: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
};

function numero(valor: number | null | undefined, unidad: string, decimales = 0): string {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return "—";
  return `${valor.toFixed(decimales)}${unidad}`;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-wheat-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">{etiqueta}</p>
      <p className="mt-0.5 text-lg font-extrabold text-stone-950">{valor}</p>
    </div>
  );
}

export function MeteoZona({ ubicacion }: { ubicacion: Ubicacion }) {
  const [actual, setActual] = useState<Hora | null>(null);
  const [minima, setMinima] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    const qs = new URLSearchParams({ lat: String(ubicacion.lat), lon: String(ubicacion.lon) });
    if (ubicacion.aemetMunicipio) qs.set("aemetMunicipio", ubicacion.aemetMunicipio);
    const q = qs.toString();

    const pedirActual = fetch(`/api/v1/weather/current?${q}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Hora>) : null))
      .catch(() => null);
    const pedirPrevision = fetch(`/api/v1/weather/forecast?${q}&hours=24`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Hora[]>) : null))
      .catch(() => null);

    Promise.all([pedirActual, pedirPrevision])
      .then(([hoy, horas]) => {
        if (!activo) return;
        if (!hoy && !horas) { setError("No pudimos cargar el tiempo de tu zona. Inténtalo de nuevo."); return; }
        setActual(hoy);
        if (Array.isArray(horas) && horas.length) {
          const temps = horas
            .map((h) => h.temperatureC)
            .filter((t): t is number => typeof t === "number" && Number.isFinite(t));
          setMinima(temps.length ? Math.min(...temps) : null);
        }
      })
      .catch(() => { if (activo) setError("No pudimos cargar el tiempo de tu zona. Inténtalo de nuevo."); })
      .finally(() => { if (activo) setCargando(false); });

    return () => { activo = false; };
  }, [ubicacion]);

  const hayHelada = minima !== null && minima <= 0;
  const riesgoHelada = minima !== null && minima <= 2;

  return (
    <section className="rounded-2xl border-2 border-sky-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-extrabold text-stone-950">El tiempo en {ubicacion.nombre}</h2>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Gratis, sin registro</span>
      </div>

      {error ? <p role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-[15px] font-semibold text-red-800">{error}</p> : null}

      {cargando ? <p className="mt-3 text-[15px] text-stone-600">Cargando el tiempo de tu zona…</p> : null}

      {!cargando && actual ? (
        <>
          <div className="mt-3 flex items-end gap-4">
            <p className="text-[42px] font-black leading-none text-stone-950">{numero(actual.temperatureC, " °C", 0)}</p>
            <div className="pb-1">
              <p className="text-[15px] font-bold text-stone-700">Sensación {numero(actual.apparentTemperatureC, " °C", 0)}</p>
              <p className="text-[13px] text-stone-500">Humedad {numero(actual.relativeHumidityPct, " %", 0)}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
            <Dato etiqueta="Viento" valor={numero(actual.windSpeedKmh, " km/h")} />
            <Dato etiqueta="Rachas" valor={numero(actual.windGustKmh, " km/h")} />
            <Dato etiqueta="Lluvia 1 h" valor={numero(actual.precipitationMm, " mm", 1)} />
            <Dato etiqueta="Prob. lluvia" valor={numero(actual.precipitationProbabilityPct, " %")} />
            <Dato etiqueta="Mín. 24 h" valor={numero(minima, " °C", 1)} />
            <Dato etiqueta="Actualizado" valor={actual.timestamp ? new Date(actual.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—"} />
          </div>

          {riesgoHelada ? (
            <div className={`mt-4 rounded-xl border-2 p-4 ${hayHelada ? "border-blue-300 bg-blue-50" : "border-amber-300 bg-amber-50"}`}>
              <p className={`text-[15px] font-extrabold ${hayHelada ? "text-blue-900" : "text-amber-900"}`}>
                {hayHelada ? `Helada probable: mínima prevista ${numero(minima, " °C", 1)}` : `Vigila el frío: mínima prevista ${numero(minima, " °C", 1)}`}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-stone-700">Protege los cultivos sensibles durante la madrugada. Es una estimación orientativa, no un aviso oficial.</p>
            </div>
          ) : minima !== null ? (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-[14px] font-semibold text-emerald-900">Sin riesgo de helada en las próximas 24 h (mínima {numero(minima, " °C", 1)}).</p>
          ) : null}
        </>
      ) : null}

      <p className="mt-3 text-[12px] leading-relaxed text-stone-500">Datos de previsión horaria. TecRural no sustituye a AEMET, RAIF ni a un técnico agrícola.</p>
    </section>
  );
}
