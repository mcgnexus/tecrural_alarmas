"use client";

import { useEffect, useState } from "react";
import { asegurarSesionDispositivo, obtenerDispositivoId } from "@/lib/datos/dispositivo";
import type { InteresLead } from "@/lib/dominio/leads";
import { enlaceWhatsapp, EMAIL_CONTACTO } from "@/lib/config/contacto";

type Estado = "inicial" | "enviando" | "enviado" | "error";

/**
 * Formulario de contacto comercial: captura nombre y teléfono reales para que
 * el equipo pueda responder. Muestra confirmación clara al enviarse.
 */
export function FormularioContacto({ servicioKey, servicioNombre, interes }: { servicioKey?: string; servicioNombre?: string; interes?: InteresLead }) {
  const [estado, setEstado] = useState<Estado>("inicial");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wa, setWa] = useState<string | null>(null);

  useEffect(() => {
    setWa(enlaceWhatsapp("Hola, quiero información sobre los servicios de TecRural para mi explotación."));
  }, []);

  async function enviar() {
    if (nombre.trim().length < 2) { setError("Escribe tu nombre."); return; }
    if (!/^[\d\s().+-]{9,20}$/.test(telefono.trim())) { setError("Escribe un teléfono válido."); return; }
    if (!acepta) { setError("Debes aceptar la política de privacidad."); return; }
    setEstado("enviando");
    setError(null);
    try {
      await asegurarSesionDispositivo();
      const resp = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispositivoId: obtenerDispositivoId(),
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          mensaje: mensaje.trim() || undefined,
          servicioKey,
          servicioNombre,
          interes,
          aceptaPrivacidad: true,
        }),
      });
      if (!resp.ok) throw new Error();
      setEstado("enviado");
    } catch {
      setEstado("error");
      setError("No se pudo enviar. Revisa la conexión e inténtalo de nuevo.");
    }
  }

  if (estado === "enviado") {
    return (
      <div role="status" className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5">
        <p className="text-lg font-extrabold text-emerald-800">✓ Solicitud enviada</p>
        <p className="mt-1 text-base leading-snug text-emerald-900">
          Gracias, {nombre.split(" ")[0]}. Te llamaremos al {telefono.trim()} en menos de 24 h laborables.
        </p>
        <button
          type="button"
          onClick={() => { setEstado("inicial"); setMensaje(""); }}
          className="mt-3 min-h-[44px] text-sm font-bold text-emerald-800 underline underline-offset-4"
        >
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-brand-800 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-extrabold text-stone-900">Te llamamos</h3>
      <p className="mt-1 text-sm leading-snug text-stone-700">
        Déjanos tu teléfono y te contactamos. Sin compromiso.
        {servicioNombre ? ` Sobre: ${servicioNombre}.` : ""}
      </p>

      <label className="mt-4 block text-sm font-bold text-stone-900" htmlFor="contacto-nombre">Nombre</label>
      <input
        id="contacto-nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        autoComplete="name"
        className="mt-1 min-h-[48px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base font-medium"
        placeholder="Tu nombre"
      />

      <label className="mt-3 block text-sm font-bold text-stone-900" htmlFor="contacto-telefono">Teléfono</label>
      <input
        id="contacto-telefono"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        inputMode="tel"
        autoComplete="tel"
        className="mt-1 min-h-[48px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base font-medium"
        placeholder="600 000 000"
      />

      <label className="mt-3 block text-sm font-bold text-stone-900" htmlFor="contacto-mensaje">Mensaje <span className="font-normal text-stone-500">(opcional)</span></label>
      <textarea
        id="contacto-mensaje"
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        rows={3}
        maxLength={500}
        className="mt-1 w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base font-medium"
        placeholder="Cuéntanos qué necesitas (cultivo, hectáreas, …)"
      />

      <label className="mt-3 flex items-start gap-3">
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-1 h-5 w-5" />
        <span className="text-sm font-medium text-stone-900">
          Acepto la política de privacidad. Solo usaremos tus datos para responder a esta solicitud.
        </span>
      </label>

      {error ? (
        <p role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={enviar}
        disabled={estado === "enviando"}
        className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-brand-800 px-5 py-3.5 text-base font-bold text-white hover:bg-brand-900 disabled:opacity-60"
      >
        {estado === "enviando" ? "Enviando…" : "Quiero que me llamen"}
      </button>

      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-5 py-3 text-base font-bold text-emerald-700 hover:bg-emerald-50"
        >
          💬 Escríbenos por WhatsApp
        </a>
      ) : null}

      <a
        href={`mailto:${EMAIL_CONTACTO}`}
        className="mt-3 block text-center text-sm font-semibold text-brand-800 underline underline-offset-4"
      >
        o escríbenos a {EMAIL_CONTACTO}
      </a>
    </div>
  );
}
