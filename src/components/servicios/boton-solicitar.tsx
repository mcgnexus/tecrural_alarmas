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
          evento: "presupuesto_intent",
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
      className="mt-3 w-full rounded-xl bg-brand-50 px-4 py-2 text-[13px] font-semibold text-brand-800 disabled:opacity-70"
    >
      {estado === "enviado"
        ? "Solicitado, te contactaremos"
        : estado === "enviando"
          ? "Enviando…"
          : etiqueta}
    </button>
  );
}
