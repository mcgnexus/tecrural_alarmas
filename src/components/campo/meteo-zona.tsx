"use client";

import { useEffect, useState } from "react";
import { colorTemperatura, etiquetaTermica } from "@/lib/ui/temperatura";
import { colorHumedad, etiquetaHumedad } from "@/lib/ui/humedad";
import { registrarEventoEmbudo } from "@/lib/analitica";
import { zonaCultivoPorCoordenadas } from "@/lib/cultivos/zona";

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

type DiaExtremos = { clave: string; etiqueta: string; minima: number | null; maxima: number | null; rachaMaxima: number | null };

const DIAS_PREVISION = 5;
const HORAS_PREVISION = DIAS_PREVISION * 24;

function numero(valor: number | null | undefined, unidad: string, decimales = 0): string {
  if (typeof valor !== "number" || !Number.isFinite(valor)) return "—";
  return `${valor.toFixed(decimales)}${unidad}`;
}

function Dato({ etiqueta, valor, claseValor, titulo }: { etiqueta: string; valor: string; claseValor?: string; titulo?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-wheat-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">{etiqueta}</p>
      <p title={titulo} className={`mt-0.5 text-lg font-extrabold ${claseValor ?? "text-stone-950"}`}>{valor}</p>
    </div>
  );
}

/** Agrupa la serie horaria por día natural y resume temperatura y racha máxima. */
function extremosPorDia(horas: Hora[]): DiaExtremos[] {
  const porDia = new Map<string, DiaExtremos>();
  for (const hora of horas) {
    const t = hora.temperatureC;
    const racha = hora.windGustKmh;
    const temperaturaValida = typeof t === "number" && Number.isFinite(t);
    const rachaValida = typeof racha === "number" && Number.isFinite(racha);
    if (!temperaturaValida && !rachaValida) continue;
    const fecha = new Date(hora.timestamp);
    if (Number.isNaN(fecha.getTime())) continue;
    const clave = `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
    const etiqueta = fecha.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit" });
    const actual = porDia.get(clave);
    if (!actual) porDia.set(clave, {
      clave,
      etiqueta,
      minima: temperaturaValida ? t : null,
      maxima: temperaturaValida ? t : null,
      rachaMaxima: rachaValida ? racha : null,
    });
    else {
      if (temperaturaValida && (actual.minima === null || t < actual.minima)) actual.minima = t;
      if (temperaturaValida && (actual.maxima === null || t > actual.maxima)) actual.maxima = t;
      if (rachaValida && (actual.rachaMaxima === null || racha > actual.rachaMaxima)) actual.rachaMaxima = racha;
    }
  }
  return Array.from(porDia.values()).slice(0, DIAS_PREVISION);
}

export function MeteoZona({ ubicacion }: { ubicacion: Ubicacion }) {
  const esCostaTropical = zonaCultivoPorCoordenadas(ubicacion.lat, ubicacion.lon) === "costa";
  const [actual, setActual] = useState<Hora | null>(null);
  const [dias, setDias] = useState<DiaExtremos[]>([]);
  const [minima, setMinima] = useState<number | null>(null);
  const [maxima, setMaxima] = useState<number | null>(null);
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
    const pedirPrevision = fetch(`/api/v1/weather/forecast?${q}&hours=${HORAS_PREVISION}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<Hora[]>) : null))
      .catch(() => null);

    Promise.all([pedirActual, pedirPrevision])
      .then(([hoy, horas]) => {
        if (!activo) return;
        if (!hoy && !horas) { setError("No pudimos cargar el tiempo de tu zona. Inténtalo de nuevo."); return; }
        if (hoy) registrarEventoEmbudo("weather_viewed", { municipio: ubicacion.nombre });
        if (horas && horas.length) registrarEventoEmbudo("forecast_viewed", { municipio: ubicacion.nombre });
        setActual(hoy);
        if (Array.isArray(horas) && horas.length) {
          const porDia = extremosPorDia(horas);
          setDias(porDia);
          const minimas = porDia
            .map((d) => d.minima)
            .filter((t): t is number => typeof t === "number" && Number.isFinite(t));
          const maximas = porDia
            .map((d) => d.maxima)
            .filter((t): t is number => typeof t === "number" && Number.isFinite(t));
          setMinima(minimas.length ? Math.min(...minimas) : null);
          setMaxima(maximas.length ? Math.max(...maximas) : null);
        }
      })
      .catch(() => { if (activo) setError("No pudimos cargar el tiempo de tu zona. Inténtalo de nuevo."); })
      .finally(() => { if (activo) setCargando(false); });

    return () => { activo = false; };
  }, [ubicacion]);

  const hayHelada = minima !== null && minima <= 0;
  const riesgoHelada = minima !== null && minima <= 2;
  const diasRiesgo = dias.filter((d) => d.minima !== null && d.minima <= 2);
  // Fase 5: caducidad 90m — no mostrar como actual si stale
  const fechaDatos = actual?.timestamp ? new Date(actual.timestamp).toISOString() : null;
  const esStaleMeteo = actual?.timestamp ? (Date.now() - new Date(actual.timestamp).getTime())/60000 > 90 : false;

  return (
    <section className="rounded-2xl border-2 border-sky-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-extrabold text-stone-950">Tiempo general de tu zona · {ubicacion.nombre}</h2>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Gratis, sin registro</span>
      </div>

      {error ? <p role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-[15px] font-semibold text-red-800">{error}</p> : null}

      {cargando ? <p className="mt-3 text-[15px] text-stone-600">Cargando el tiempo de tu zona…</p> : null}

      {!cargando && actual ? <p className="mt-2 text-xs leading-relaxed text-stone-600">Previsión meteorológica municipal · Fuentes: AEMET y Open-Meteo · Actualizado: {new Date(actual.timestamp).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</p> : null}

      {!cargando && actual ? (
        <>
          <div className="mt-3 flex items-end gap-4">
            <p title={etiquetaTermica(actual.temperatureC)} className={`text-[42px] font-black leading-none ${colorTemperatura(actual.temperatureC)}`}>{numero(actual.temperatureC, " °C", 0)}</p>
            <div className="pb-1">
              <p className={`text-[15px] font-bold ${colorTemperatura(actual.apparentTemperatureC)}`}>Sensación {numero(actual.apparentTemperatureC, " °C", 0)}</p>
              <p className="text-[13px] text-stone-500">
                Humedad{" "}
                <span title={etiquetaHumedad(actual.relativeHumidityPct)} className={`font-bold ${colorHumedad(actual.relativeHumidityPct)}`}>
                  {numero(actual.relativeHumidityPct, " %", 0)}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
            <Dato etiqueta="Viento" valor={numero(actual.windSpeedKmh, " km/h")} />
            <Dato etiqueta="Rachas" valor={numero(actual.windGustKmh, " km/h")} />
            <Dato etiqueta="Lluvia 1 h" valor={numero(actual.precipitationMm, " mm", 1)} />
            <Dato etiqueta="Prob. lluvia" valor={numero(actual.precipitationProbabilityPct, " %")} />
            <Dato etiqueta="Humedad ambiente" valor={numero(actual.relativeHumidityPct, " %", 0)} claseValor={colorHumedad(actual.relativeHumidityPct)} titulo={etiquetaHumedad(actual.relativeHumidityPct)} />
            <Dato etiqueta="Máx. 5 días" valor={numero(maxima, " °C", 1)} claseValor={colorTemperatura(maxima)} titulo={etiquetaTermica(maxima)} />
            <Dato etiqueta="Mín. 5 días" valor={numero(minima, " °C", 1)} claseValor={colorTemperatura(minima)} titulo={etiquetaTermica(minima)} />
            <Dato etiqueta="Actualizado" valor={actual.timestamp ? new Date(actual.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—"} />
          </div>

          {dias.length ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[15px] font-extrabold text-stone-900">{esCostaTropical ? `Previsión de vientos fuertes · ${DIAS_PREVISION} días` : `Previsión de heladas · ${DIAS_PREVISION} días`}</h3>
                <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">{esCostaTropical ? "Racha máxima" : "Máx / Mín"}</span>
              </div>
              <ul className="mt-2 divide-y divide-stone-200 rounded-xl border-2 border-stone-200">
                {dias.map((dia) => {
                  const helada = dia.minima !== null && dia.minima <= 0;
                  const riesgo = dia.minima !== null && dia.minima <= 2;
                  const vientoFuerte = dia.rachaMaxima !== null && dia.rachaMaxima >= 50;
                  return (
                    <li key={dia.clave} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="text-[15px] font-bold capitalize text-stone-800">{dia.etiqueta}</span>
                      <span className="flex items-center gap-2">
                        {esCostaTropical ? <>
                          <span className="text-[15px] font-extrabold text-stone-900">{numero(dia.rachaMaxima, " km/h")}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${dia.rachaMaxima === null ? "bg-stone-100 text-stone-700" : vientoFuerte ? "bg-amber-100 text-amber-900" : "bg-emerald-50 text-emerald-700"}`}>
                            {dia.rachaMaxima === null ? "Sin datos" : vientoFuerte ? "Viento fuerte" : "Sin viento fuerte"}
                          </span>
                        </> : <>
                          <span className="flex items-baseline gap-2 text-[15px] font-extrabold">
                            <span title={`Máx. ${etiquetaTermica(dia.maxima)}`} className={colorTemperatura(dia.maxima)}>{numero(dia.maxima, " °C", 1)}</span>
                            <span title={`Mín. ${etiquetaTermica(dia.minima)}`} className={colorTemperatura(dia.minima)}>{numero(dia.minima, " °C", 1)}</span>
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${helada ? "bg-blue-100 text-blue-800" : riesgo ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                            {helada ? "Helada" : riesgo ? "Riesgo" : "Sin riesgo"}
                          </span>
                        </>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {esCostaTropical ? (
            <p className="mt-4 rounded-xl border-2 border-sky-200 bg-sky-50 p-3 text-[14px] font-semibold text-sky-950">Viento fuerte: se consideran relevantes las rachas previstas de 50 km/h o más. Consulta la previsión diaria superior para ver los días con mayor intensidad.</p>
          ) : riesgoHelada ? (
            <div className={`mt-4 rounded-xl border-2 p-4 ${hayHelada ? "border-blue-300 bg-blue-50" : "border-amber-300 bg-amber-50"}`}>
              <p className={`text-[15px] font-extrabold ${hayHelada ? "text-blue-900" : "text-amber-900"}`}>
                {hayHelada ? `Helada probable: mínima de ${numero(minima, " °C", 1)} en los próximos ${DIAS_PREVISION} días` : `Vigila el frío: mínima de ${numero(minima, " °C", 1)} en los próximos ${DIAS_PREVISION} días`}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-stone-700">
                Días con riesgo: {diasRiesgo.map((d) => d.etiqueta).join(", ")}. Protege los cultivos sensibles durante la madrugada. Es una estimación orientativa, no un aviso oficial.
              </p>
            </div>
          ) : minima !== null ? (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-[14px] font-semibold text-emerald-900">Sin riesgo de helada en los próximos {DIAS_PREVISION} días (mínima {numero(minima, " °C", 1)}).</p>
          ) : null}
        </>
      ) : null}

      {esStaleMeteo ? <div role="alert" className="mt-3 rounded-xl border-2 border-stone-300 bg-stone-100 p-3 text-center text-sm font-bold text-stone-700">Datos desactualizados — La última actualización fue hace {fechaDatos ? Math.max(1, Math.floor((Date.now()-new Date(fechaDatos).getTime())/3600000)) : 2} horas. No tomes decisiones con esta información.</div> : null}
      <p className="mt-3 text-[12px] leading-relaxed text-stone-500">Es una previsión general para el municipio, orientativa y no equivalente a una medición en tu parcela. No sustituye a AEMET, RAIF ni a un técnico agrícola.</p>
    </section>
  );
}
