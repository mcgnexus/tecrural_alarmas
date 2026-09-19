"use client";

import { useEffect, useState } from "react";
import { asegurarSesionDispositivo, obtenerDispositivoId } from "@/lib/datos/dispositivo";
import type { InteresLead, ResumenLead } from "@/lib/dominio/leads";

const ETIQUETA_NIVEL: Record<string, string> = {
  frio: "Frío",
  tibio: "Tibio",
  caliente: "Caliente",
  cualificado: "Cualificado",
};

const ETIQUETA_INTERES: Record<string, string> = {
  SENSORS: "Sensores",
  WEATHER_STATION: "Estación meteorológica",
  AI_DIAGNOSIS: "Diagnóstico vegetal",
  IRRIGATION: "Riego",
  REPORTS: "Informes y seguimiento",
};

export function ResumenInteres() {
  const [resumen, setResumen] = useState<ResumenLead | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    let cancelado = false;
    asegurarSesionDispositivo()
      .then(() => {
        if (cancelado) return null;
        return fetch(
          `/api/crm/lead?dispositivo=${encodeURIComponent(obtenerDispositivoId())}`,
          { cache: "no-store" },
        ).then((resp) => (resp.ok ? (resp.json() as Promise<ResumenLead>) : null));
      })
      .then((datos) => {
        if (!activo) return;
        setResumen(datos);
        setCargando(false);
      })
      .catch(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
      cancelado = true;
    };
  }, []);

  if (cargando) {
    return (
      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-800">Tu interés</h2>
        <p className="mt-2 text-[13px] text-stone-500">Cargando…</p>
      </section>
    );
  }

  const score = resumen?.score ?? 0;
  const intereses = (resumen?.intereses ?? []) as InteresLead[];

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-stone-800">Tu interés</h2>
      <p className="mt-1 text-[13px] text-stone-500">
        Nos ayuda a saber qué servicios TecRural pueden encajarte.
      </p>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[13px] text-stone-600">
          Nivel: {ETIQUETA_NIVEL[resumen?.nivel ?? "frio"] ?? "Frío"}
        </span>
        <span className="text-[13px] font-semibold text-brand-800">
          {score} puntos
        </span>
      </div>

      {intereses.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {intereses.map((interes) => (
            <li
              key={interes}
              className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-medium text-brand-800"
            >
              {ETIQUETA_INTERES[interes] ?? interes}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[11px] text-stone-400">
          Aún sin intereses marcados. Puedes pedir información en Servicios.
        </p>
      )}
    </section>
  );
}
