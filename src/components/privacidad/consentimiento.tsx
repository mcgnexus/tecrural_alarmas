"use client";

import { useState } from "react";
import { VERSION_CONSENTIMIENTO as CURRENT_VERSION } from "@/lib/privacidad/consentimiento";

export function Consentimiento({ userId, onAceptado }: { userId: string; onAceptado?: () => void }) {
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (!privacy) {
      setError("Debes aceptar la política de privacidad.");
      return;
    }
    setGuardando(true);
    setError(null);
    try {
      const r = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, privacyConsent: true, marketingConsent: marketing, consentVersion: CURRENT_VERSION }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Error");
      }
      onAceptado?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-stone-900 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-stone-900">Privacidad — consentimiento explícito</h3>
      <p className="mt-1 text-sm leading-snug text-stone-700">
        Usamos tus datos solo para alertas agroclimáticas (finalidad clara, minimización). No consideramos que activar una alerta equivalga a aceptar publicidad.
      </p>
      <p className="mt-1 text-sm">
        <a href="/privacidad" className="font-semibold text-brand-800 underline">Política de privacidad</a> · Versión {CURRENT_VERSION}
      </p>

      <label className="mt-4 flex items-start gap-3 rounded-xl border-2 border-stone-300 p-3">
        <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} className="mt-1 h-5 w-5" />
        <span className="text-sm font-medium text-stone-900">
          Acepto la política de privacidad y el tratamiento de mis datos para alertas. <span className="font-bold">Obligatorio</span>
        </span>
      </label>

      <label className="mt-3 flex items-start gap-3 rounded-xl border-2 border-stone-200 p-3">
        <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-1 h-5 w-5" />
        <span className="text-sm font-medium text-stone-900">
          Acepto recibir comunicaciones comerciales de TecRural. <span className="text-stone-600">Opcional, separado</span>
        </span>
      </label>

      {error ? <p role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-2 text-sm font-semibold text-red-800">{error}</p> : null}

      <button onClick={guardar} disabled={guardando} className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-stone-900 px-5 py-3 text-base font-bold text-white hover:bg-black disabled:opacity-60">
        {guardando ? "Guardando…" : "Guardar preferencias"}
      </button>
      <p className="mt-2 text-xs text-stone-500">Guardamos la versión de la política aceptada y la fecha del consentimiento. Las comunicaciones comerciales se guardan por separado y son opcionales.</p>
    </div>
  );
}
