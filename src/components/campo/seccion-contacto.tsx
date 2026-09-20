"use client";

import { useEffect, useState } from "react";
import { FormularioContacto } from "@/components/servicios/formulario-contacto";
import { enlaceTelefono, enlaceWhatsapp, TELEFONO_VISIBLE, EMAIL_CONTACTO } from "@/lib/config/contacto";
import type { InteresLead } from "@/lib/dominio/leads";

interface ServicioSeleccionado {
  servicioKey: string;
  servicioNombre: string;
  interes: InteresLead;
}

function leerServicioDeUrl(): ServicioSeleccionado | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const key = params.get("servicio")?.trim();
  if (!key) return null;
  return {
    servicioKey: key,
    servicioNombre: params.get("servicioNombre")?.trim() ?? "",
    interes: (params.get("interes")?.trim() as InteresLead) || undefined,
  };
}

/** Sección de contacto de la portada: formulario + teléfono + WhatsApp. */
export function SeccionContacto() {
  const [servicio, setServicio] = useState<ServicioSeleccionado | null>(null);
  const [tel, setTel] = useState<string | null>(null);
  const [wa, setWa] = useState<string | null>(null);

  useEffect(() => {
    setServicio(leerServicioDeUrl());
    setTel(enlaceTelefono());
    setWa(
      enlaceWhatsapp(
        servicio?.servicioNombre
          ? `Hola, quiero información sobre: ${servicio.servicioNombre}`
          : "Hola, quiero información sobre los servicios de TecRural para mi explotación.",
      ),
    );
    // Solo al montar: los parámetros de la URL no cambian sin recargar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section id="contacto" className="scroll-mt-20">
      <FormularioContacto
        servicioKey={servicio?.servicioKey}
        servicioNombre={servicio?.servicioNombre || undefined}
        interes={servicio?.interes}
      />
      {tel && TELEFONO_VISIBLE ? (
        <a
          href={tel}
          className="mt-3 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-stone-900 bg-white px-4 py-3 text-base font-bold text-stone-900 hover:bg-stone-50"
        >
          📞 Llamar al {TELEFONO_VISIBLE}
        </a>
      ) : null}
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border-2 border-emerald-600 bg-white px-4 py-3 text-base font-bold text-emerald-700 hover:bg-emerald-50"
        >
          💬 Abrir WhatsApp
        </a>
      ) : null}
      {!tel && !wa ? (
        <p className="mt-3 text-center text-sm font-medium text-stone-600">
          También puedes escribirnos a{" "}
          <a href={`mailto:${EMAIL_CONTACTO}`} className="font-bold text-brand-800 underline underline-offset-4">
            {EMAIL_CONTACTO}
          </a>
        </p>
      ) : null}
    </section>
  );
}
