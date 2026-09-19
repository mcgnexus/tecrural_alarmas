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
      <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-4 text-base font-semibold text-red-800">
        {error}
      </p>
    );
  }

  if (!cargando && conAlertas.length === 0) {
    return (
      <p className="rounded-xl border-2 border-dashed border-stone-400 bg-white p-5 text-base font-medium text-stone-700">
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