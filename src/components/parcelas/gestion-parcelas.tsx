"use client";

import { useParcelas } from "@/hooks/use-parcelas";
import { RegistroParcela } from "./registro-parcela";
import { TarjetaParcela } from "./tarjeta-parcela";

export function GestionParcelas() {
  const { parcelas, cargando, error, refrescar } = useParcelas();

  return (
    <div className="flex flex-col gap-3">
      <RegistroParcela onGuardada={refrescar} />

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-600">
          {error}
        </p>
      ) : null}

      {!cargando && parcelas.length === 0 && !error ? (
        <p className="rounded-xl border border-dashed border-stone-300 bg-white p-4 text-[13px] text-stone-500">
          Aún no tienes parcelas. Guarda la primera para empezar a recibir
          valoraciones de riesgo.
        </p>
      ) : null}

      {!cargando
        ? parcelas.map((parcela) => (
            <TarjetaParcela key={parcela.id} parcela={parcela} onCambio={refrescar} />
          ))
        : null}
    </div>
  );
}