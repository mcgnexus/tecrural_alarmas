"use client";

import { useState } from "react";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import type { ResultadoEvaluacion } from "@/lib/alertas/motor";
import { AlertaCard } from "./alerta-card";
import { CtaContextual } from "@/components/servicios/cta-contextual";
import { esDatosCaducados, haceMinutos } from "@/lib/dominio/frescura";

const ids = Object.keys(catalogoCultivos) as CulturaId[];

type EstadoGeo = "inactivo" | "buscando" | "ok" | "error";

export function RiesgoActual() {
  const [estadoGeo, setEstadoGeo] = useState<EstadoGeo>("inactivo");
  const [posicion, setPosicion] = useState<{ lat: number; lon: number } | null>(
    null,
  );
  const [cultivo, setCultivo] = useState<CulturaId>("almendro");
  const [fenofaseId, setFenofaseId] = useState<string>("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoEvaluacion | null>(null);

  const cultura = catalogoCultivos[cultivo];

  function detectarUbicacion() {
    setEstadoGeo("buscando");
    setError(null);
    if (!("geolocation" in navigator)) {
      setEstadoGeo("error");
      setError("Este navegador no permite conocer tu ubicación.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPosicion({ lat: p.coords.latitude, lon: p.coords.longitude });
        setEstadoGeo("ok");
      },
      () => {
        setEstadoGeo("error");
        setError(
          "No pudimos obtener tu ubicación. Revisa los permisos e inténtalo de nuevo.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }

  async function evaluar() {
    if (!posicion) return;
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch("/api/riesgo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitud: posicion.lat,
          longitud: posicion.lon,
          cultivo,
          fenofaseId: fenofaseId || undefined,
        }),
      });
      if (!resp.ok) {
        const j = (await resp.json().catch(() => ({}))) as { code?: string; error?: string };
        if (j.code === "NO_DATA" || j.error === "Datos temporalmente no disponibles") throw new Error("NO_DATA");
        throw new Error("Respuesta no válida del servicio.");
      }
      const datos = (await resp.json()) as ResultadoEvaluacion;
      setResultado(datos);
    } catch (e) {
      if (e instanceof Error && e.message === "NO_DATA") {
        setError("NO_DATA");
      } else {
        setError(
          "No se pudo evaluar el riesgo ahora. Vuelve a intentarlo en unos minutos.",
        );
      }
    } finally {
      setCargando(false);
    }
  }

  const claseLabel = "mb-1.5 block text-sm font-bold text-stone-900";
  const claseSelect =
    "w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3.5 text-base font-medium text-stone-900 focus:border-brand-700";

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-stone-900">
          Riesgo en tu zona
        </h2>
        <p className="mt-1 text-base leading-snug text-stone-700">
          Sin registro: indica tu ubicación y cultivo para ver los riesgos de
          hoy.
        </p>

        <div className="mt-4">
          {posicion ? (
            <p className="rounded-xl border-2 border-brand-200 bg-brand-50 px-4 py-3 text-base font-semibold text-brand-900">
              📍 Ubicación actual: {posicion.lat.toFixed(4)},{" "}
              {posicion.lon.toFixed(4)}
            </p>
          ) : (
            <button
              type="button"
              onClick={detectarUbicacion}
              disabled={estadoGeo === "buscando"}
              className="inline-flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 py-3.5 text-base font-bold text-white shadow-sm hover:bg-brand-900 disabled:opacity-60"
            >
              <span aria-hidden="true">📍</span> {estadoGeo === "buscando"
                ? "Localizando…"
                : "Detectar mi ubicación"}
            </button>
          )}
        </div>

        <div className="mt-3 grid gap-3">
          <div>
            <label className={claseLabel}>Cultivo</label>
            <select
              value={cultivo}
              onChange={(e) => {
                setCultivo(e.target.value as CulturaId);
                setFenofaseId("");
              }}
              className={claseSelect}
            >
              {ids.map((id) => (
                <option key={id} value={id}>
                  {catalogoCultivos[id].nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={claseLabel}>
              Fase fenológica <span className="text-stone-400">(opcional)</span>
            </label>
            <select
              value={fenofaseId}
              onChange={(e) => setFenofaseId(e.target.value)}
              className={claseSelect}
            >
              <option value="">Fase actual (automática)</option>
              {cultura.fenologia.map((fase) => (
                <option key={fase.id} value={fase.id}>
                  {fase.etiqueta}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={evaluar}
          disabled={!posicion || cargando}
          className="mt-4 inline-flex w-full min-h-[52px] items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3.5 text-base font-bold text-white shadow-sm hover:bg-brand-800 disabled:opacity-50"
        >
          <span aria-hidden="true">▶</span> {cargando ? "Evaluando…" : "Evaluar riesgo"}
        </button>

        {error ? (
          error === "NO_DATA" ? (
            <p role="alert" className="mt-3 rounded-xl border-2 border-stone-300 bg-stone-100 p-4 text-center text-base font-bold text-stone-700">Datos temporalmente no disponibles — inténtalo de nuevo más tarde. No es “sin riesgo”.</p>
          ) : (
            <p role="alert" className="mt-3 rounded-xl border-2 border-red-200 bg-red-50 p-3 text-base font-semibold text-red-800">{error}</p>
          )
        ) : null}
      </div>

      {resultado ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-stone-600">{haceMinutos(resultado.evaluadoEl)}</p>
          {esDatosCaducados(resultado.evaluadoEl, 90) ? (
            <p role="alert" className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-center text-sm font-bold text-amber-800">⚠ Datos meteorológicos pendientes de actualización</p>
          ) : null}
          <div className={`flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4 ${esDatosCaducados(resultado.evaluadoEl, 90) ? "opacity-60" : ""}`}>
            <div>
              <p className="text-xs text-stone-500">Fase detectada</p>
              <p className="text-sm font-semibold text-stone-800">
                {resultado.fenofase ?? "Sin fenología activa"}
              </p>
            </div>
            {resultado.demandaHidrica ? (
              <div className="text-right">
                <p className="text-xs text-stone-500">
                  Demanda hídrica orientativa
                </p>
                <p className="text-sm font-semibold text-brand-700">
                  {resultado.demandaHidrica.etcMm} mm/día
                </p>
              </div>
            ) : null}
          </div>

          {esDatosCaducados(resultado.evaluadoEl, 90) ? (
            <p className="rounded-xl border-2 border-stone-300 bg-stone-100 p-4 text-center text-sm font-bold text-stone-600">Nivel de riesgo no mostrado como actual por datos caducados.</p>
          ) : resultado.alertas.length === 0 ? (
            <p className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-[13px] text-brand-900">
              No hay riesgos significativos previstos para hoy con el cultivo
              seleccionado.
            </p>
          ) : (
            resultado.alertas.map((alerta) => (
              <AlertaCard key={alerta.id} alerta={alerta} />
            ))
          )}
          <CtaContextual alertas={resultado.alertas} />
        </div>
      ) : null}
    </section>
  );
}