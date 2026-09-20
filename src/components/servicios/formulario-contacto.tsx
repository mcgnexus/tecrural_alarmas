"use client";

import { useEffect, useState } from "react";
import { asegurarSesionDispositivo, obtenerDispositivoId } from "@/lib/datos/dispositivo";
import type { InteresLead } from "@/lib/dominio/leads";
import { enlaceWhatsapp, EMAIL_CONTACTO } from "@/lib/config/contacto";

type Estado = "inicial" | "enviando" | "enviado" | "error";

const TIPOS_EXPLOTACION = [
  { valor: "agricultura", etiqueta: "Agricultura (cultivos)" },
  { valor: "ganaderia", etiqueta: "Ganadería" },
  { valor: "mixta", etiqueta: "Mixta (agricultura y ganadería)" },
] as const;

const PROBLEMAS = [
  "Heladas",
  "Falta de agua / riego",
  "Plagas o enfermedades",
  "Calor / estrés térmico",
  "Viento o tormentas",
  "Otro",
] as const;

/**
 * Formulario de contacto comercial: mínimo posible (6 campos) para este
 * público. WhatsApp y teléfono por delante del email.
 */
export function FormularioContacto({ servicioKey, servicioNombre, interes }: { servicioKey?: string; servicioNombre?: string; interes?: InteresLead }) {
  const [estado, setEstado] = useState<Estado>("inicial");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [tipoExplotacion, setTipoExplotacion] = useState<string>("");
  const [problema, setProblema] = useState<string>("");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wa, setWa] = useState<string | null>(null);

  useEffect(() => {
    setWa(
      enlaceWhatsapp(
        servicioNombre
          ? `Hola, quiero información sobre: ${servicioNombre}`
          : "Hola, quiero información sobre los servicios de TecRural para mi explotación.",
      ),
    );
  }, [servicioNombre]);

  async function enviar() {
    if (nombre.trim().length < 2) { setError("Escribe tu nombre."); return; }
    if (!/^[\d\s().+-]{9,20}$/.test(telefono.trim())) { setError("Escribe un teléfono válido."); return; }
    if (!municipio.trim()) { setError("Escribe tu municipio."); return; }
    if (!tipoExplotacion) { setError("Indica el tipo de explotación."); return; }
    if (!problema) { setError("Indica tu problema principal."); return; }
    if (!acepta) { setError("Debes aceptar que te contactemos."); return; }
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
          municipio: municipio.trim(),
          tipoExplotacion,
          problema,
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
        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 text-sm font-bold text-emerald-800 underline underline-offset-4"
          >
            💬 ¿Tienes prisa? Escríbenos por WhatsApp
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => { setEstado("inicial"); }}
          className="mt-3 block min-h-[44px] text-sm font-bold text-emerald-800 underline underline-offset-4"
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

      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 bg-emerald-50 px-5 py-3 text-base font-bold text-emerald-700 hover:bg-emerald-100"
        >
          💬 Prefiero WhatsApp — escribir ahora
        </a>
      ) : null}

      <label className="mt-4 block text-sm font-bold text-stone-900" htmlFor="contacto-nombre">Nombre</label>
      <input
        id="contacto-nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        autoComplete="name"
        className="mt-1 min-h-[48px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base font-medium"
        placeholder="Tu nombre"
      />

      <label className="mt-3 block text-sm font-bold text-stone-900" htmlFor="contacto-telefono">Teléfono o WhatsApp</label>
      <input
        id="contacto-telefono"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        inputMode="tel"
        autoComplete="tel"
        className="mt-1 min-h-[48px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base font-medium"
        placeholder="600 000 000"
      />

      <label className="mt-3 block text-sm font-bold text-stone-900" htmlFor="contacto-municipio">Municipio</label>
      <input
        id="contacto-municipio"
        value={municipio}
        onChange={(e) => setMunicipio(e.target.value)}
        autoComplete="address-level2"
        className="mt-1 min-h-[48px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base font-medium"
        placeholder="Ej. Baza, Huéscar, Motril…"
      />

      <label className="mt-3 block text-sm font-bold text-stone-900" htmlFor="contacto-tipo">Tipo de explotación</label>
      <select
        id="contacto-tipo"
        value={tipoExplotacion}
        onChange={(e) => setTipoExplotacion(e.target.value)}
        className="mt-1 min-h-[48px] w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-base font-medium text-stone-900"
      >
        <option value="">Elige una opción…</option>
        {TIPOS_EXPLOTACION.map((t) => (
          <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
        ))}
      </select>

      <label className="mt-3 block text-sm font-bold text-stone-900" htmlFor="contacto-problema">Problema principal</label>
      <select
        id="contacto-problema"
        value={problema}
        onChange={(e) => setProblema(e.target.value)}
        className="mt-1 min-h-[48px] w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-base font-medium text-stone-900"
      >
        <option value="">Elige una opción…</option>
        {PROBLEMAS.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <label className="mt-3 flex items-start gap-3">
        <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="mt-1 h-5 w-5" />
        <span className="text-sm font-medium text-stone-900">
          Acepto que TecRural me contacte por teléfono o WhatsApp para responder a esta solicitud.
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

      <a
        href={`mailto:${EMAIL_CONTACTO}`}
        className="mt-3 block text-center text-sm font-semibold text-stone-600 underline underline-offset-4"
      >
        ¿Prefieres email? {EMAIL_CONTACTO}
      </a>
    </div>
  );
}
