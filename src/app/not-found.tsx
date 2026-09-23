import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-12">
      <section className="w-full rounded-3xl border-2 border-earth-300 bg-white p-6 text-center shadow-sm sm:p-8">
        <Link href="/" aria-label="TecRural Campo, ir al inicio" className="mx-auto inline-flex items-center gap-2">
          <Image src="/TecRural_icono.png" alt="Logo de TecRural" width={48} height={48} preload />
          <span className="text-lg font-black text-olive-950">TecRural Campo</span>
        </Link>
        <p className="mt-6 text-sm font-bold uppercase tracking-widest text-olive-700">Error 404</p>
        <h1 className="mt-2 text-3xl font-black text-stone-950">No encontramos esta página</h1>
        <p className="mt-3 text-base leading-relaxed text-stone-700">
          Puede que el enlace haya cambiado o que la dirección esté escrita de otra forma. Vuelve al inicio y te ayudamos a encontrar lo que buscas.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-olive-800 px-5 py-3 font-bold text-white hover:bg-olive-900">
            Ir al inicio
          </Link>
          <Link href="/servicios" className="inline-flex min-h-12 items-center justify-center rounded-xl border-2 border-stone-300 px-5 py-3 font-bold text-stone-800 hover:bg-stone-50">
            Ver servicios
          </Link>
        </div>
        <Link href="/privacidad" className="mt-6 inline-flex min-h-11 items-center px-2 text-sm font-semibold text-olive-800 underline">
          Política de privacidad
        </Link>
      </section>
    </main>
  );
}
