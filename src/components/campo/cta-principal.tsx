"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParcelas } from "@/hooks/use-parcelas";

type Estado = "anonimo" | "con_ubicacion" | "con_parcela" | "recurrente" | "cualificado";

export function CtaPrincipal({ ubicacion }: { ubicacion: { lat: number; lon: number } | null }) {
  const { parcelas } = useParcelas();
  const [leadScore, setLeadScore] = useState<number | null>(null);
  const [visitas, setVisitas] = useState(0);

  useEffect(() => {
    const v = Number(localStorage.getItem("visitas") ?? "0") + 1;
    localStorage.setItem("visitas", String(v));
    setVisitas(v);
    // intentar cargar lead score si existe
    const anon = localStorage.getItem("dispositivoId") ?? "";
    if (anon) {
      fetch(`/api/lead-score?anonymousId=${encodeURIComponent(anon)}`).then((r) => r.json().then((j) => setLeadScore(j.score ?? null)).catch(()=>{}));
    }
  }, []);

  let estado: Estado = "anonimo";
  let texto = "Añadir mi cultivo";
  let href = "/#cultivo";
  let descripcion = "Personaliza alertas sin cuenta";

  if (leadScore !== null && leadScore >= 16) {
    estado = "cualificado";
    texto = "Solicitar información";
    href = "/servicios";
    descripcion = "Habla con TecRural";
  } else if (parcelas.length > 0 && visitas > 2) {
    estado = "recurrente";
    texto = "Mejorar precisión";
    href = "/parcelas";
    descripcion = "Indica estado fenológico";
  } else if (parcelas.length > 0) {
    estado = "con_parcela";
    texto = "Activar alertas";
    href = "/configuracion";
    descripcion = "Elige canal y nivel";
  } else if (ubicacion) {
    estado = "con_ubicacion";
    texto = "Crear mi parcela";
    href = "/parcelas";
    descripcion = "Guarda tu explotación";
  }

  return (
    <div className="rounded-2xl border-2 border-brand-800 bg-brand-800 p-5 text-white shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-100">{estado.replace("_", " ")}</p>
      <Link href={href} className="mt-2 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-base font-bold text-brand-900 hover:bg-brand-50">
        {texto} →
      </Link>
      <p className="mt-2 text-sm font-medium text-brand-100">{descripcion} — no vendemos como sistema profesional de diagnóstico agronómico en MVP</p>
    </div>
  );
}
