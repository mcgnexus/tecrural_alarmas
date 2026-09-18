"use client";

import { useState } from "react";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import type { ResultadoEvaluacion } from "@/lib/alertas/motor";
import { AlertaCard } from "./alerta-card";

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
      if (!resp.ok) throw new Error("Respuesta no válida del servicio.");
      const datos = (await resp.json()) as ResultadoEvaluacion;
      setResultado(datos);
    } catch {
      setError(
        "No se pudo evaluar el riesgo ahora. Vuelve a intentarlo en unos minutos.",
      );
    } finally {
      setCargando(false);
    }
  }

  const claseLabel = "mb-1 block text-xs font-medium text-stone-500";
  const claseSelect =
    "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800";

  return (
    <section className="flex flex-col gap-3">
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-800">
          Riesgo en tu zona
        </h2>
        <p className="mt-1 text-[13px] text-stone-500">
          Sin registro: indica tu ubicación y cultivo para ver los riesgos de
          hoy.
        </p>

        <div className="mt-3">
          {posicion ? (
            <p className="rounded-xl bg-brand-50 px-3 py-2.5 text-[13px] text-brand-800">
              Ubicación actual: {posicion.lat.toFixed(4)},{" "}
              {posicion.lon.toFixed(4)}
            </p>
          ) : (
            <button
              type="button"
              onClick={detectarUbicacion}
              disabled={estadoGeo === "buscando"}
              className="w-full rounded-xl bg-brand-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {estadoGeo === "buscando"
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
          className="mt-3 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {cargando ? "Evaluando…" : "Evaluar riesgo"}
        </button>

        {error ? (
          <p className="mt-3 text-[13px] font-medium text-red-600">{error}</p>
        ) : null}
      </div>

      {resultado ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-4">
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

          {resultado.alertas.length === 0 ? (
            <p className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-[13px] text-brand-900">
              No hay riesgos significativos previstos para hoy con el cultivo
              seleccionado.
            </p>
          ) : (
            resultado.alertas.map((alerta) => (
              <AlertaCard key={alerta.id} alerta={alerta} />
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}