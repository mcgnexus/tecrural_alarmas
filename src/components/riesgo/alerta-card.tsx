import { useState } from "react";
import type { Alerta, Severidad } from "@/lib/alertas/tipos";
import { AlertaDetalle } from "./alerta-detalle";

const estilos: Record<Severidad, { etiqueta: string; clase: string; icono: string; borde: string }> = {
  critica: { etiqueta: "Crítico", clase: "bg-red-100 text-red-800 border-red-300", icono: "!", borde: "border-red-300" },
  alerta: { etiqueta: "Alerta", clase: "bg-amber-100 text-amber-800 border-amber-300", icono: "▲", borde: "border-amber-300" },
  aviso: { etiqueta: "Aviso", clase: "bg-yellow-100 text-yellow-800 border-yellow-300", icono: "●", borde: "border-yellow-300" },
  info: { etiqueta: "Info", clase: "bg-stone-100 text-stone-800 border-stone-300", icono: "i", borde: "border-stone-300" },
};

export function AlertaCard({ alerta }: { alerta: Alerta }) {
  const [abierto, setAbierto] = useState(false);
  const estilo = estilos[alerta.severidad] ?? estilos.info;
  return (
    <article className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${estilo.borde}`}>
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold ${estilo.clase}`}
          aria-label={`Nivel ${estilo.etiqueta}`}
        >
          <span aria-hidden="true" className="text-base leading-none">{estilo.icono}</span>
          {estilo.etiqueta}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-stone-900 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          {alerta.tipo.replace(/-/g, " ")}
        </span>
      </div>
      <h3 className="text-base font-bold leading-tight text-stone-900">{alerta.titulo}</h3>
      <p className="mt-2 text-base leading-relaxed text-stone-800">
        {alerta.mensaje}
      </p>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="mt-3 inline-flex min-h-[44px] items-center gap-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-2 text-sm font-bold text-stone-900 hover:bg-stone-50"
      >
        <span aria-hidden="true">{abierto ? "▴" : "▾"}</span> {abierto ? "Ocultar detalle" : "Ver detalle"}
      </button>
      {abierto ? (
        <div className="mt-4">
          <AlertaDetalle alerta={alerta} />
        </div>
      ) : null}
      <a
        href={alerta.fuente.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-900"
      >
        Fuente: {alerta.fuente.nombre} ↗
      </a>
    </article>
  );
}