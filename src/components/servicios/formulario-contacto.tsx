"use client";

import Link from "next/link";
import { useState } from "react";
import { asegurarSesionDispositivo, obtenerDispositivoId } from "@/lib/datos/dispositivo";
import type { InteresLead } from "@/lib/dominio/leads";
import { registrarEventoEmbudo } from "@/lib/analitica";
import { VERSION_CONSENTIMIENTO } from "@/lib/privacidad/consentimiento";

type Estado = "inicial" | "enviando" | "enviado" | "error";
type Errores = Partial<Record<"nombre" | "telefono" | "municipio" | "cultivo" | "privacidad", string>>;
const cultivos = ["Almendro", "Olivar", "Pistacho", "Cereal", "Aguacate", "Mango", "Chirimoyo", "Otro"] as const;

function municipioGuardado(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("tecrural:ubicacion");
    const nombre = raw ? (JSON.parse(raw) as { nombre?: string }).nombre ?? "" : "";
    return nombre.split(",")[0]?.trim() ?? "";
  } catch { return ""; }
}

/** Tipo de explotacion ya indicado antes por el visitante, si consta. */
export function FormularioContacto({ servicioKey, servicioNombre, interes }: { servicioKey?: string; servicioNombre?: string; interes?: InteresLead }) {
  const [estado, setEstado] = useState<Estado>("inicial");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [municipio, setMunicipio] = useState(municipioGuardado);
  const [cultivo, setCultivo] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [website, setWebsite] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [leadIniciado, setLeadIniciado] = useState(false);

  function iniciarLead() {
    if (leadIniciado) return;
    setLeadIniciado(true);
    registrarEventoEmbudo("lead_started", { origen: "formulario", servicioKey: servicioKey ?? null });
  }

  function validar(): Errores {
    const siguientes: Errores = {};
    if (nombre.trim().length < 2) siguientes.nombre = "Escribe tu nombre.";
    const telefonoLimpio = telefono.replace(/[\s().-]/g, "").replace(/^0034/, "+34");
    if (!/^(?:\+34)?[6789]\d{8}$/.test(telefonoLimpio)) siguientes.telefono = "Escribe un teléfono español válido (9 cifras).";
    if (!municipio.trim()) siguientes.municipio = "Escribe tu municipio.";
    if (!cultivo) siguientes.cultivo = "Selecciona tu cultivo.";
    if (!acepta) siguientes.privacidad = "Acepta recibir avisos por WhatsApp.";
    return siguientes;
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const siguientes = validar();
    setErrores(siguientes);
    if (Object.keys(siguientes).length) return;
    setEstado("enviando");
    try {
      await asegurarSesionDispositivo();
      const resp = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispositivoId: obtenerDispositivoId(), nombre: nombre.trim(), telefono: telefono.trim(), municipio: municipio.trim(), cultivo,
          tipoExplotacion: "agricultura", problema: "Avisos gratuitos por WhatsApp", servicioKey, servicioNombre, interes,
          origen: "formulario", aceptaPrivacidad: true, consentVersion: VERSION_CONSENTIMIENTO, marketingConsent: false, website,
        }),
      });
      if (!resp.ok) throw new Error();
      setEstado("enviado");
      registrarEventoEmbudo("lead_submitted", { origen: "formulario", servicioKey: servicioKey ?? null });
    } catch {
      setEstado("error");
      setErrores({ privacidad: "No se pudo enviar. Revisa la conexión e inténtalo de nuevo." });
    }
  }

  if (estado === "enviado") return <div role="status" className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5"><p className="text-xl font-extrabold text-emerald-900">Gracias. Revisaremos tus datos y te contactaremos por WhatsApp.</p></div>;

  const listaErrores = Object.values(errores).filter(Boolean);
  return (
    <form onSubmit={enviar} noValidate className="rounded-2xl border-2 border-brand-800 bg-white p-5 shadow-sm">
       <h3 className="text-xl font-extrabold text-stone-900">Recibe avisos por WhatsApp</h3>
       <p className="mt-1 text-base text-stone-700">Déjanos estos datos y te avisaremos gratis de lo importante para tu cultivo.</p>
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="contacto-website">No rellenar</label>
        <input id="contacto-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <label className="mt-4 block text-base font-bold text-stone-900" htmlFor="contacto-nombre">Nombre</label>
      <input id="contacto-nombre" name="nombre" required value={nombre} onFocus={iniciarLead} onChange={(e) => setNombre(e.target.value)} autoComplete="name" aria-invalid={Boolean(errores.nombre)} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base" />
      {errores.nombre ? <p className="mt-1 text-sm font-semibold text-red-700">{errores.nombre}</p> : null}

      <label className="mt-3 block text-base font-bold text-stone-900" htmlFor="contacto-telefono">Teléfono o WhatsApp</label>
      <input id="contacto-telefono" name="telefono" required type="tel" inputMode="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} aria-invalid={Boolean(errores.telefono)} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base" />
      {errores.telefono ? <p className="mt-1 text-sm font-semibold text-red-700">{errores.telefono}</p> : null}

      <label className="mt-3 block text-base font-bold text-stone-900" htmlFor="contacto-municipio">Municipio</label>
      <input id="contacto-municipio" name="municipio" required autoComplete="address-level2" value={municipio} onChange={(e) => setMunicipio(e.target.value)} aria-invalid={Boolean(errores.municipio)} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base" />
       {errores.municipio ? <p className="mt-1 text-sm font-semibold text-red-700">{errores.municipio}</p> : null}

       <label className="mt-3 block text-base font-bold text-stone-900" htmlFor="contacto-cultivo">Cultivo</label>
       <select id="contacto-cultivo" required value={cultivo} onChange={(e) => setCultivo(e.target.value)} aria-invalid={Boolean(errores.cultivo)} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-base">
         <option value="">Selecciona tu cultivo</option>{cultivos.map((opcion) => <option key={opcion}>{opcion}</option>)}
       </select>
       {errores.cultivo ? <p className="mt-1 text-sm font-semibold text-red-700">{errores.cultivo}</p> : null}

      <label className="mt-4 flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border-2 border-stone-300 p-3">
        <input type="checkbox" required checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="h-6 w-6 shrink-0 accent-brand-800" />
         <span className="text-[15px] font-medium text-stone-900">Acepto recibir avisos por WhatsApp y he leído la <Link href="/privacidad" className="font-bold text-brand-800 underline">política de privacidad</Link>.</span>
      </label>

      {listaErrores.length ? <div role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3"><p className="font-bold text-red-900">Revisa estos datos:</p><ul className="mt-1 list-disc pl-5 text-[15px] font-semibold text-red-800">{listaErrores.map((e) => <li key={e}>{e}</li>)}</ul></div> : null}
       <button type="submit" disabled={estado === "enviando"} className="mt-4 min-h-[52px] w-full rounded-xl bg-brand-800 px-5 py-3 text-base font-extrabold text-white hover:bg-brand-900 disabled:opacity-60">{estado === "enviando" ? "Enviando…" : "Quiero recibir avisos"}</button>
    </form>
  );
}
