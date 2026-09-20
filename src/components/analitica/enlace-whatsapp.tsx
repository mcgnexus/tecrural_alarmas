"use client";

import type { ReactNode } from "react";
import { registrarEventoEmbudo } from "@/lib/analitica";

/** Enlace a WhatsApp que registra el evento `click_whatsapp` del embudo. */
export function EnlaceWhatsapp({ href, children, className, ubicacion }: {
  href: string;
  children: ReactNode;
  className?: string;
  ubicacion?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => registrarEventoEmbudo("click_whatsapp", { ubicacion: ubicacion ?? null })}
    >
      {children}
    </a>
  );
}
