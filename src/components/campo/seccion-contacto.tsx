"use client";
import { FormularioContacto } from "@/components/servicios/formulario-contacto";
export function SeccionContacto() {
  return <section id="contacto" className="scroll-mt-24"><details className="rounded-2xl border-2 border-earth-300 bg-wheat-50 p-4"><summary className="cursor-pointer text-lg font-extrabold text-stone-950">¿Prefieres que te llamemos?</summary><p className="mt-2 text-[15px] text-stone-700">Abre el formulario y deja solo nombre, teléfono y municipio.</p><div className="mt-4"><FormularioContacto /></div></details></section>;
}
