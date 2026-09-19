import type { Metadata } from "next";
import { ListaAvisosFitosanitarios } from "@/components/fitosanitario/lista-avisos";
import { RiesgoAgroclimatico } from "@/components/fitosanitario/riesgo-agroclimatico";

export const metadata: Metadata = {
  title: "Avisos fitosanitarios",
  description:
    "Información fitosanitaria oficial relevante para tus cultivos.",
};

export default function FitosanitarioPage() {
  return (
    <>
      <section>
        <h1 className="text-lg font-semibold text-stone-800">
          Avisos fitosanitarios
        </h1>
        <p className="mt-1 text-[13px] text-stone-500">
          Se separan estrictamente el aviso oficial y la estimación propia de
          TecRural.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-stone-700">
          Tipo 1 · Aviso oficial
        </h2>
        <ListaAvisosFitosanitarios />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-stone-700">
          Tipo 2 · Riesgo agroclimático TecRural
        </h2>
        <RiesgoAgroclimatico />
      </section>

      <p className="text-center text-[11px] text-stone-400">
        Ante dudas, consulta con tu técnico o los servicios oficiales.
      </p>
    </>
  );
}
