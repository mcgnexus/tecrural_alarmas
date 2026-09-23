"use client";
import Link from "next/link";
import Image from "next/image";
import { NavEscritorio } from "@/components/campo/bottom-nav";
import { registrarEventoEmbudo } from "@/lib/analitica";
export function Header() {
  return <header className="sticky top-0 z-20 border-b-2 border-earth-200 bg-wheat-50/95 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><Link href="/" className="flex min-h-0 min-w-0 items-center gap-2" aria-label="TecRural Campo, inicio"><Image src="/TecRural_icono.png" alt="Logo de TecRural" width={44} height={44} preload className="h-11 w-11 shrink-0" /><span><span className="block text-lg font-black tracking-tight text-olive-950">TecRural Campo</span><span className="hidden text-[15px] text-stone-700 lg:block">Ayuda clara para tu explotación</span></span></Link><NavEscritorio /></div><div className="flex shrink-0 items-center gap-2"><Link href="/#captacion" onClick={() => registrarEventoEmbudo("whatsapp_clicked",{ origen:"header" })} className="inline-flex min-h-[46px] shrink-0 items-center rounded-xl bg-brand-800 px-4 text-[15px] font-extrabold text-white">Recibir avisos de mi zona</Link></div></div></header>;
}
