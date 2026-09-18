import type { Metadata } from "next";
import { ListaAlertas } from "@/components/alertas/lista-alertas";

export const metadata: Metadata = {
  title: "Alertas",
  description:
    "Consulta el motivo de cada alerta agroclimática de tus parcelas.",
};

export default function AlertasPage() {
  return (
    <>
      <section>
        <h1 className="text-lg font-semibold text-stone-800">Alertas</h1>
        <p className="mt-1 text-[13px] text-stone-500">
          Cada alerta indica el motivo y la fuente de los datos que la generan.
        </p>
      </section>

      <ListaAlertas />
    </>
  );
}