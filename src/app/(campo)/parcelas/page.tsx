import type { Metadata } from "next";
import { GestionParcelas } from "@/components/parcelas/gestion-parcelas";

export const metadata: Metadata = {
  title: "Parcelas",
  description: "Registra tus parcelas y su cultivo sin necesidad de cuenta.",
};

export default function ParcelasPage() {
  return (
    <>
      <section>
        <h1 className="text-lg font-semibold text-stone-800">Parcelas</h1>
        <p className="mt-1 text-[13px] text-stone-500">
          Registra tus parcelas para evaluar el riesgo según el cultivo.
        </p>
      </section>

      <GestionParcelas />
    </>
  );
}