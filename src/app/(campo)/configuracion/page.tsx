import type { Metadata } from "next";
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
    </>
  );
}
