"use client";

import { useState } from "react";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { asegurarSesionDispositivo, obtenerDispositivoId } from "@/lib/datos/dispositivo";

export function MejorarPrecision({ parcelaId, cultivo, fenofaseActual, onActualizado }: { parcelaId: string; cultivo: CulturaId; fenofaseActual: string | null; onActualizado: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [fenofase, setFenofase] = useState<string>(fenofaseActual ?? "");
  const [guardando, setGuardando] = useState(false);

  const cultura = catalogoCultivos[cultivo];

  async function guardar() {
    await asegurarSesionDispositivo();
    if (!fenofase) return;
    setGuardando(true);
    try {
      // Para MVP, re-evaluamos con fenofase indicada (no persistimos obligatorio)
      await fetch(`/api/parcelas/${parcelaId}/evaluar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dispositivoId: obtenerDispositivoId(), fenofaseId: fenofase }),
      });
      onActualizado();
      setAbierto(false);
    } finally {
      setGuardando(false);
    }
  }

  if (!abierto) {
    return (
      <div className="rounded-2xl border-2 border-brand-200 bg-brand-50 p-4">
        <p className="text-base font-bold text-stone-900">¿Quieres mejorar la precisión de las alertas?</p>
        <p className="mt-1 text-sm leading-snug text-stone-700">Indica en qué fase está tu cultivo. No es obligatorio.</p>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-base font-bold text-brand-800 shadow-sm hover:bg-brand-100 border-2 border-brand-800"
        >
          🌱 Indicar estado del cultivo
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-brand-800 bg-white p-4 shadow-sm">
      <h4 className="text-base font-bold text-stone-900">Indicar estado del cultivo</h4>
      <p className="mt-1 text-sm text-stone-600">Opcional — puedes omitirlo y usaremos la fase estimada por fecha.</p>
      <label className="mt-3 block text-sm font-bold text-stone-900">Fase fenológica</label>
      <select
        value={fenofase}
        onChange={(e) => setFenofase(e.target.value)}
        className="mt-1 min-h-[48px] w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-base font-medium"
      >
        <option value="">Automática ({cultura.fenologia.find((f) => f.mesDesde <= new Date().getMonth() + 1 && f.mesHasta >= new Date().getMonth() + 1)?.etiqueta ?? "estimada"})</option>
        {cultura.fenologia.map((f) => (
          <option key={f.id} value={f.id}>{f.etiqueta}</option>
        ))}
      </select>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setAbierto(false)} className="min-h-[44px] flex-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-2 text-sm font-bold">Cancelar</button>
        <button type="button" onClick={guardar} disabled={guardando || !fenofase} className="min-h-[44px] flex-1 rounded-xl bg-brand-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{guardando ? "Guardando…" : "Guardar"}</button>
      </div>
    </div>
  );
}
