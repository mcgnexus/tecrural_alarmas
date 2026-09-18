"use client";

import { useParcelas } from "@/hooks/use-parcelas";
import { AlertaCard } from "@/components/riesgo/alerta-card";

export function ListaAlertas() {
  const { parcelas, cargando, error } = useParcelas();

  const conAlertas = parcelas.filter(
    (parcela) => (parcela.ultimaEvaluacion?.alertas.length ?? 0) > 0,
  );

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-600">
        {error}
      </p>
    );
  }

  if (!cargando && conAlertas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300 bg-white p-4 text-[13px] text-stone-500">
        No hay alertas aún. Evalúa el riesgo de alguna parcela y vuelve a
        consultar esta pantalla.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {conAlertas.map((parcela) => (
        <div key={parcela.id} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-stone-500">
            {parcela.nombre}
          </h3>
          {parcela.ultimaEvaluacion?.alertas.map((alerta) => (
            <AlertaCard key={alerta.id} alerta={alerta} />
          ))}
        </div>
      ))}
    </section>
  );
}