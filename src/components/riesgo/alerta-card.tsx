import type { Alerta, Severidad } from "@/lib/alertas/tipos";

const estilos: Record<Severidad, { etiqueta: string; clase: string }> = {
  critica: { etiqueta: "Crítico", clase: "bg-red-50 text-red-700" },
  alerta: { etiqueta: "Alerta", clase: "bg-amber-50 text-amber-700" },
  aviso: { etiqueta: "Aviso", clase: "bg-yellow-50 text-yellow-700" },
  info: { etiqueta: "Info", clase: "bg-brand-50 text-brand-700" },
};

export function AlertaCard({ alerta }: { alerta: Alerta }) {
  const estilo = estilos[alerta.severidad] ?? estilos.info;
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${estilo.clase}`}
        >
          {estilo.etiqueta}
        </span>
        <span className="text-[11px] capitalize text-stone-400">
          {alerta.tipo.replace(/-/g, " ")}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-stone-800">{alerta.titulo}</h3>
      <p className="mt-1 text-[13px] leading-relaxed text-stone-600">
        {alerta.mensaje}
      </p>
      <a
        href={alerta.fuente.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-[11px] text-brand-800 underline"
      >
        Fuente: {alerta.fuente.nombre}
      </a>
    </article>
  );
}