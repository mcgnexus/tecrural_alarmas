"use client";

import { useEffect, useState } from "react";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import { canUseFeature, planForUser } from "@/lib/planes/permisos";
import { registrarEventoEmbudo } from "@/lib/analitica";

type Ubicacion = { lat: number; lon: number; nombre: string; aemetMunicipio?: string };

type Hora = {
  timestamp: string;
  temperatureC: number | null;
  windGustKmh: number | null;
};

type Nivel = "info" | "aviso" | "alerta" | "critica";

type Alerta = { tipo: string; severidad: string; mensaje: string };

type ResultadoRiesgo = {
  alertas: Alerta[];
  fenofase?: string | null;
  estadoEvaluacion?: string;
  fechaCaducidad?: string;
  evaluadoEl?: string;
};

type DiaRiesgo = {
  clave: string;
  etiqueta: string;
  minima: number | null;
  rachaMaxima: number | null;
  nivel: Nivel;
  helada: boolean;
  viento: boolean;
  umbralHelada: number;
  umbralViento: number;
};

const DIAS_PREVISION = 5;
const UMBRAL_GENERICO = { tminMortal: -5, tminHelada: 1, vientoCriticoKmh: 50 };

const ORDEN: Record<Nivel, number> = { info: 0, aviso: 1, alerta: 2, critica: 3 };
const ETIQUETA_NIVEL: Record<Nivel, string> = {
  info: "Sin riesgo",
  aviso: "Aviso",
  alerta: "Alerta",
  critica: "Crítico",
};
const COLOR_NIVEL: Record<Nivel, string> = {
  info: "text-emerald-700",
  aviso: "text-amber-800",
  alerta: "text-orange-800",
  critica: "text-red-700",
};
const PARCHES_NIVEL: Record<Nivel, string> = {
  info: "border-emerald-300 bg-emerald-50 text-emerald-800",
  aviso: "border-amber-300 bg-amber-50 text-amber-900",
  alerta: "border-orange-300 bg-orange-50 text-orange-900",
  critica: "border-red-300 bg-red-50 text-red-900",
};

function fechaLocal(valor: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(valor));
}

function peorNivel(a: Nivel, b: Nivel): Nivel {
  return ORDEN[a] >= ORDEN[b] ? a : b;
}

function nivelDeSeveridad(severidad: string): Nivel {
  return severidad === "critica" || severidad === "alerta" || severidad === "aviso"
    ? severidad
    : "info";
}

/** Resume la serie horaria por día: mínima y racha máxima. */
function diasDesdeHoras(horas: Hora[]): Array<{
  clave: string;
  etiqueta: string;
  minima: number | null;
  rachaMaxima: number | null;
}> {
  const porDia = new Map<string, { clave: string; etiqueta: string; minima: number | null; rachaMaxima: number | null }>();
  for (const hora of horas) {
    const t = typeof hora.temperatureC === "number" && Number.isFinite(hora.temperatureC) ? hora.temperatureC : null;
    const racha = typeof hora.windGustKmh === "number" && Number.isFinite(hora.windGustKmh) ? hora.windGustKmh : null;
    if (t === null && racha === null) continue;
    const fecha = new Date(hora.timestamp);
    if (Number.isNaN(fecha.getTime())) continue;
    const clave = `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
    const etiqueta = fecha.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit" });
    const actual = porDia.get(clave);
    if (!actual) porDia.set(clave, { clave, etiqueta, minima: t, rachaMaxima: racha });
    else {
      if (t !== null && (actual.minima === null || t < actual.minima)) actual.minima = t;
      if (racha !== null && (actual.rachaMaxima === null || racha > actual.rachaMaxima)) actual.rachaMaxima = racha;
    }
  }
  return Array.from(porDia.values()).slice(0, DIAS_PREVISION);
}

function nivelDelDia(
  minima: number | null,
  rachaMaxima: number | null,
  umbral: { tminMortal: number; tminHelada: number; vientoCriticoKmh: number },
  puedeHelada: boolean,
  puedeViento: boolean,
): { nivel: Nivel; helada: boolean; viento: boolean } {
  let nivel: Nivel = "info";
  let helada = false;
  let viento = false;
  if (puedeHelada && minima !== null) {
    if (minima <= umbral.tminMortal) { nivel = peorNivel(nivel, "critica"); helada = true; }
    else if (minima <= umbral.tminHelada) { nivel = peorNivel(nivel, "aviso"); helada = true; }
  }
  if (puedeViento && rachaMaxima !== null) {
    if (rachaMaxima >= umbral.vientoCriticoKmh * 1.4) { nivel = peorNivel(nivel, "alerta"); viento = true; }
    else if (rachaMaxima >= umbral.vientoCriticoKmh) { nivel = peorNivel(nivel, "aviso"); viento = true; }
  }
  return { nivel, helada, viento };
}

/**
 * Resumen agrícola: nivel de riesgo, día de mayor riesgo y explicación breve.
 * Los datos diarios detallados vive en `MeteoZona`; aquí solo la conclusión.
 */
export function BloqueValorAgricola({ ubicacion, cultivo }: { ubicacion: Ubicacion; cultivo?: CulturaId }) {
  const plan = planForUser();
  const puedeHelada = canUseFeature(plan, "frost_alert");
  const puedeViento = canUseFeature(plan, "wind_alert");
  const [nivel, setNivel] = useState<Nivel>("info");
  const [peorDia, setPeorDia] = useState<DiaRiesgo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [failed, setFailed] = useState(false);
  const [stale, setStale] = useState(false);
  const [evaluadoEl, setEvaluadoEl] = useState<string | null>(null);
  const [fenofase, setFenofase] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    const qs = new URLSearchParams({ lat: String(ubicacion.lat), lon: String(ubicacion.lon) });
    if (ubicacion.aemetMunicipio) qs.set("aemetMunicipio", ubicacion.aemetMunicipio);
    const umbral = cultivo ? catalogoCultivos[cultivo].umbrales : UMBRAL_GENERICO;

    const usarRiesgo = cultivo
      ? fetch("/api/riesgo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitud: ubicacion.lat, longitud: ubicacion.lon, cultivo, aemetMunicipio: ubicacion.aemetMunicipio || undefined }),
          cache: "no-store",
          signal: AbortSignal.timeout(20000),
        }).then(async (r) => {
          if (r.ok) return await r.json() as ResultadoRiesgo;
          const j = await r.json().catch(() => null) as { estadoEvaluacion?: string } | null;
          if (j?.estadoEvaluacion === "failed") throw new Error("EVAL_FAILED");
          return null;
        }).catch(() => { throw new Error("EVAL_FAILED"); })
      : Promise.resolve(null);

    const usarMeteo = fetch(`/api/v1/weather/forecast?${qs.toString()}&hours=${DIAS_PREVISION * 24}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    }).then((r) => (r.ok ? r.json() as Promise<Hora[]> : null)).catch(() => null);

    Promise.all([usarRiesgo, usarMeteo]).then(([riesgo, horas]) => {
      if (!activo) return;
      if (riesgo?.estadoEvaluacion === "failed") { setFailed(true); return; }
      const alertas = riesgo && Array.isArray(riesgo.alertas) ? riesgo.alertas : null;
      if (!alertas && (!horas || !horas.length)) { setFailed(true); return; }

      if (riesgo) {
        setEvaluadoEl(riesgo.evaluadoEl ?? new Date().toISOString());
        setFenofase(riesgo.fenofase ?? null);
        if (riesgo.fechaCaducidad && Date.now() > new Date(riesgo.fechaCaducidad).getTime()) setStale(true);
      } else {
        setEvaluadoEl(new Date().toISOString());
        setFenofase(null);
      }

      if (alertas) {
        if (puedeHelada && alertas.some((a) => a.tipo === "helada" && a.severidad !== "info")) {
          registrarEventoEmbudo("frost_alert_viewed", { municipio: ubicacion.nombre });
        }
        if (puedeViento && alertas.some((a) => a.tipo === "viento" && a.severidad !== "info")) {
          registrarEventoEmbudo("wind_alert_viewed", { municipio: ubicacion.nombre });
        }
      }

      const apiNivel = alertas
        ? alertas
            .filter((a) => (a.tipo === "helada" && puedeHelada) || (a.tipo === "viento" && puedeViento))
            .reduce<Nivel>((acc, a) => peorNivel(acc, nivelDeSeveridad(a.severidad)), "info")
        : "info";
      const apiHelada = Boolean(alertas && puedeHelada && alertas.some((a) => a.tipo === "helada" && a.severidad !== "info"));
      const apiViento = Boolean(alertas && puedeViento && alertas.some((a) => a.tipo === "viento" && a.severidad !== "info"));

      const dias: DiaRiesgo[] = diasDesdeHoras(horas ?? []).map((d, i) => {
        const propio = nivelDelDia(d.minima, d.rachaMaxima, umbral, puedeHelada, puedeViento);
        const esHoy = i === 0 && alertas !== null;
        return {
          ...d,
          nivel: esHoy ? peorNivel(propio.nivel, apiNivel) : propio.nivel,
          helada: propio.helada || (esHoy && apiHelada),
          viento: propio.viento || (esHoy && apiViento),
          umbralHelada: umbral.tminHelada,
          umbralViento: umbral.vientoCriticoKmh,
        };
      });

      if (!dias.length && alertas) {
        dias.push({
          clave: "hoy",
          etiqueta: "hoy",
          minima: null,
          rachaMaxima: null,
          nivel: apiNivel,
          helada: apiHelada,
          viento: apiViento,
          umbralHelada: umbral.tminHelada,
          umbralViento: umbral.vientoCriticoKmh,
        });
      }

      let peor: DiaRiesgo | null = null;
      for (const d of dias) if (!peor || ORDEN[d.nivel] > ORDEN[peor.nivel]) peor = d;
      setNivel(peor ? peor.nivel : "info");
      setPeorDia(peor);
    }).catch(() => { if (activo) setFailed(true); }).finally(() => { if (activo) setCargando(false); });

    return () => { activo = false; };
  }, [ubicacion.lat, ubicacion.lon, ubicacion.aemetMunicipio, ubicacion.nombre, cultivo, intento, puedeHelada, puedeViento]);

  if (!puedeHelada && !puedeViento) return null;
  if (cargando) return (
    <section aria-live="polite" className="rounded-2xl border-2 border-earth-200 bg-wheat-50 p-5">
      <h2 className="text-lg font-extrabold text-stone-950">Calculando riesgos para tu cultivo…</h2>
      <p className="mt-1 text-[15px] text-stone-600">Interpretando riesgos. Puede tardar unos segundos; si no se completa, podrás reintentar.</p>
    </section>
  );
  if (failed) return (
    <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
      <h2 className="text-lg font-extrabold text-amber-900">No disponible</h2>
      <p className="mt-1 text-[15px] text-amber-800">No pudimos evaluar helada y viento ahora. No es “sin riesgo”.</p>
      <button type="button" onClick={() => { setFailed(false); setStale(false); setCargando(true); setIntento((actual) => actual + 1); }} className="mt-3 inline-flex min-h-[48px] items-center rounded-xl bg-amber-700 px-4 text-sm font-bold text-white">Reintentar evaluación</button>
      <p className="mt-2 text-xs text-amber-700">Si vuelve a fallar, consulta más tarde. No mostramos “sin riesgo” mientras no haya datos válidos.</p>
    </section>
  );
  if (stale) return (
    <section className="rounded-2xl border-2 border-stone-300 bg-stone-100 p-5">
      <h2 className="text-lg font-extrabold text-stone-800">Datos desactualizados</h2>
      <p className="mt-1 text-[15px] text-stone-700">Última evaluación de riesgos: {evaluadoEl ? `${fechaLocal(evaluadoEl)} (hora peninsular)` : "hora desconocida"}. No tomes decisiones con esta información.</p>
      <p className="mt-2 text-xs text-stone-500">Mostrando último dato válido marcado como antiguo.</p>
    </section>
  );

  const nombreCultivo = cultivo ? catalogoCultivos[cultivo].nombre : null;
  const hayRiesgo = nivel !== "info" && peorDia !== null;
  const detallePeor = peorDia
    ? [
        peorDia.minima !== null ? `mín ${peorDia.minima.toFixed(1)} °C` : null,
        peorDia.rachaMaxima !== null ? `rachas ${Math.round(peorDia.rachaMaxima)} km/h` : null,
      ].filter(Boolean).join(" · ")
    : "";

  function explicacion(): string {
    if (!hayRiesgo || !peorDia) {
      return `Sin riesgo en los próximos ${DIAS_PREVISION} días: la previsión no supera los umbrales ${nombreCultivo ? `de ${nombreCultivo}` : "genéricos"}.`;
    }
    const partes: string[] = [];
    if (peorDia.helada && peorDia.minima !== null) partes.push(`mínima de ${peorDia.minima.toFixed(1)} °C (umbral ${peorDia.umbralHelada} °C)`);
    if (peorDia.viento && peorDia.rachaMaxima !== null) partes.push(`rachas de ${Math.round(peorDia.rachaMaxima)} km/h (umbral ${peorDia.umbralViento} km/h)`);
    if (!partes.length) partes.push("valores cercanos a los umbrales aplicados");
    const acciones: string[] = [];
    if (peorDia.helada) acciones.push("Protege los cultivos sensibles de madrugada.");
    if (peorDia.viento) acciones.push("Revisa tutores, cubiertas y elementos sueltos.");
    return `El peor día de los próximos ${DIAS_PREVISION} es ${peorDia.etiqueta}: ${partes.join(" y ")}. ${acciones.join(" ")}`.trim();
  }

  return (
    <section className="rounded-2xl border-2 border-earth-200 bg-wheat-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold text-stone-950">Resumen agrícola</h2>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${PARCHES_NIVEL[nivel]}`}>{ETIQUETA_NIVEL[nivel]}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-stone-600">
        {nombreCultivo ? `Cultivo: ${nombreCultivo}${fenofase ? ` · ${fenofase}` : ""}` : "Sin cultivo: umbrales genéricos"} · Evaluado {evaluadoEl ? fechaLocal(evaluadoEl) : "ahora"} (hora peninsular)
      </p>

      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <dt className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Nivel</dt>
          <dd className={`mt-1 text-xl font-extrabold ${COLOR_NIVEL[nivel]}`}>{ETIQUETA_NIVEL[nivel]}</dd>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <dt className="text-[11px] font-bold uppercase tracking-wide text-stone-500">Día de mayor riesgo</dt>
          <dd className="mt-1 text-xl font-extrabold text-stone-950">{hayRiesgo && peorDia ? peorDia.etiqueta : "Ninguno"}</dd>
          {hayRiesgo && detallePeor ? <p className="mt-0.5 text-xs text-stone-500">{detallePeor}</p> : null}
        </div>
      </dl>

      <p className="mt-3 rounded-xl border border-stone-200 bg-white p-3 text-sm leading-relaxed text-stone-700">{explicacion()}</p>
      <p className="mt-2 text-xs text-stone-500">Estimación orientativa de {DIAS_PREVISION} días (AEMET/Open-Meteo). No sustituye la observación de la parcela ni el criterio de un técnico.</p>
    </section>
  );
}
