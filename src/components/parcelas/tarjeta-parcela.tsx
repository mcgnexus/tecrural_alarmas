"use client";

import { useState } from "react";
import Link from "next/link";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import { zonaCultivoPorCoordenadas } from "@/lib/cultivos/zona";
import { asegurarSesionDispositivo, obtenerDispositivoId } from "@/lib/datos/dispositivo";
import type { ParcelaDto } from "@/lib/datos/tipos";
import { DashboardParcela } from "./dashboard-parcela";
import { CtaContextual } from "@/components/servicios/cta-contextual";
import { MejorarPrecision } from "./mejorar-precision";

interface Props {
  parcela: ParcelaDto;
  onCambio: () => void;
}

export function TarjetaParcela({ parcela, onCambio }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cultivo = catalogoCultivos[parcela.cultivo];
  const zona = zonaCultivoPorCoordenadas(parcela.latitud, parcela.longitud);

  async function evaluar() {
    await asegurarSesionDispositivo();
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch(`/api/parcelas/${parcela.id}/evaluar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispositivoId: obtenerDispositivoId() }),
      });
      if (!resp.ok) {
        const j = (await resp.json().catch(() => ({}))) as { code?: string };
        if (j.code === "NO_DATA") throw new Error("NO_DATA");
        throw new Error("Respuesta no válida del servicio.");
      }
      await resp.json();
      onCambio();
    } catch (e) {
      if (e instanceof Error && e.message === "NO_DATA") setError("NO_DATA");
      else setError("No se pudo evaluar ahora. Inténtalo en unos minutos.");
    } finally {
      setCargando(false);
    }
  }

  async function borrar() {
    await asegurarSesionDispositivo();
    setError(null);
    try {
      const resp = await fetch(
        `/api/parcelas/${parcela.id}?dispositivo=${encodeURIComponent(obtenerDispositivoId())}`,
        { method: "DELETE" },
      );
      if (!resp.ok) throw new Error();
      onCambio();
    } catch {
      setError("No se pudo eliminar ahora. Inténtalo de nuevo.");
    }
  }

  const ultimo = parcela.ultimaEvaluacion;
  const criticos = ultimo?.alertas.filter(
    (a) => a.severidad === "critica" || a.severidad === "alerta",
  ).length ?? 0;

  return (
    <article className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-stone-900">
            {parcela.nombre}
          </h3>
          <p className="mt-1 text-sm font-semibold text-stone-800">
            {cultivo.nombre}
          </p>
          <p className="text-xs font-medium text-stone-500">
            {parcela.latitud.toFixed(4)}, {parcela.longitud.toFixed(4)}
          </p>
        </div>
        <button
          type="button"
          onClick={borrar}
          aria-label={`Eliminar parcela ${parcela.nombre}`}
          className="inline-flex min-h-[44px] items-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
        >
          Eliminar
        </button>
      </div>

      {ultimo ? (
        <div className="mt-4 flex flex-col gap-3">
          <DashboardParcela alertas={ultimo.alertas} evaluadoEl={ultimo.evaluadoEl} />
          <CtaContextual alertas={ultimo.alertas} />
          <MejorarPrecision parcelaId={parcela.id} cultivo={parcela.cultivo} fenofaseActual={ultimo.fenofase} zona={zona} onActualizado={onCambio} />
          <p className="text-sm font-medium text-stone-600">
            {criticos > 0
              ? `⚠ ${criticos} riesgo${criticos > 1 ? "s" : ""} activo${criticos > 1 ? "s" : ""} hoy`
              : "✓ Sin riesgos significativos hoy."}
          </p>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-base font-medium text-stone-600">Todavía sin evaluar.</p>
          <MejorarPrecision parcelaId={parcela.id} cultivo={parcela.cultivo} fenofaseActual={null} zona={zona} onActualizado={onCambio} />
        </div>
      )}

      {error ? (
        error === "NO_DATA" ? (
          <p role="alert" className="mt-3 rounded-xl border-2 border-stone-300 bg-stone-100 p-4 text-center text-base font-bold text-stone-700">Datos temporalmente no disponibles — no es “sin riesgo”.</p>
        ) : (
          <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>
        )
      ) : null}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={evaluar}
          disabled={cargando}
          className="inline-flex flex-1 min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-800 px-4 py-3 text-base font-bold text-white shadow-sm hover:bg-brand-900 active:bg-brand-950 disabled:opacity-60"
        >
          {cargando ? "⏳ Evaluando…" : "▶ Evaluar riesgo"}
        </button>
        <Link
          href="/alertas"
          className="inline-flex min-h-[48px] items-center justify-center gap-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-3 text-base font-semibold text-stone-900 hover:bg-stone-50"
        >
          Alertas
        </Link>
      </div>
    </article>
  );
}