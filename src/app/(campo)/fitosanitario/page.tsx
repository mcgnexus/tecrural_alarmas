import type { Metadata } from "next";
import { avisosFitosanitariosEjemplo } from "@/lib/fitosanitario/catalogo";

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
          Información de fuentes oficiales (RAIF). Próximamente se conectará en
          tiempo real con datos oficiales.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        {avisosFitosanitariosEjemplo.map((aviso) => (
          <article
            key={aviso.id}
            className="rounded-xl border border-stone-200 bg-white p-4"
          >
            <h2 className="text-sm font-semibold text-stone-800">
              {aviso.plaga}
            </h2>
            <p className="mt-0.5 text-xs italic text-stone-400">
              {aviso.organismo} · {aviso.cultivo}
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-stone-600">
              {aviso.recomendacion}
            </p>
            <a
              href={aviso.fuenteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[11px] text-brand-800 underline"
            >
              {aviso.fuente}
            </a>
          </article>
        ))}
      </section>

      <p className="text-center text-[11px] text-stone-400">
        Ante dudas, consulta con tu técnico o los servicios oficiales.
      </p>
    </>
  );
}