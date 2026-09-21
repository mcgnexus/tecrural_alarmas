import Link from "next/link";
import { HomeSinRegistro } from "@/components/campo/home-sin-registro";
import { SeccionContacto } from "@/components/campo/seccion-contacto";
import { AsistenteChat } from "@/components/campo/asistente-chat";
import { FormularioContacto } from "@/components/servicios/formulario-contacto";
import { SeccionConfianza } from "@/components/campo/seccion-confianza";
import { CtaWhatsapp } from "@/components/campo/cta-whatsapp";

export default function InicioPage() {
  return <>
    <HomeSinRegistro />
    <section className="scroll-mt-24"><FormularioContacto /></section>
    <section className="rounded-2xl border-2 border-earth-300 bg-wheat-50 p-5 shadow-sm md:flex md:items-center md:justify-between md:gap-8"><div><h2 className="text-xl font-extrabold text-stone-950">Avisos fitosanitarios de tu zona</h2><p className="mt-1 text-base text-stone-700">Consulta avisos oficiales y una estimación agroclimática explicada con claridad.</p></div><Link href="/fitosanitario" className="mt-4 inline-flex min-h-[52px] items-center justify-center rounded-xl bg-olive-800 px-5 py-3 text-base font-bold text-white md:mt-0 md:shrink-0">Ver avisos fitosanitarios</Link></section>
    <SeccionConfianza />
    <CtaWhatsapp />
    <SeccionContacto />
    <p className="text-center text-[13px] leading-relaxed text-stone-600">TecRural no sustituye a AEMET, RAIF ni a un técnico agrícola. Consulta nuestra <Link href="/privacidad" className="font-bold text-olive-800 underline">política de privacidad</Link>.</p>
     <AsistenteChat />
     <CtaWhatsapp fijo />
  </>;
}
