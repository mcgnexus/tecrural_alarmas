"use client";

import { useEffect, useState } from "react";
import {
  avisoVigente,
  emojiFenomenoOficial,
  etiquetaFenomenoOficial,
  fenomenoOficial,
  type FenomenoOficial,
} from "@/lib/ui/avisos-oficiales";

type Ubicacion = { lat: number; lon: number; nombre?: string };

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
  if (s.includes("rojo") || s.includes("red") || s.includes("extreme")) {
    return "bg-red-100 text-red-800 border-red-300";
  }
  if (s.includes("naranja") || s.includes("orange") || s.includes("severe")) {
    return "bg-orange-100 text-orange-800 border-orange-300";
  }
  if (s.includes("amarillo") || s.includes("yellow") || s.includes("moderate")) {
    return "bg-amber-100 text-amber-800 border-amber-300";
  }
  return "bg-stone-100 text-stone-700 border-stone-300";
}

function etiquetaSeveridad(severidad: string, fenomeno: string): string {
  const s = severidad.toLowerCase();
  if (s.includes("amarillo") || s.includes("yellow")) return "Aviso amarillo";
  if (s.includes("naranja") || s.includes("orange")) return "Aviso naranja";
  if (s.includes("rojo") || s.includes("red")) return "Aviso rojo";
  if (s.includes("moderate")) return "Moderado";
  if (s.includes("severe")) return "Severo";
  if (s.includes("extreme")) return "Extremo";
  return severidad || fenomeno;
}

function formatearPeriodo(desde: string, hasta: string): string {
  const d = new Date(desde);
  const h = new Date(hasta);
  if (Number.isNaN(d.getTime()) || Number.isNaN(h.getTime())) return "—";
  const fmt = (f: Date) => f.toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return `${fmt(d)} → ${fmt(h)}`;
}

export function AvisosOficialesAemet({ ubicacion, region }: { ubicacion: Ubicacion; region?: string }) {
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

  const avisosRelevantes = avisos
    .map((aviso) => ({ ...aviso, fenomenoVisible: fenomenoOficial(aviso) }))
    .filter((aviso): aviso is typeof aviso & { fenomenoVisible: FenomenoOficial } =>
      aviso.fenomenoVisible !== null && avisoVigente(aviso),
    );

  const areasAviso = [...new Set(avisosRelevantes.map((aviso) => aviso.area.trim()).filter(Boolean))];
  const nombreMunicipio = (ubicacion.nombre ?? "").split(",")[0]?.trim();
  const notaArea =
    nombreMunicipio && areasAviso.length
      ? areasAviso
          .map(
            (area) =>
              `Para ${nombreMunicipio}${region ? `, tu zona «${region}»` : ""}, AEMET publica estos avisos por el área «${area}»: es una zona de aviso compartida por varios municipios, no una medición de tu parcela.`,
          )
          .join(" ")
      : null;

  return (
    <section id="avisos-aemet" className="scroll-mt-24 rounded-2xl border-2 border-sky-300 bg-sky-50 p-5 shadow-sm" aria-labelledby="avisos-aemet-titulo">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="avisos-aemet-titulo" className="text-xl font-extrabold text-stone-950">Avisos oficiales AEMET</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-sky-900">Fuente oficial · por zona</span>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-stone-700">Lluvia, temperatura mínima y viento previstos para el municipio. Son avisos meteorológicos oficiales, independientes de las alarmas agrícolas de TecRural.</p>

      {!cargando && !error && notaArea ? (
        <p className="mt-3 rounded-xl border border-sky-200 bg-white/80 p-3 text-sm leading-snug text-stone-700">
          <span aria-hidden="true">🗺️</span> {notaArea}
        </p>
      ) : null}

      {cargando ? <p role="status" className="mt-3 text-[15px] text-stone-600">Cargando avisos oficiales de AEMET…</p> : null}

      {!cargando && error ? <p className="mt-3 text-[14px] text-stone-500">No pudimos cargar los avisos oficiales ahora mismo.</p> : null}

      {!cargando && !error && avisosRelevantes.length === 0 ? (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[14px] font-semibold text-emerald-900">AEMET no publica avisos vigentes o previstos para lluvia, temperatura mínima o viento en esta zona.</p>
      ) : null}

      {!cargando && !error && avisosRelevantes.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {avisosRelevantes.map((aviso) => (
            <li key={aviso.id} className={`rounded-xl border-2 p-3 ${colorSeveridad(aviso.severity)}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[15px] font-extrabold"><span aria-hidden="true" className="mr-2">{emojiFenomenoOficial(aviso.fenomenoVisible)}</span>{aviso.headline}</span>
                <span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">{etiquetaSeveridad(aviso.severity, aviso.phenomenon)}</span>
              </div>
              <p className="mt-1 text-[13px] font-bold">{etiquetaFenomenoOficial(aviso.fenomenoVisible)}</p>
              <p className="mt-1 text-[13px] font-semibold">{formatearPeriodo(aviso.startsAt, aviso.endsAt)}</p>
              {aviso.area ? (
                <p className="mt-1 text-[12px] font-bold">
                  <span aria-hidden="true">📍</span> Área oficial AEMET: {aviso.area}
                </p>
              ) : null}
              {aviso.description ? <p className="mt-2 text-sm leading-snug">{aviso.description}</p> : null}
              {aviso.sourceUrl ? (
                <a href={aviso.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[12px] font-bold underline">Fuente oficial</a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="mt-3 text-[12px] leading-relaxed text-stone-600">Avisos oficiales de AEMET para un área municipal, no mediciones de la parcela. Consulta la fuente oficial para actualizaciones.</p>
    </section>
  );
}
