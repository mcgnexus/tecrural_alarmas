import type { Metadata } from "next";
import Link from "next/link";
const serviciosEnPreparacion = [
  { nombre: "Sensores y estación meteorológica", detalle: "Mediciones locales de temperatura, humedad del suelo, viento y lluvia." },
  { nombre: "Diagnóstico de fotografías", detalle: "Orientación sobre síntomas de hojas y frutos." },
  { nombre: "Informes de campaña", detalle: "Histórico de riesgos, demanda y decisiones." },
  { nombre: "Seguimiento de parcelas", detalle: "Revisión de alertas y acompañamiento técnico." },
];

export const metadata: Metadata = {
  title: "Servicios TecRural",
  description:
    "Servicios TecRural relacionados con el problema detectado en tu parcela.",
};

export default function ServiciosPage() {
  return (
    <>
      <section>
        <h1 className="text-2xl font-extrabold text-stone-950">Servicios TecRural</h1>
        <p className="mt-2 text-base leading-relaxed text-stone-700">Los servicios avanzados están en preparación y todavía no se pueden contratar. Puedes pedir información y te avisaremos cuando estén disponibles; no se realizará ningún cargo ni alta de suscripción.</p>
      </section>
      <section aria-label="Servicios en preparación" className="grid gap-3">
        {serviciosEnPreparacion.map((servicio) => (
          <article key={servicio.nombre} className="rounded-2xl border-2 border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-stone-900">{servicio.nombre}</h2>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Lista de espera</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">{servicio.detalle}</p>
            <p className="mt-2 text-sm font-semibold text-stone-700">Disponibilidad y precio: por confirmar. No se puede contratar todavía.</p>
            <Link href="/#captacion" className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl border-2 border-brand-800 px-4 py-2 text-base font-bold text-brand-900">Pedir información</Link>
          </article>
        ))}
      </section>
      <section className="rounded-2xl border-2 border-brand-800 bg-brand-50 p-5">
        <h2 className="text-lg font-bold text-stone-900">Disponible ahora</h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-700">Consulta gratis el tiempo general y los riesgos orientativos de helada y viento para tu zona. Los avisos por WhatsApp también se pueden solicitar sin coste.</p>
        <Link href="/#zona" className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand-800 px-5 py-3 text-base font-bold text-white">Consultar mi zona</Link>
      </section>
    </>
  );
}
