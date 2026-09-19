import type { Metadata } from "next";
import { GestionCatalogo } from "@/components/gestion/gestion-catalogo";
import { GestionReglas } from "@/components/gestion/gestion-reglas";

export const metadata: Metadata = {
  title: "Gestión",
  description: "Catálogo fenológico, Kc y reglas de riesgo por cultivo.",
};

export default function GestionPage() {
  return (
    <>
      <section>
        <h1 className="text-lg font-semibold text-stone-800">Gestión</h1>
        <p className="mt-1 text-[13px] text-stone-500">
          Administra el catálogo fenológico (con sus Kc), valida coeficientes y
          define reglas de riesgo por cultivo o estado.
        </p>
      </section>

      <GestionCatalogo />
      <GestionReglas />
    </>
  );
}
