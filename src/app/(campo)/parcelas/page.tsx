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
          Tus parcelas se guardan en la nube asociadas de forma segura a este dispositivo. Al activar una cuenta podrás recuperarlas desde otros dispositivos. Puedes eliminar cada parcela cuando quieras.
        </p>
      </section>

      <GestionParcelas />
    </>
  );
}
