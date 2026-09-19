import type { Metadata } from "next";
import Link from "next/link";
import { GestionAvisos } from "@/components/avisos/gestion-avisos";
import { ResumenInteres } from "@/components/crm/resumen-interes";

export const metadata: Metadata = {
  title: "Ajustes",
  description: "Canales de alerta y preferencias de la aplicación.",
};

export default function ConfiguracionPage() {
  return (
    <>
      <section>
        <h1 className="text-lg font-semibold text-stone-800">Ajustes</h1>
        <p className="mt-1 text-[13px] text-stone-500">
          Elige cómo quieres recibir las alertas. Las parcelas se asocian de
          forma anónima a este dispositivo.
        </p>
      </section>

      <GestionAvisos />
      <ResumenInteres />

      <Link
        href="/gestion"
        className="block rounded-xl border border-stone-200 bg-white p-4 text-[13px] font-medium text-brand-800"
      >
        Gestión avanzada: catálogo fenológico, Kc y reglas por cultivo
      </Link>
    </>
  );
}
