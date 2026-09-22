"use client";

import { useEffect, useState } from "react";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { canUseFeature, planForUser } from "@/lib/planes/permisos";
import { registrarEventoEmbudo } from "@/lib/analitica";

type Ubicacion = { lat: number; lon: number; nombre: string; aemetMunicipio?: string };

type Hora = {
  timestamp: string;
  temperatureC: number | null;
  windGustKmh: number | null;
  windSpeedKmh: number | null;
};

export function BloqueValorAgricola({ ubicacion, cultivo }: { ubicacion: Ubicacion; cultivo?: CulturaId }) {
  const plan = planForUser();
  // Fase 4: centralizado — no hardcodear `if (feature==='rain')` disperso
  const puedeHelada = canUseFeature(plan, "frost_alert");
  const puedeViento = canUseFeature(plan, "wind_alert");
  const [heladaTexto, setHeladaTexto] = useState<string | null>(null);
  const [vientoTexto, setVientoTexto] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [failed, setFailed] = useState(false);
  const [stale, setStale] = useState(false);
  const [evaluadoEl, setEvaluadoEl] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;
    const qs = new URLSearchParams({ lat: String(ubicacion.lat), lon: String(ubicacion.lon) });
    if (ubicacion.aemetMunicipio) qs.set("aemetMunicipio", ubicacion.aemetMunicipio);

    // Previsión 5 días para helada/viento
    const horasQ = `${qs.toString()}&hours=120`;
    // Intentamos riesgo simplificado vía /api/riesgo si hay cultivo, si no usamos meteo directa
    const usarRiesgo = cultivo ? fetch("/api/riesgo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitud: ubicacion.lat, longitud: ubicacion.lon, cultivo, aemetMunicipio: ubicacion.aemetMunicipio || undefined }),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    }).then(async r => {
      if (r.ok) return await r.json() as { alertas: Array<{ tipo:string; severidad:string; mensaje:string }>, estadoEvaluacion?:string, fechaCaducidad?:string, evaluadoEl?:string, fechaDatos?:string };
      // Fase 5: failed — no mostrar verde ni "sin riesgo"
      const j = await r.json().catch(()=>null) as { code?:string, estadoEvaluacion?:string, errorTecnico?:string } | null;
      if (j?.estadoEvaluacion === "failed") throw new Error(j.code || "EVAL_FAILED");
      return null;
    }).catch(()=> { throw new Error("EVAL_FAILED"); }) : Promise.resolve(null);

    const usarMeteo = fetch(`/api/v1/weather/forecast?${horasQ}`, { cache: "no-store", signal: AbortSignal.timeout(20000) })
      .then(r=> r.ok ? r.json() as Promise<Hora[]> : null).catch(()=>null);

    Promise.all([usarRiesgo, usarMeteo]).then(([riesgo, horas])=>{
      if(!activo) return;
      // Fase 5: manejar stale/failed sin sobrescribir válido como actual
      if (riesgo && (riesgo as unknown as { estadoEvaluacion?:string; fechaCaducidad?:string }).estadoEvaluacion === "failed") {
        setFailed(true); return;
      }
      if ((!riesgo || !Array.isArray(riesgo.alertas)) && (!horas || !horas.length)) {
        setFailed(true);
        return;
      }
      if (riesgo) {
        const evaluado = riesgo.evaluadoEl ?? new Date().toISOString();
        setEvaluadoEl(evaluado);
        const caducidad = (riesgo as unknown as { fechaCaducidad?:string }).fechaCaducidad;
        if (caducidad && Date.now() > new Date(caducidad).getTime()) setStale(true);
      } else setEvaluadoEl(new Date().toISOString());
      // Helada y viento desde riesgo si existe
      if (riesgo && Array.isArray(riesgo.alertas)) {
        const helada = riesgo.alertas.find(a=> a.tipo==="helada" && a.severidad!=="info");
        const viento = riesgo.alertas.find(a=> a.tipo==="viento" && a.severidad!=="info");
        if (helada) { setHeladaTexto(helada.mensaje); registrarEventoEmbudo("frost_alert_viewed",{ municipio: ubicacion.nombre }); }
        else setHeladaTexto("Helada: sin riesgo previsto durante los próximos 5 días.");
        if (viento) { setVientoTexto(viento.mensaje); registrarEventoEmbudo("wind_alert_viewed",{ municipio: ubicacion.nombre }); }
        else if (horas && horas.length) {
          const maxRacha = Math.max(...horas.map(h=> h.windGustKmh ?? 0).filter(Number.isFinite));
          if (maxRacha >= 50) setVientoTexto(`Viento: se esperan rachas de hasta ${Math.round(maxRacha)} km/h. Revisa tutores, estructuras y árboles jóvenes.`);
          else setVientoTexto("Viento: sin rachas relevantes en los próximos 5 días.");
        } else setVientoTexto("Viento: sin riesgo previsto durante los próximos 5 días.");
      } else if (horas && horas.length) {
        // Fallback sin cultivo: heurística simple
        const temps = horas.map(h=> h.temperatureC).filter((v):v is number=> typeof v==="number" && Number.isFinite(v));
        const min = temps.length ? Math.min(...temps) : null;
        const maxRacha = Math.max(...horas.map(h=> h.windGustKmh ?? 0).filter(Number.isFinite));
        if (min !== null && min <= 1) setHeladaTexto(`Helada: posible helada con mínima de ${min.toFixed(1)} °C en 5 días. Protege cultivos sensibles de madrugada.`);
        else setHeladaTexto("Helada: sin riesgo previsto durante los próximos 5 días.");
        if (maxRacha >= 50) setVientoTexto(`Viento: se esperan rachas fuertes (hasta ${Math.round(maxRacha)} km/h). Revisa tutores, estructuras y árboles jóvenes.`);
        else setVientoTexto("Viento: sin rachas relevantes en los próximos 5 días.");
      } else {
        setHeladaTexto("Helada: sin datos suficientes. Elige cultivo para un aviso más preciso.");
        setVientoTexto("Viento: sin datos suficientes.");
      }
    }).catch(()=> { if(activo) setFailed(true); }).finally(()=> { if(activo) setCargando(false); });
    return ()=>{ activo=false; };
  }, [ubicacion.lat, ubicacion.lon, ubicacion.aemetMunicipio, cultivo, intento]);

  if (!puedeHelada && !puedeViento) return null;
  if (cargando) return <section aria-live="polite" className="rounded-2xl border-2 border-earth-200 bg-wheat-50 p-5"><h2 className="text-lg font-extrabold text-stone-950">Calculando riesgos para tu cultivo…</h2><p className="mt-1 text-[15px] text-stone-600">Interpretando riesgos. Puede tardar unos segundos; si no se completa, podrás reintentar.</p></section>;
  if (failed) return (
    <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
      <h2 className="text-lg font-extrabold text-amber-900">No disponible</h2>
      <p className="mt-1 text-[15px] text-amber-800">No pudimos evaluar helada y viento ahora. No es “sin riesgo”.</p>
      <button type="button" onClick={()=> { setFailed(false); setStale(false); setCargando(true); setIntento((actual) => actual + 1); }} className="mt-3 inline-flex min-h-[48px] items-center rounded-xl bg-amber-700 px-4 text-sm font-bold text-white">Reintentar evaluación</button>
      <p className="mt-2 text-xs text-amber-700">Si vuelve a fallar, consulta más tarde. No mostramos “sin riesgo” mientras no haya datos válidos.</p>
    </section>
  );
  if (stale) {
    return (
      <section className="rounded-2xl border-2 border-stone-300 bg-stone-100 p-5">
        <h2 className="text-lg font-extrabold text-stone-800">Datos desactualizados</h2>
        <p className="mt-1 text-[15px] text-stone-700">Última evaluación: {evaluadoEl ? new Date(evaluadoEl).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "hora desconocida"}. No tomes decisiones con esta información.</p>
        <p className="mt-2 text-xs text-stone-500">Mostrando último dato válido marcado como antiguo.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border-2 border-earth-200 bg-wheat-50 p-5 shadow-sm">
      <h2 className="text-lg font-extrabold text-stone-950">Riesgos para tu cultivo</h2>
      <p className="mt-1 text-xs leading-relaxed text-stone-600"><strong>Estado: Actualizado</strong> · Evaluación agrícola de helada y viento basada en previsiones de AEMET/Open-Meteo{evaluadoEl ? ` · Última actualización: ${new Date(evaluadoEl).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}` : ""}</p>
      <div className="mt-3 grid gap-3">
        {puedeHelada ? <article className="rounded-xl bg-white p-4 border border-stone-200">
          <h3 className="font-bold text-stone-900">Helada</h3>
          <p className="mt-1 text-[15px] leading-relaxed text-stone-700">{heladaTexto}</p>
        </article> : null}
        {puedeViento ? <article className="rounded-xl bg-white p-4 border border-stone-200">
          <h3 className="font-bold text-stone-900">Viento</h3>
          <p className="mt-1 text-[15px] leading-relaxed text-stone-700">{vientoTexto}</p>
        </article> : null}
      </div>
      <p className="mt-3 text-xs text-stone-500">Explicación orientativa basada en la previsión de 5 días. No sustituye criterio técnico.</p>
    </section>
  );
}
