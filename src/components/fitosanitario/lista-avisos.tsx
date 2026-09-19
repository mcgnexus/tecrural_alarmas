"use client";

import { useEffect, useState } from "react";

interface AvisoOficial {
  id: string;
  provider: string;
  fecha: string;
  cultivo: string | null;
  zona: string | null;
  titulo: string;
  resumen: string;
  enlace: string | null;
  severidad: string | null;
}

function etiquetaFuente(provider: string): string {
  return provider.toLowerCase() === "raif" ? "RAIF" : provider.toUpperCase();
}

function formatearFecha(valor: string): string {
  if (!valor) return "—";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return fecha.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <p className="text-[13px] text-stone-600">
      <span className="font-medium text-stone-500">{etiqueta}: </span>
      {valor}
    </p>
  );
}

export function ListaAvisosFitosanitarios() {
  const [avisos, setAvisos] = useState<AvisoOficial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    fetch("/api/fitosanitario", { cache: "no-store" })
      .then((resp) => (resp.ok ? (resp.json() as Promise<AvisoOficial[]>) : null))
      .then((datos) => {
        if (!activo) return;
        if (!datos) {
          setError("No se pudieron cargar los avisos oficiales.");
          return;
        }
        setAvisos(datos);
      })
      .catch(() => {
        if (activo) setError("No se pudieron cargar los avisos oficiales.");
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  if (cargando) {
    return <p className="text-[13px] text-stone-500">Cargando avisos…</p>;
  }
  if (error) {
    return <p className="text-[13px] font-medium text-red-600">{error}</p>;
  }
  if (avisos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300 bg-white p-4 text-[13px] text-stone-500">
        No hay avisos oficiales disponibles ahora mismo.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {avisos.map((aviso) => (
        <article
          key={aviso.id}
          className="rounded-xl border border-stone-200 bg-white p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Aviso oficial
            </span>
            {aviso.severidad ? (
              <span className="text-[10px] uppercase text-stone-400">
                {aviso.severidad}
              </span>
            ) : null}
          </div>

          <h2 className="mt-2 text-sm font-semibold text-stone-800">
            {aviso.titulo}
          </h2>

          <div className="mt-2 flex flex-col gap-0.5">
            <Fila etiqueta="Fuente" valor={etiquetaFuente(aviso.provider)} />
            <Fila etiqueta="Fecha" valor={formatearFecha(aviso.fecha)} />
            <Fila etiqueta="Cultivo" valor={aviso.cultivo ?? "—"} />
            <Fila etiqueta="Zona" valor={aviso.zona ?? "—"} />
          </div>

          <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-stone-600">
            <span className="font-medium text-stone-500">Resumen: </span>
            {aviso.resumen}
          </p>

          {aviso.enlace ? (
            <a
              href={aviso.enlace}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[11px] font-medium text-brand-800 underline"
            >
              Enlace oficial
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}
