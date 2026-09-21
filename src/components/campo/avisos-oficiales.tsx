"use client";

import { useEffect, useState } from "react";

type Ubicacion = { lat: number; lon: number };

type AvisoOficial = {
  id: string;
  provider: string;
  phenomenon: string;
  severity: string;
  startsAt: string;
  endsAt: string;
  area: string;
  headline: string;
  description?: string;
  sourceUrl?: string;
};

function colorSeveridad(severidad: string): string {
  const s = severidad.toLowerCase();
  if (s.includes("rojo") || s.includes("red") || s.includes("severe") || s.includes("extreme")) {
    return "bg-red-100 text-red-800 border-red-300";
  }
  if (s.includes("naranja") || s.includes("orange")) {
    return "bg-orange-100 text-orange-800 border-orange-300";
  }
  if (s.includes("amarillo") || s.includes("yellow")) {
    return "bg-amber-100 text-amber-800 border-amber-300";
  }
  return "bg-stone-100 text-stone-700 border-stone-300";
}

function formatearPeriodo(desde: string, hasta: string): string {
  const d = new Date(desde);
  const h = new Date(hasta);
  if (Number.isNaN(d.getTime()) || Number.isNaN(h.getTime())) return "—";
  const fmt = (f: Date) => f.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return `${fmt(d)} → ${fmt(h)}`;
}

export function AvisosOficialesAemet({ ubicacion }: { ubicacion: Ubicacion }) {
  const [avisos, setAvisos] = useState<AvisoOficial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activo = true;
    const qs = new URLSearchParams({ lat: String(ubicacion.lat), lon: String(ubicacion.lon) });
    fetch(`/api/v1/official-alerts?${qs.toString()}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<AvisoOficial[]>) : null))
      .then((datos) => {
        if (!activo) return;
        if (!datos) { setError(true); return; }
        setAvisos(Array.isArray(datos) ? datos : []);
      })
      .catch(() => { if (activo) setError(true); })
      .finally(() => { if (activo) setCargando(false); });
    return () => { activo = false; };
  }, [ubicacion]);

  return (
    <section className="rounded-2xl border-2 border-earth-300 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-extrabold text-stone-950">Avisos oficiales de tu zona</h2>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Gratis, sin registro</span>
      </div>

      {cargando ? <p className="mt-3 text-[15px] text-stone-600">Cargando avisos oficiales…</p> : null}

      {!cargando && error ? <p className="mt-3 text-[14px] text-stone-500">No pudimos cargar los avisos oficiales ahora mismo.</p> : null}

      {!cargando && !error && avisos.length === 0 ? (
        <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-[14px] font-semibold text-emerald-900">Sin avisos oficiales activos en tu zona.</p>
      ) : null}

      {!cargando && !error && avisos.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {avisos.map((aviso) => (
            <li key={aviso.id} className={`rounded-xl border-2 p-3 ${colorSeveridad(aviso.severity)}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[15px] font-extrabold">{aviso.headline}</span>
                <span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">{aviso.severity || aviso.phenomenon}</span>
              </div>
              <p className="mt-1 text-[13px] font-semibold">{formatearPeriodo(aviso.startsAt, aviso.endsAt)}</p>
              {aviso.area ? <p className="text-[12px]">{aviso.area}</p> : null}
              {aviso.sourceUrl ? (
                <a href={aviso.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[12px] font-bold underline">Fuente oficial</a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-[12px] leading-relaxed text-stone-500">Fuente: {avisos[0]?.provider ?? "AEMET"}. TecRural no sustituye a los servicios oficiales.</p>
    </section>
  );
}
