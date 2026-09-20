"use client";

import Link from "next/link";
import type { Alerta } from "@/lib/dominio/tipos";

type Cta = {
  key: string;
  pregunta: string;
  etiqueta: string;
  href: string;
  interes: string;
};

const CTAS: Record<string, Cta> = {
  helada: {
    key: "helada",
    pregunta: "¿Quieres medir la temperatura real de esta parcela?",
    etiqueta: "Sensor TecRural",
    href: "/servicios#sensor-temperatura",
    interes: "SENSORS",
  },
  agua: {
    key: "agua",
    pregunta: "¿Quieres conocer la humedad real del suelo?",
    etiqueta: "Sensor de humedad TecRural",
    href: "/servicios#sensor-humedad",
    interes: "SENSORS",
  },
  fitosanitario: {
    key: "fitosanitario",
    pregunta: "¿Has visto síntomas?",
    etiqueta: "Analizar una fotografía",
    href: "/servicios#diagnostico-foto",
    interes: "AI_DIAGNOSIS",
  },
  general: {
    key: "general",
    pregunta: "¿Quieres mejorar la precisión?",
    etiqueta: "Mejorar precisión con estación local",
    href: "/servicios#estacion-local",
    interes: "WEATHER_STATION",
  },
};

function elegirCta(alertas: Alerta[]): Cta | null {
  if (!alertas || alertas.length === 0) return CTAS.general;
  const tipos = new Set(alertas.map((a) => a.tipo as string));
  if (tipos.has("helada")) return CTAS.helada;
  if (tipos.has("demanda-hidrica")) return CTAS.agua;
  if (tipos.has("fitosanitario")) return CTAS.fitosanitario;
  // si solo hay otros (viento, lluvia, calor) cae en general
  return CTAS.general;
}

export function CtaContextual({ alertas }: { alertas: Alerta[] }) {
  const cta = elegirCta(alertas);
  if (!cta) return null;
  return (
    <div className="rounded-2xl border-2 border-brand-200 bg-brand-50 p-5 shadow-sm">
      <p className="text-base font-bold leading-snug text-stone-900">{cta.pregunta}</p>
      <Link
        href={cta.href}
        className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 py-3 text-base font-bold text-white hover:bg-brand-900"
      >
        {cta.etiqueta} →
      </Link>
    </div>
  );
}
