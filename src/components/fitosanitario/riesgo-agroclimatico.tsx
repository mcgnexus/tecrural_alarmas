"use client";

import { useEffect, useState } from "react";
import { useParcelas } from "@/hooks/use-parcelas";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { colorTemperatura, etiquetaTermica } from "@/lib/ui/temperatura";

interface AvisoAgro {
  nivel: string;
  cultivo: string;
  titulo: string;
  mensaje: string;
  disclaimer: string;
  condiciones: {
    temperaturaC: number;
    humedadRelativaPct: number;
    precipitacionUltimaHoraMm: number;
  };
  parcelaNombre: string;
}

async function evaluarParcela(parcela: {
  nombre: string;
  latitud: number;
  longitud: number;
  cultivo: CulturaId;
}): Promise<AvisoAgro | null> {
  const resp = await fetch(
    `/api/fitosanitario/agroclimatico?lat=${parcela.latitud}&lon=${parcela.longitud}&cultivo=${parcela.cultivo}`,
    { cache: "no-store" },
  );
  if (!resp.ok) return null;
  const dato = (await resp.json()) as Omit<AvisoAgro, "parcelaNombre"> | null;
  return dato ? { ...dato, parcelaNombre: parcela.nombre } : null;
}

export function RiesgoAgroclimatico() {
  const { parcelas, cargando } = useParcelas();
  const [avisos, setAvisos] = useState<AvisoAgro[]>([]);
  const [evaluando, setEvaluando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    if (cargando) return;

    const tarea: Promise<AvisoAgro[]> =
      parcelas.length === 0
        ? Promise.resolve([])
        : Promise.all(
            parcelas.map((parcela) =>
              evaluarParcela(parcela).catch(() => null),
            ),
          ).then((lista) => lista.filter((x): x is AvisoAgro => x !== null));

    tarea
      .then((lista) => {
        if (!activo) return;
        setAvisos(lista);
        setEvaluando(false);
      })
      .catch(() => {
        if (!activo) return;
        setError("No se pudo evaluar el riesgo agroclimático.");
        setEvaluando(false);
      });

    return () => {
      activo = false;
    };
  }, [parcelas, cargando]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] text-stone-500">
        Estimación propia de TecRural a partir de la previsión meteorológica
        (no oficial).
      </p>

      {error ? (
        <p className="text-[13px] font-medium text-red-600">{error}</p>
      ) : null}

      {cargando || evaluando ? (
        <p className="text-[13px] text-stone-500">Evaluando…</p>
      ) : parcelas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white p-4 text-[13px] text-stone-500">
          Añade una parcela para ver el contexto agroclimático de tu cultivo.
        </p>
      ) : avisos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white p-4 text-[13px] text-stone-500">
          Sin condiciones meteorológicas destacables ahora mismo.
        </p>
      ) : (
        avisos.map((aviso, indice) => (
          <article
            key={`${aviso.parcelaNombre}-${indice}`}
            className="rounded-xl border border-amber-200 bg-amber-50/40 p-4"
          >
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Estimación TecRural
            </span>
            <h3 className="mt-2 text-sm font-semibold text-stone-800">
              {aviso.titulo}
            </h3>
            <p className="mt-0.5 text-[11px] text-stone-500">
              {aviso.cultivo} · {aviso.parcelaNombre}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-stone-600">
              {aviso.mensaje}
            </p>
            <p className="mt-2 text-[11px] text-stone-400">
              T{" "}
              <span title={etiquetaTermica(aviso.condiciones.temperaturaC)} className={`font-bold ${colorTemperatura(aviso.condiciones.temperaturaC)}`}>
                {aviso.condiciones.temperaturaC} °C
              </span>{" "}
              · HR {aviso.condiciones.humedadRelativaPct} % · precip. 1 h{" "}
              {aviso.condiciones.precipitacionUltimaHoraMm} mm
            </p>
            <p className="mt-2 text-[11px] font-medium text-stone-500">
              {aviso.disclaimer}
            </p>
          </article>
        ))
      )}

      <p className="text-[11px] font-medium text-stone-500">
        Esto no constituye un diagnóstico fitosanitario.
      </p>
    </div>
  );
}
