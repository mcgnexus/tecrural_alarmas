"use client";

import { useState } from "react";

type Lead = {
  nombre: string;
  municipio: string;
  cultivo: string;
  parcelas: number;
  score: number;
  clasificacion: string;
  ultimaActividad: string | null;
  interes: string;
  contacto: string;
  consentVersion: string | null;
  consentTimestamp: string | null;
  origen: string;
};

export function TablaLeads() {
  const [filtros, setFiltros] = useState({ municipio: "", cultivo: "", scoreMin: "", scoreMax: "", servicio: "", desde: "", hasta: "" });
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buscar() {
    setCargando(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (filtros.municipio) qs.set("municipio", filtros.municipio);
      if (filtros.cultivo) qs.set("cultivo", filtros.cultivo);
      if (filtros.scoreMin) qs.set("scoreMin", filtros.scoreMin);
      if (filtros.scoreMax) qs.set("scoreMax", filtros.scoreMax);
      if (filtros.servicio) qs.set("servicio", filtros.servicio);
      if (filtros.desde) qs.set("desde", filtros.desde);
      if (filtros.hasta) qs.set("hasta", filtros.hasta);
      qs.set("limit", "100");
      const r = await fetch(`/api/admin/leads?${qs.toString()}`, { cache: "no-store" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? `HTTP ${r.status}`);
      }
      const j = (await r.json()) as { leads: Lead[] };
      setLeads(j.leads);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-stone-900">Tabla de Leads — orden score DESC</h2>
      <p className="mt-1 text-sm text-stone-600">Filtros: municipio · cultivo · score · servicio · última actividad</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <input aria-label="Filtrar por municipio" placeholder="Municipio" value={filtros.municipio} onChange={(e) => setFiltros({ ...filtros, municipio: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-stone-300 px-3 py-2 text-sm" />
        <input aria-label="Filtrar por cultivo" placeholder="Cultivo" value={filtros.cultivo} onChange={(e) => setFiltros({ ...filtros, cultivo: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-stone-300 px-3 py-2 text-sm" />
        <input aria-label="Puntuación mínima" placeholder="Score min" type="number" value={filtros.scoreMin} onChange={(e) => setFiltros({ ...filtros, scoreMin: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-stone-300 px-3 py-2 text-sm" />
        <input aria-label="Puntuación máxima" placeholder="Score max" type="number" value={filtros.scoreMax} onChange={(e) => setFiltros({ ...filtros, scoreMax: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-stone-300 px-3 py-2 text-sm" />
        <input aria-label="Filtrar por servicio" placeholder="Servicio" value={filtros.servicio} onChange={(e) => setFiltros({ ...filtros, servicio: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-stone-300 px-3 py-2 text-sm" />
        <input aria-label="Filtrar desde fecha" placeholder="Desde (YYYY-MM-DD)" type="date" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} className="min-h-[44px] rounded-xl border-2 border-stone-300 px-3 py-2 text-sm" />
        <input aria-label="Filtrar hasta fecha" placeholder="Hasta" type="date" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} className="min-h-[44px] col-span-2 rounded-xl border-2 border-stone-300 px-3 py-2 text-sm" />
      </div>
      <button onClick={buscar} disabled={cargando} className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-stone-900 px-5 py-2 text-sm font-bold text-white hover:bg-black disabled:opacity-60">
        {cargando ? "Buscando…" : "Filtrar (score DESC)"}
      </button>
      {error ? <p role="alert" className="mt-2 rounded-xl border-2 border-red-300 bg-red-50 p-2 text-sm font-semibold text-red-800">{error}</p> : null}

      <div className="mt-4 overflow-x-auto rounded-xl border-2 border-stone-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-900 text-white">
            <tr>
              <th className="px-3 py-2 font-bold">Nombre</th>
              <th className="px-3 py-2 font-bold">Municipio</th>
              <th className="px-3 py-2 font-bold">Cultivo</th>
              <th className="px-3 py-2 font-bold">Parcelas</th>
              <th className="px-3 py-2 font-bold">Score</th>
              <th className="px-3 py-2 font-bold">Clasificación</th>
              <th className="px-3 py-2 font-bold">Última actividad</th>
              <th className="px-3 py-2 font-bold">Interés</th>
              <th className="px-3 py-2 font-bold">Contacto</th>
              <th className="px-3 py-2 font-bold">Origen</th>
              <th className="px-3 py-2 font-bold">Consentimiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-4 text-center text-sm text-stone-600">Sin resultados. Pulsa Filtrar.</td>
              </tr>
            ) : (
              leads.map((l, i) => (
                <tr key={i} className="hover:bg-stone-50">
                  <td className="px-3 py-2 font-semibold">{l.nombre}</td>
                  <td className="px-3 py-2">{l.municipio}</td>
                  <td className="px-3 py-2">{l.cultivo}</td>
                  <td className="px-3 py-2 text-center">{l.parcelas}</td>
                  <td className="px-3 py-2 text-center font-bold">{l.score}</td>
                  <td className="px-3 py-2"><span className="rounded-full bg-stone-900 px-2 py-1 text-xs font-bold text-white">{l.clasificacion}</span></td>
                  <td className="px-3 py-2 text-xs">{l.ultimaActividad ? new Date(l.ultimaActividad).toLocaleDateString("es-ES") : "—"}</td>
                  <td className="px-3 py-2 text-xs">{l.interes}</td>
                  <td className="px-3 py-2 text-xs">{l.contacto}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${l.origen === "contacto" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-700"}`}>
                      {l.origen === "contacto" ? "Contacto" : "Cuenta"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {l.consentTimestamp
                      ? `${l.consentVersion ?? "—"} · ${new Date(l.consentTimestamp).toLocaleDateString("es-ES")}`
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
