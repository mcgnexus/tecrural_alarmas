"use client";

import { useEffect, useState } from "react";
import { MUNICIPIOS_RAIF } from "@/lib/raif/config";

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
  cobertura: string | null;
  region: string | null;
  plagaEnfermedad: string | null;
  fechaBoletin: string | null;
  urlArticulo: string | null;
  urlPdf: string | null;
  confianzaExtraccion: number | null;
}

interface RespuestaAvisos { disponible?: boolean; ultimaIngesta?: string | null; boletinMasReciente?: string | null; avisos?: AvisoOficial[] }

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

export function ListaAvisosFitosanitarios({
  province,
  limite,
}: {
  province?: string;
  limite?: number;
} = {}) {
  const [avisos, setAvisos] = useState<AvisoOficial[]>([]);
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provincia, setProvincia] = useState(province ?? "");
  const [municipio, setMunicipio] = useState("");
  const [cultivo, setCultivo] = useState("");
  const [region, setRegion] = useState("");
  const [plaga, setPlaga] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [ultimaIngesta, setUltimaIngesta] = useState<string | null>(null);
  const [boletinMasReciente, setBoletinMasReciente] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    const qs = new URLSearchParams();
    if (provincia) qs.set("province", provincia);
    if (municipio) qs.set("municipality", municipio);
    if (cultivo) qs.set("cropId", cultivo);
    if (region) qs.set("region", region);
    if (plaga.trim()) qs.set("pest", plaga.trim());
    if (desde) qs.set("from", desde);
    if (hasta) qs.set("to", `${hasta}T23:59:59.999Z`);
    qs.set("limit", String(limite ?? 50));
    const url = `/api/fitosanitario${qs.size ? `?${qs.toString()}` : ""}`;
    fetch(url, { cache: "no-store" })
       .then((resp) => (resp.ok ? (resp.json() as Promise<RespuestaAvisos>) : null))
      .then((datos) => {
        if (!activo) return;
        if (!datos) {
          setError("No se pudieron cargar los avisos oficiales.");
          return;
        }
        if (typeof datos.disponible === "boolean") setDisponible(datos.disponible);
        setUltimaIngesta(datos.ultimaIngesta ?? null);
        setBoletinMasReciente(datos.boletinMasReciente ?? null);
        setAvisos(Array.isArray(datos.avisos) ? datos.avisos : []);
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
  }, [provincia, municipio, cultivo, region, plaga, desde, hasta, limite]);

  if (disponible === false) {
    return (
      <p className="rounded-xl border border-dashed border-stone-300 bg-white p-4 text-[13px] text-stone-500">
        El servicio de avisos oficiales (RAIF) no está disponible en este momento.
      </p>
    );
  }
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

  const visibles = limite ? avisos.slice(0, limite) : avisos;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 rounded-xl border-2 border-stone-200 bg-stone-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-bold text-stone-800">Provincia<select value={provincia} onChange={(e) => setProvincia(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-300 bg-white px-3 font-normal"><option value="">Todas</option><option value="Granada">Granada</option></select></label>
        <label className="text-sm font-bold text-stone-800">Municipio<select value={municipio} onChange={(e) => setMunicipio(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-300 bg-white px-3 font-normal"><option value="">Todos</option>{MUNICIPIOS_RAIF.map((nombre) => <option key={nombre}>{nombre}</option>)}</select></label>
        <label className="text-sm font-bold text-stone-800">Cultivo<select value={cultivo} onChange={(e) => setCultivo(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-300 bg-white px-3 font-normal"><option value="">Todos</option><option value="almond">Almendro</option><option value="olive">Olivar</option><option value="pistachio">Pistacho</option><option value="cereal">Cereal</option><option value="avocado">Aguacate</option><option value="mango">Mango</option><option value="custard_apple">Chirimoya</option></select></label>
        <label className="text-sm font-bold text-stone-800">Región<select value={region} onChange={(e) => setRegion(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-300 bg-white px-3 font-normal"><option value="">Todas</option><option>Altiplano de Granada</option><option>Costa Tropical</option></select></label>
        <label className="text-sm font-bold text-stone-800 sm:col-span-2">Plaga o enfermedad<input value={plaga} onChange={(e) => setPlaga(e.target.value)} placeholder="Ej. repilo" className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-300 bg-white px-3 font-normal" /></label>
        <label className="text-sm font-bold text-stone-800">Desde<input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-300 bg-white px-3 font-normal" /></label>
        <label className="text-sm font-bold text-stone-800">Hasta<input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="mt-1 min-h-[44px] w-full rounded-lg border border-stone-300 bg-white px-3 font-normal" /></label>
      </div>
      <p className="text-[12px] text-stone-500">Última ingesta correcta: {ultimaIngesta ? formatearFecha(ultimaIngesta) : "sin datos"} · Boletín más reciente: {boletinMasReciente ? formatearFecha(boletinMasReciente) : "sin datos"}</p>
      {visibles.map((aviso) => (
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
            <Fila etiqueta="Boletín" valor={formatearFecha(aviso.fechaBoletin ?? aviso.fecha)} />
          </div>

          {aviso.cobertura && aviso.cobertura !== "municipal" ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-[13px] font-semibold text-amber-900">Información disponible a nivel {aviso.cobertura}.</p> : null}

          <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-stone-600">
            <span className="font-medium text-stone-500">Resumen: </span>
            {aviso.resumen}
          </p>

          <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-medium text-brand-800 underline">
          {aviso.urlArticulo || aviso.enlace ? (
            <a
              href={aviso.urlArticulo ?? aviso.enlace!}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[11px] font-medium text-brand-800 underline"
            >
              Enlace oficial
            </a>
          ) : null}
          {aviso.urlPdf ? <a href={aviso.urlPdf} target="_blank" rel="noopener noreferrer">PDF original</a> : null}
          </div>
        </article>
      ))}
      <p className="text-[12px] leading-relaxed text-stone-500">Fuente oficial: RAIF / Junta de Andalucía. Los avisos oficiales se muestran sin descargar el PDF durante la consulta.</p>
    </div>
  );
}
