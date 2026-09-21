"use client";

import { useEffect, useState } from "react";
import { enlaceWhatsapp } from "@/lib/config/contacto";

export function CtaWhatsapp({ fijo = false }: { fijo?: boolean }) {
  const [enlace, setEnlace] = useState<string | null>(null);

  useEffect(() => {
    function preparar() {
      let municipio = "";
      let cultivo = "";
      try {
        const ubicacion = localStorage.getItem("tecrural:ubicacion");
        municipio = ubicacion ? ((JSON.parse(ubicacion) as { nombre?: string }).nombre ?? "").split(",")[0]?.trim() ?? "" : "";
        cultivo = localStorage.getItem("tecrural:cultivo") ?? "";
      } catch { /* La acción sigue disponible sin personalización. */ }
      const detalle = municipio && cultivo ? ` Tengo una explotación en ${municipio} y cultivo ${cultivo}.` : "";
      setEnlace(enlaceWhatsapp(`Hola, quiero recibir avisos gratis por WhatsApp.${detalle}`));
    }
    preparar();
    window.addEventListener("tecrural:datos-actualizados", preparar);
    return () => window.removeEventListener("tecrural:datos-actualizados", preparar);
  }, []);

  const clase = fijo
    ? "fixed inset-x-3 bottom-20 z-30 inline-flex min-h-[52px] items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-base font-extrabold text-white shadow-lg hover:bg-emerald-800 md:hidden"
    : "inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-base font-extrabold text-white hover:bg-emerald-800";
  return enlace
    ? <a href={enlace} target="_blank" rel="noopener noreferrer" className={clase} aria-label="Recibe avisos gratis por WhatsApp sobre mi cultivo">Recibe avisos gratis por WhatsApp</a>
    : <a href="#contacto" className={clase} aria-label="Recibe avisos gratis por WhatsApp sobre mi cultivo">Recibe avisos gratis por WhatsApp</a>;
}
