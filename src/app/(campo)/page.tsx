import Link from "next/link";
import { RiesgoActual } from "@/components/riesgo/riesgo-actual";

export default function InicioPage() {
  return (
    <>
      <section>
        <h1 className="text-lg font-semibold text-stone-800">
          Riesgo agroclimático de tu parcela
        </h1>
        <p className="mt-1 text-[13px] leading-relaxed text-stone-500">
          Consulta el riesgo de hoy sin crearte cuenta. Datos fiables,
          contextualizados para tu cultivo y explicados de forma sencilla.
        </p>
      </section>

      <RiesgoActual />

      <section className="rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-stone-800">
          Información fitosanitaria
        </h2>
        <p className="mt-1 text-[13px] text-stone-500">
          Avisos oficiales de RAIF y normativa aplicable a tus cultivos.
        </p>
        <Link
          href="/fitosanitario"
          className="mt-3 inline-block rounded-xl bg-brand-50 px-4 py-2 text-[13px] font-semibold text-brand-800"
        >
          Ver avisos fitosanitarios
        </Link>
      </section>

      <p className="text-center text-[11px] leading-relaxed text-stone-400">
        TecRural no sustituye a AEMET, RAIF o SiAR ni a un técnico agrícola.
        Te ayuda a interpretar los datos para tu parcela.
      </p>
    </>
  );
}