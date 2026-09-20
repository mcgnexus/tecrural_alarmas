"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { enlaceTelefono, enlaceWhatsappPersonal, TELEFONO_VISIBLE } from "@/lib/config/contacto";
import { registrarEventoEmbudo } from "@/lib/analitica";

/**
 * CTA comercial de la portada. Principal: WhatsApp con mensaje preescrito
 * (perfil + municipio). Secundaria: formulario de orientación.
 */
export function CtaPrincipal() {
  const [tel, setTel] = useState<string | null>(null);
  const [wa, setWa] = useState<string | null>(null);

  useEffect(() => {
    setTel(enlaceTelefono());
    setWa(enlaceWhatsappPersonal());
  }, []);

  return (
    <div className="rounded-2xl border-2 border-brand-800 bg-brand-800 p-5 text-white shadow-sm">
      <h2 className="text-lg font-extrabold leading-tight">¿Quieres datos reales en tu parcela?</h2>
      <p className="mt-1 text-sm font-medium leading-snug text-brand-100">
        Sensores, estación meteorológica y seguimiento para tu explotación. Te respondemos hoy.
      </p>
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => registrarEventoEmbudo("click_whatsapp", { origen: "cta_portada" })}
          className="mt-3 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 text-base font-bold text-white hover:bg-emerald-600"
        >
          Hablar ahora por WhatsApp
        </a>
      ) : null}
      <Link
        href="/#contacto"
        className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-base font-bold text-brand-900 hover:bg-brand-50"
      >
        Quiero que me orientéis
      </Link>
      {tel && TELEFONO_VISIBLE ? (
        <a href={tel} className="mt-3 block text-center text-base font-bold text-white underline underline-offset-4">
          {TELEFONO_VISIBLE}
        </a>
      ) : null}
    </div>
  );
}
