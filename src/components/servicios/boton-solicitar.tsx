"use client";

import { useState } from "react";
import { obtenerDispositivoId } from "@/lib/datos/dispositivo";
import type { InteresLead } from "@/lib/dominio/leads";

export function BotonSolicitar({
  servicioKey,
  interes,
  etiqueta,
}: {
  servicioKey: string;
  interes: InteresLead;
  etiqueta: string;
}) {
  const [estado, setEstado] = useState<"inicial" | "enviando" | "enviado">(
    "inicial",
  );

  async function solicitar() {
    setEstado("enviando");
    try {
      const resp = await fetch("/api/crm/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispositivoId: obtenerDispositivoId(),
          evento: "solicitar_informacion",
          intereses: [interes],
          serviceKey: servicioKey,
          source: "app_campo",
        }),
      });
      if (!resp.ok) throw new Error();
      setEstado("enviado");
    } catch {
      setEstado("inicial");
    }
  }

  return (
    <button
      type="button"
      onClick={solicitar}
      disabled={estado !== "inicial"}
      className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-brand-800 bg-brand-50 px-4 py-3 text-base font-bold text-brand-900 hover:bg-brand-100 active:bg-brand-200 disabled:opacity-70"
    >
      <span aria-hidden="true">{estado === "enviado" ? "✓" : estado === "enviando" ? "⏳" : "→"}</span> {estado === "enviado"
        ? "Solicitado, te contactaremos"
        : estado === "enviando"
          ? "Enviando…"
          : etiqueta}
    </button>
  );
}
