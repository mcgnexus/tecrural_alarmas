import type { Metadata } from "next";
import Link from "next/link";
import { ListaAvisosFitosanitarios } from "@/components/fitosanitario/lista-avisos";
import { RiesgoAgroclimatico } from "@/components/fitosanitario/riesgo-agroclimatico";
import { enlaceWhatsapp } from "@/lib/config/contacto";
export const metadata: Metadata = { title: "Avisos fitosanitarios", description: "Información fitosanitaria oficial relevante para tus cultivos." };
export default function FitosanitarioPage() {
  const wa = enlaceWhatsapp("Hola, necesito ayuda para interpretar un aviso fitosanitario.");
  return <>
    <section><h1 className="text-[30px] font-black text-stone-950">Avisos fitosanitarios</h1><p className="mt-1 text-base text-stone-700">Separamos el aviso oficial de la estimación propia de TecRural.</p></section>
    <section><h2 className="mb-2 text-xl font-extrabold text-stone-900">Aviso oficial</h2><ListaAvisosFitosanitarios /></section>
    <section><h2 className="mb-2 text-xl font-extrabold text-stone-900">Riesgo agroclimático TecRural</h2><RiesgoAgroclimatico /></section>
    <section className="rounded-2xl border-2 border-earth-300 bg-wheat-50 p-5"><h2 className="text-xl font-extrabold text-stone-950">¿No sabes si debes actuar?</h2><p className="mt-1 text-base text-stone-700">Cuéntanos el cultivo y tu municipio. Te ayudamos a entender el siguiente paso.</p>{wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-emerald-700 px-5 text-base font-extrabold text-white">Consultar por WhatsApp</a> : <Link href="/#contacto" className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-olive-800 px-5 text-base font-bold text-white">Pedir una llamada</Link>}</section>
    <p className="text-center text-[13px] text-stone-600">Ante dudas, consulta con tu técnico o los servicios oficiales.</p>
  </>;
}
