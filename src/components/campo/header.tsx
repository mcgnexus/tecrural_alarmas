import Link from "next/link";
import { enlaceWhatsapp } from "@/lib/config/contacto";
import { NavEscritorio } from "@/components/campo/bottom-nav";
export function Header() {
  const wa = enlaceWhatsapp("Hola, quiero orientación para mi explotación.");
  return <header className="sticky top-0 z-20 border-b-2 border-earth-200 bg-wheat-50/95 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Link href="/" className="min-h-0 min-w-0"><span className="block text-lg font-black tracking-tight text-olive-950">TecRural Campo</span><span className="hidden text-[15px] text-stone-700 lg:block">Ayuda clara para tu explotación</span></Link><NavEscritorio /></div>{wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[46px] shrink-0 items-center rounded-xl bg-emerald-700 px-4 text-[15px] font-extrabold text-white">WhatsApp</a> : <Link href="/#contacto" className="inline-flex min-h-[46px] shrink-0 items-center rounded-xl bg-olive-800 px-4 text-[15px] font-bold text-white">Contacto</Link>}</div></header>;
}
