"use client";

import { useParcelas } from "@/hooks/use-parcelas";
import { AlertaCard } from "@/components/riesgo/alerta-card";

export function ListaAlertas() {
  const { parcelas, cargando, error } = useParcelas();

  const evaluadas = parcelas.filter((parcela) => parcela.ultimaEvaluacion);

  if (error) {
    return (
      <p role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-4 text-base font-semibold text-red-800">
        {error}
      </p>
    );
  }

  if (!cargando && evaluadas.length === 0) {
    return (
      <p className="rounded-xl border-2 border-dashed border-stone-400 bg-white p-5 text-base font-medium text-stone-700">
        No hay alertas aún. Evalúa el riesgo de alguna parcela y vuelve a
        consultar esta pantalla.
      </p>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      {evaluadas.map((parcela) => {
        const evaluacion = parcela.ultimaEvaluacion!;
        const tieneAlertas = evaluacion.alertas.length > 0;
        const nivel = evaluacion.alertas.reduce((mayor, alerta) => {
          const orden: Record<string, number> = { info: 0, aviso: 1, alerta: 2, critica: 3 };
          return (orden[alerta.severidad] ?? 0) > (orden[mayor] ?? 0) ? alerta.severidad : mayor;
        }, "info");
        return (
        <div key={parcela.id} className="flex flex-col gap-2">
          <div className="rounded-xl border-2 border-stone-200 bg-white p-4">
            <h3 className="text-base font-bold text-stone-900">{parcela.nombre}</h3>
            <p className="mt-1 text-sm font-semibold text-stone-700">Cultivo: {parcela.cultivo}</p>
            <p className="text-sm text-stone-600">Ubicación: {parcela.latitud.toFixed(4)}, {parcela.longitud.toFixed(4)}</p>
            <p className="text-sm text-stone-600">Nivel de riesgo: <strong>{tieneAlertas ? nivel : "Sin riesgo"}</strong></p>
            <p className="text-sm text-stone-600">Evaluada: {new Date(evaluacion.evaluadoEl).toLocaleString("es-ES")}</p>
            <p className="text-sm text-stone-600">Fuente: {evaluacion.fuente.nombre}</p>
          </div>
          {evaluacion.alertas.map((alerta) => (
            <AlertaCard key={alerta.id} alerta={alerta} />
          ))}
          {!tieneAlertas ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">Evaluación completada: no se han detectado riesgos relevantes.</p> : null}
        </div>
        );
      })}
    </section>
  );
}
