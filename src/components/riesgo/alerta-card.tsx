import { useState } from "react";
import type { Alerta, Severidad } from "@/lib/alertas/tipos";
import { emojiSeveridad, emojiTipo, etiquetaSeveridad, etiquetaTipo } from "@/lib/ui/alertas";
import { AlertaDetalle } from "./alerta-detalle";

const estilos: Record<Severidad, { clase: string; borde: string; fondo: string; emoji: string }> = {
  critica: { clase: "bg-red-100 text-red-800 border-red-300", borde: "border-red-300", fondo: "from-red-50", emoji: "🔴" },
  alerta: { clase: "bg-amber-100 text-amber-800 border-amber-300", borde: "border-amber-300", fondo: "from-amber-50", emoji: "🟠" },
  aviso: { clase: "bg-yellow-100 text-yellow-800 border-yellow-300", borde: "border-yellow-300", fondo: "from-yellow-50", emoji: "🟡" },
  info: { clase: "bg-stone-100 text-stone-800 border-stone-300", borde: "border-stone-300", fondo: "from-stone-50", emoji: "🟢" },
};

export function AlertaCard({ alerta }: { alerta: Alerta }) {
  const [abierto, setAbierto] = useState(false);
  const estilo = estilos[alerta.severidad] ?? estilos.info;
  const emoji = emojiTipo(alerta.tipo);

  return (
    <article className={`overflow-hidden rounded-2xl border-2 bg-gradient-to-b to-white shadow-sm ${estilo.borde} ${estilo.fondo}`}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-start gap-3 p-4 text-left hover:bg-stone-50/60"
      >
        <span aria-hidden="true" className="text-3xl leading-none">{emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold ${estilo.clase}`} aria-label={`Nivel ${etiquetaSeveridad(alerta.severidad)}`}>
              <span aria-hidden="true" className="text-base leading-none">{emojiSeveridad(alerta.severidad)}</span>
              {etiquetaSeveridad(alerta.severidad)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-900 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              {etiquetaTipo(alerta.tipo)}
            </span>
          </span>
          <span className="block text-base font-bold leading-tight text-stone-900">{alerta.titulo}</span>
          <span className="mt-2 block text-base leading-relaxed text-stone-800">{alerta.mensaje}</span>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-800">
            <span aria-hidden="true">{abierto ? "▴" : "▾"}</span>
            {abierto ? "Ocultar explicación detallada" : "Toca para entenderla bien"}
          </span>
        </span>
      </button>

      {abierto ? (
        <div className="border-t border-stone-200 bg-white/80 px-4 pb-4 pt-4">
          <AlertaDetalle alerta={alerta} />
        </div>
      ) : null}

      <a
        href={alerta.fuente.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mx-4 mb-4 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-brand-800 underline underline-offset-4 hover:text-brand-900"
      >
        📡 Fuente: {alerta.fuente.nombre} ↗
      </a>
    </article>
  );
}
