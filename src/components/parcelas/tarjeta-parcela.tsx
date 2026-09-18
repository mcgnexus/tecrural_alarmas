"use client";

import { useState } from "react";
import Link from "next/link";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import { obtenerDispositivoId } from "@/lib/datos/dispositivo";
import type { ParcelaDto } from "@/lib/datos/tipos";

interface Props {
  parcela: ParcelaDto;
  onCambio: () => void;
}

export function TarjetaParcela({ parcela, onCambio }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cultivo = catalogoCultivos[parcela.cultivo];

  async function evaluar() {
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch(`/api/parcelas/${parcela.id}/evaluar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispositivoId: obtenerDispositivoId() }),
      });
      if (!resp.ok) throw new Error("Respuesta no válida del servicio.");
      await resp.json();
      onCambio();
    } catch {
      setError("No se pudo evaluar ahora. Inténtalo en unos minutos.");
    } finally {
      setCargando(false);
    }
  }

  async function borrar() {
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
    <article className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-stone-800">
            {parcela.nombre}
          </h3>
          <p className="mt-0.5 text-xs text-stone-500">
            {cultivo.nombre} · {parcela.latitud.toFixed(4)},{" "}
            {parcela.longitud.toFixed(4)}
          </p>
        </div>
        <button
          type="button"
          onClick={borrar}
          aria-label="Eliminar parcela"
          className="rounded-lg px-2 py-1 text-xs text-red-600"
        >
          Eliminar
        </button>
      </div>

      {ultimo ? (
        <p className="mt-2 text-[13px] text-stone-600">
          {criticos > 0
            ? `${criticos} riesgo${criticos > 1 ? "s" : ""} activo${criticos > 1 ? "s" : ""} hoy`
            : "Sin riesgos significativos hoy."}
        </p>
      ) : (
        <p className="mt-2 text-[13px] text-stone-400">
          Todavía sin evaluar.
        </p>
      )}

      {error ? (
        <p className="mt-2 text-[13px] font-medium text-red-600">{error}</p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={evaluar}
          disabled={cargando}
          className="flex-1 rounded-xl bg-brand-800 px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-60"
        >
          {cargando ? "Evaluando…" : "Evaluar riesgo"}
        </button>
        <Link
          href="/alertas"
          className="rounded-xl border border-stone-300 px-3 py-2 text-[13px] font-medium text-stone-600"
        >
          Alertas
        </Link>
      </div>
    </article>
  );
}