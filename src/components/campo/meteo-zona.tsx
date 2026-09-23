"use client";

import { useEffect, useState } from "react";
import { colorTemperatura, etiquetaTermica } from "@/lib/ui/temperatura";
import { colorHumedad, etiquetaHumedad } from "@/lib/ui/humedad";
import { registrarEventoEmbudo } from "@/lib/analitica";

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

type DiaExtremos = {
  clave: string;
  etiqueta: string;
  minima: number | null;
  maxima: number | null;
  lluviaTotal: number | null;
  vientoMaximo: number | null;
  rachaMaxima: number | null;
};

const DIAS_PREVISION = 5;
const HORAS_PREVISION = DIAS_PREVISION * 24;
const ZONA_HORARIA = "Europe/Madrid";

function fechaLocal(valor: string | Date, incluirFecha = true): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: ZONA_HORARIA,
    ...(incluirFecha ? { dateStyle: "short" as const } : {}),
    timeStyle: "short",
  }).format(typeof valor === "string" ? new Date(valor) : valor);
}

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

function maximo(actual: number | null, valor: number | null): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? (actual === null ? valor : Math.max(actual, valor)) : actual;
}

/** Agrupa la serie horaria por día natural y resume las variables principales. */
function extremosPorDia(horas: Hora[]): DiaExtremos[] {
  const porDia = new Map<string, DiaExtremos>();
  for (const hora of horas) {
    const t = hora.temperatureC;
    const lluvia = hora.precipitationMm;
    const viento = hora.windSpeedKmh;
    const racha = hora.windGustKmh;
    const temperaturaValida = typeof t === "number" && Number.isFinite(t);
    const lluviaValida = typeof lluvia === "number" && Number.isFinite(lluvia);
    const vientoValido = typeof viento === "number" && Number.isFinite(viento);
    const rachaValida = typeof racha === "number" && Number.isFinite(racha);
    if (!temperaturaValida && !lluviaValida && !vientoValido && !rachaValida) continue;
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
      lluviaTotal: lluviaValida ? lluvia : null,
      vientoMaximo: vientoValido ? viento : null,
      rachaMaxima: rachaValida ? racha : null,
    });
    else {
      if (temperaturaValida && (actual.minima === null || t < actual.minima)) actual.minima = t;
      if (temperaturaValida && (actual.maxima === null || t > actual.maxima)) actual.maxima = t;
      if (lluviaValida) actual.lluviaTotal = (actual.lluviaTotal ?? 0) + lluvia;
      if (vientoValido) actual.vientoMaximo = maximo(actual.vientoMaximo, viento);
      if (rachaValida) actual.rachaMaxima = maximo(actual.rachaMaxima, racha);
    }
  }
  return Array.from(porDia.values()).slice(0, DIAS_PREVISION);
}

export function MeteoZona({ ubicacion }: { ubicacion: Ubicacion }) {
  const [actual, setActual] = useState<Hora | null>(null);
  const [dias, setDias] = useState<DiaExtremos[]>([]);
  const [minima, setMinima] = useState<number | null>(null);
  const [maxima, setMaxima] = useState<number | null>(null);
  const [consultadoEl, setConsultadoEl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;

    const qs = new URLSearchParams({ lat: String(ubicacion.lat), lon: String(ubicacion.lon) });
    if (ubicacion.aemetMunicipio) qs.set("aemetMunicipio", ubicacion.aemetMunicipio);
    const q = qs.toString();

    const pedirActual = fetch(`/api/v1/weather/current?${q}`, { cache: "no-store", signal: AbortSignal.timeout(20000) })
      .then((r) => (r.ok ? (r.json() as Promise<Hora>) : null))
      .catch(() => null);
    const pedirPrevision = fetch(`/api/v1/weather/forecast?${q}&hours=${HORAS_PREVISION}`, { cache: "no-store", signal: AbortSignal.timeout(20000) })
      .then((r) => (r.ok ? (r.json() as Promise<Hora[]>) : null))
      .catch(() => null);

    Promise.all([pedirActual, pedirPrevision])
      .then(([hoy, horas]) => {
        if (!activo) return;
        if (!hoy && !horas) { setError("No pudimos cargar el tiempo de tu zona. Inténtalo de nuevo."); return; }
        if (!hoy) setError("No pudimos cargar las condiciones actuales. Puedes reintentar la consulta.");
        if (hoy) registrarEventoEmbudo("weather_viewed", { municipio: ubicacion.nombre });
        if (horas && horas.length) registrarEventoEmbudo("forecast_viewed", { municipio: ubicacion.nombre });
        setActual(hoy);
        setConsultadoEl(new Date().toISOString());
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
  }, [ubicacion, intento]);

  const horaDatoEsFutura = actual?.timestamp && consultadoEl ? Date.parse(actual.timestamp) > Date.parse(consultadoEl) : false;
  // Fase 5: caducidad 90m — no mostrar como actual si stale
  const fechaDatos = actual?.timestamp ? new Date(actual.timestamp).toISOString() : null;
  const esStaleMeteo = actual?.timestamp && consultadoEl ? (Date.parse(consultadoEl) - Date.parse(actual.timestamp)) / 60000 > 90 : false;

  return (
    <section className="rounded-2xl border-2 border-sky-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-extrabold text-stone-950">Ahora · {ubicacion.nombre}</h2>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Gratis, sin registro</span>
      </div>

      {error ? <div className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3"><p role="alert" className="text-[15px] font-semibold text-red-800">{error}</p><button type="button" onClick={() => { setError(null); setCargando(true); setIntento((actualIntento) => actualIntento + 1); }} className="mt-2 inline-flex min-h-[44px] items-center rounded-xl bg-red-800 px-4 text-sm font-bold text-white">Reintentar consulta</button></div> : null}

      {cargando ? <p role="status" aria-live="polite" className="mt-3 rounded-xl bg-sky-50 p-3 text-[15px] font-semibold text-sky-950">Consultando el tiempo y la previsión de {ubicacion.nombre}…</p> : null}

      {!cargando && actual ? <p className="mt-2 text-xs leading-relaxed text-stone-600">Datos meteorológicos municipales · Fuentes: AEMET y Open-Meteo · Hora del dato {horaDatoEsFutura ? "previsto" : "observado"}: {fechaLocal(actual.timestamp)} (hora peninsular) · Previsión consultada: {consultadoEl ? `${fechaLocal(consultadoEl)} (hora peninsular)` : "—"}</p> : null}

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
          </div>

          {dias.length ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-[15px] font-extrabold text-stone-900">Previsión diaria · {dias.length} días</h3>
                <span className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Temperatura · lluvia · viento</span>
              </div>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {dias.map((dia) => (
                  <li key={dia.clave} className="rounded-xl border-2 border-stone-200 bg-wheat-50 p-3">
                    <span className="text-[15px] font-bold capitalize text-stone-800">{dia.etiqueta}</span>
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                      <p><span className="text-stone-500">Mín / Máx</span><br /><strong className={colorTemperatura(dia.minima)}>{numero(dia.minima, "°", 0)}</strong> / <strong className={colorTemperatura(dia.maxima)}>{numero(dia.maxima, "°", 0)}</strong></p>
                      <p><span className="text-stone-500">Lluvia</span><br /><strong>{numero(dia.lluviaTotal, " mm", 1)}</strong></p>
                      <p><span className="text-stone-500">Viento máx.</span><br /><strong>{numero(dia.vientoMaximo, " km/h")}</strong></p>
                      <p><span className="text-stone-500">Rachas</span><br /><strong>{numero(dia.rachaMaxima, " km/h")}</strong></p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {esStaleMeteo ? <div role="alert" className="mt-3 rounded-xl border-2 border-stone-300 bg-stone-100 p-3 text-center"><p className="text-sm font-bold text-stone-700">Dato horario antiguo — corresponde a {fechaDatos ? fechaLocal(fechaDatos) : "una hora desconocida"} (hora peninsular). No tomes decisiones con esta información.</p><p className="mt-1 text-xs text-stone-600">Último dato válido conservado: {fechaDatos ? fechaLocal(fechaDatos) : "—"} — no es información actual.</p><button type="button" onClick={() => { setError(null); setCargando(true); setIntento((n) => n + 1); }} className="mt-3 inline-flex min-h-[44px] items-center rounded-xl bg-stone-800 px-4 text-sm font-bold text-white">Reintentar consulta</button></div> : null}
      <p className="mt-3 text-[12px] leading-relaxed text-stone-500">Es una previsión general para el municipio, orientativa y no equivalente a una medición en tu parcela. No sustituye a AEMET, RAIF ni a un técnico agrícola.</p>
    </section>
  );
}
