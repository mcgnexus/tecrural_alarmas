import Link from "next/link";
import Image from "next/image";
import { enlaceWhatsapp } from "@/lib/config/contacto";
import { NavEscritorio } from "@/components/campo/bottom-nav";
export function Header() {
  const wa = enlaceWhatsapp("Hola, quiero orientación para mi explotación.");
  return <header className="sticky top-0 z-20 border-b-2 border-earth-200 bg-wheat-50/95 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Link href="/" className="flex min-h-0 min-w-0 items-center gap-2" aria-label="TecRural Campo, inicio"><Image src="/logo-tecrural.svg" alt="" aria-hidden="true" width={44} height={44} className="h-11 w-11 shrink-0" /><span><span className="block text-lg font-black tracking-tight text-olive-950">TecRural Campo</span><span className="hidden text-[15px] text-stone-700 lg:block">Ayuda clara para tu explotación</span></span></Link><NavEscritorio /></div><div className="flex shrink-0 items-center gap-2"><Link href="/cuenta" className="inline-flex min-h-[46px] items-center rounded-xl border-2 border-olive-800 px-3 text-[15px] font-bold text-olive-900">Mi cuenta</Link>{wa ? <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[46px] shrink-0 items-center rounded-xl bg-emerald-700 px-4 text-[15px] font-extrabold text-white">WhatsApp</a> : <Link href="/#contacto" className="inline-flex min-h-[46px] shrink-0 items-center rounded-xl bg-olive-800 px-4 text-[15px] font-bold text-white">Contacto</Link>}</div></div></header>;
}
