import Link from "next/link";
import { HomeSinRegistro } from "@/components/campo/home-sin-registro";

export default function InicioPage() {
  return (
    <>
      <HomeSinRegistro />

      <section className="rounded-2xl border-2 border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-stone-900">Información fitosanitaria</h2>
        <p className="mt-1 text-base leading-snug text-stone-700">Avisos oficiales de RAIF (cuando el servicio los publica) y estimación propia de TecRural para tu cultivo.</p>
        <Link
          href="/fitosanitario"
          className="mt-3 inline-flex min-h-[48px] items-center justify-center gap-1 rounded-xl border-2 border-stone-900 bg-white px-4 py-3 text-base font-bold text-stone-900 hover:bg-stone-50"
        >
          Ver avisos fitosanitarios →
        </Link>
      </section>

      <p className="text-center text-sm leading-relaxed font-medium text-stone-600">
        TecRural no sustituye a AEMET, RAIF ni a un técnico agrícola. Te ayuda a interpretar los datos para tu parcela.
      </p>
    </>
  );
}