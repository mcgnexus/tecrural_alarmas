import type { Metadata } from "next";
import Link from "next/link";
import { GestionAvisos } from "@/components/avisos/gestion-avisos";
import { ResumenInteres } from "@/components/crm/resumen-interes";

export const metadata: Metadata = {
  title: "Ajustes",
  description: "Canales de alerta y preferencias de la aplicación.",
};

export default function ConfiguracionPage() {
  // Fase 3: ajustes públicos simplificados — canales premium ocultos, gestión fenológica reservada a /gestion (no vinculada)
  return (
    <>
      <section>
        <h1 className="text-lg font-semibold text-stone-800">Ajustes</h1>
        <p className="mt-1 text-[13px] text-stone-500">
          Recibe avisos por WhatsApp. Las parcelas se guardan asociadas a este dispositivo. Consulta la <Link href="/privacidad" className="font-semibold underline">política de privacidad</Link>.
        </p>
      </section>

      <GestionAvisos />
      {/* ResumenInteres y gestión fenológica ocultos temporalmente — conservados para premium */}
      <p className="text-xs text-stone-400">¿Necesitas sensores, diagnóstico o informes? <Link href="/#captacion" className="font-bold text-brand-800 underline">Recibir avisos de mi zona</Link> y te orientamos.</p>
    </>
  );
}
