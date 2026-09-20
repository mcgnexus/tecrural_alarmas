import type { Metadata } from "next";
import Link from "next/link";
import { ListaAlertas } from "@/components/alertas/lista-alertas";
import { enlaceWhatsapp } from "@/lib/config/contacto";
export const metadata: Metadata = { title: "Alertas", description: "Consulta el motivo de cada alerta agroclimática de tus parcelas." };
export default function AlertasPage() {
  const wa = enlaceWhatsapp("Hola, necesito ayuda para interpretar una alerta de mi explotación.");
  return <>
    <section><h1 className="text-[30px] font-black text-stone-950">Alertas</h1><p className="mt-1 text-base text-stone-700">Cada alerta explica el motivo y la fuente de los datos.</p></section>
    <ListaAlertas />
    <section className="rounded-2xl border-2 border-earth-300 bg-wheat-50 p-5"><h2 className="text-xl font-extrabold text-stone-950">¿Quieres una segunda mirada?</h2><p className="mt-1 text-base text-stone-700">Te ayudamos a convertir la alerta en una decisión práctica.</p>{wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-emerald-700 px-5 text-base font-extrabold text-white">Preguntar por WhatsApp</a> : <Link href="/#contacto" className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-olive-800 px-5 text-base font-bold text-white">Pedir una llamada</Link>}</section>
  </>;
}
