"use client";

import Link from "next/link";
import { useState } from "react";
import { asegurarSesionDispositivo, obtenerDispositivoId } from "@/lib/datos/dispositivo";
import type { InteresLead } from "@/lib/dominio/leads";
import { registrarEventoEmbudo } from "@/lib/analitica";
import { VERSION_CONSENTIMIENTO } from "@/lib/privacidad/consentimiento";
import { municipioDeUbicacion } from "@/lib/datos/ubicacion";
import { TELEFONO_VISIBLE } from "@/lib/config/contacto";

type Estado = "inicial" | "validando" | "enviando" | "enviado" | "error";
type Errores = Partial<Record<"nombre" | "telefono" | "municipio" | "cultivo" | "privacidad", string>>;
/**
 * Cultivos incluidos en MVP:
 * - Almendro
 * - Olivar
 * - Pistacho
 * - Aguacate
 * - Mango
 * - Chirimoyo
 * - Cereal
 * + "Otro" para no excluir usuarios
 */
const cultivos = ["Almendro", "Olivar", "Pistacho", "Cereal", "Aguacate", "Mango", "Chirimoyo", "Otro"] as const;

/** Tipo de explotacion ya indicado antes por el visitante, si consta. */
export function FormularioContacto({ servicioKey, servicioNombre, interes, municipioInicial = "", cultivoInicial = "", onCultivoChange }: { servicioKey?: string; servicioNombre?: string; interes?: InteresLead; municipioInicial?: string; cultivoInicial?: string; onCultivoChange?: (cultivo: string) => void }) {
  const [estado, setEstado] = useState<Estado>("inicial");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [municipio, setMunicipio] = useState(() => municipioDeUbicacion(municipioInicial));
  const [cultivoLocal, setCultivoLocal] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [website, setWebsite] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [leadIniciado, setLeadIniciado] = useState(false);
  const cultivo = onCultivoChange ? cultivoInicial : cultivoLocal;

  function iniciarLead() {
    if (leadIniciado) return;
    setLeadIniciado(true);
    registrarEventoEmbudo("lead_form_started", { origen: "formulario", servicioKey: servicioKey ?? null });
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

  function validarCampo(campo: keyof Errores, valor: string | boolean): string | undefined {
    if (campo === "nombre" && (typeof valor !== "string" || valor.trim().length < 2)) return "Escribe tu nombre.";
    if (campo === "telefono") {
      const telefonoLimpio = String(valor).replace(/[\s().-]/g, "").replace(/^0034/, "+34");
      if (!/^(?:\+34)?[6789]\d{8}$/.test(telefonoLimpio)) return "Escribe un teléfono español válido (9 cifras).";
    }
    if (campo === "municipio" && (typeof valor !== "string" || !valor.trim())) return "Escribe tu municipio.";
    if (campo === "cultivo" && (typeof valor !== "string" || !valor)) return "Selecciona tu cultivo.";
    if (campo === "privacidad" && valor !== true) return "Acepta recibir avisos por WhatsApp.";
    return undefined;
  }

  function actualizarError(campo: keyof Errores, valor: string | boolean) {
    const error = validarCampo(campo, valor);
    setErrores((anteriores) => {
      if (error) return { ...anteriores, [campo]: error };
      const siguientes = { ...anteriores };
      delete siguientes[campo];
      return siguientes;
    });
  }

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEstado("validando");
    const siguientes = validar();
    setErrores(siguientes);
    if (Object.keys(siguientes).length) { registrarEventoEmbudo("lead_form_error", { origen: "formulario", campos: Object.keys(siguientes).join(",") }); setEstado("inicial"); return; }
    setEstado("enviando");
    try {
      await asegurarSesionDispositivo();
      const resp = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispositivoId: obtenerDispositivoId(), nombre: nombre.trim(), telefono: telefono.trim(), municipio: municipio.trim(), cultivo,
          tipoExplotacion: "agricultura", problema: "Avisos gratuitos por WhatsApp", servicioKey, servicioNombre, interes,
           origen: "formulario", aceptaPrivacidad: true, consentVersion: VERSION_CONSENTIMIENTO, marketingConsent: marketing, website,
        }),
      });
      if (!resp.ok) throw new Error();
      setEstado("enviado");
      registrarEventoEmbudo("lead_form_submitted", { origen: "formulario", servicioKey: servicioKey ?? null });
    } catch {
      setEstado("error");
      registrarEventoEmbudo("lead_form_error", { origen: "formulario" });
      setErrores({ privacidad: "No se pudo enviar. Revisa la conexión e inténtalo de nuevo." });
    }
  }

  if (estado === "enviado") return <div role="status" className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5"><p className="text-xl font-extrabold text-emerald-900">Solicitud recibida</p><p className="mt-2 text-base leading-relaxed text-emerald-900"><strong>Ahora actuamos nosotros:</strong> el agente IA de TecRural revisará tus datos y te escribirá primero por WhatsApp.</p><p className="mt-2 text-base leading-relaxed text-emerald-900">Te contactaremos en menos de 24 horas laborables, desde el WhatsApp oficial de TecRural{TELEFONO_VISIBLE ? ` (${TELEFONO_VISIBLE})` : ""}, para confirmar la activación. <strong>No necesitas iniciar otra conversación ahora.</strong></p><p className="mt-3 text-sm font-medium text-emerald-800">Para cancelar después, responde BAJA por WhatsApp o escribe a <a className="font-bold underline" href="mailto:mcgtecrural@gmail.com">mcgtecrural@gmail.com</a>.</p></div>;

  const listaErrores = Object.values(errores).filter(Boolean);
  return (
    <form onSubmit={enviar} noValidate className="rounded-2xl border-2 border-brand-800 bg-white p-5 shadow-sm">
       <h3 className="text-xl font-extrabold text-stone-900">Recibe avisos por WhatsApp</h3>
       <p className="mt-1 text-base text-stone-700">Déjanos estos datos y te avisaremos gratis de lo importante para tu cultivo.</p>
       <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm leading-relaxed text-brand-950"><p><strong>¿Qué recogemos?</strong> Nombre, teléfono o WhatsApp, municipio y cultivo.</p><p className="mt-1"><strong>¿Para qué?</strong> Para revisar tu solicitud y enviarte avisos relevantes para tu zona y cultivo.</p><p className="mt-1"><strong>¿Qué pasa después?</strong> El agente IA de TecRural revisa el registro y te escribe primero por WhatsApp en menos de 24 horas laborables. No tienes que iniciar otra conversación.</p><p className="mt-1"><strong>¿Cómo cancelas?</strong> Responde <strong>BAJA</strong> en WhatsApp o escribe a mcgtecrural@gmail.com.</p></div>
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="contacto-website">No rellenar</label>
        <input id="contacto-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <label className="mt-4 block text-base font-bold text-stone-900" htmlFor="contacto-nombre">Nombre</label>
       <input id="contacto-nombre" name="nombre" required value={nombre} onFocus={iniciarLead} onBlur={() => actualizarError("nombre", nombre)} onChange={(e) => { const valor = e.target.value; setNombre(valor); actualizarError("nombre", valor); }} autoComplete="name" aria-invalid={Boolean(errores.nombre)} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base" />
      {errores.nombre ? <p className="mt-1 text-sm font-semibold text-red-700">{errores.nombre}</p> : null}

      <label className="mt-3 block text-base font-bold text-stone-900" htmlFor="contacto-telefono">Teléfono o WhatsApp</label>
       <input id="contacto-telefono" name="telefono" required type="tel" inputMode="tel" autoComplete="tel" value={telefono} onBlur={() => actualizarError("telefono", telefono)} onChange={(e) => { const valor = e.target.value; setTelefono(valor); actualizarError("telefono", valor); }} aria-invalid={Boolean(errores.telefono)} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base" />
      {errores.telefono ? <p className="mt-1 text-sm font-semibold text-red-700">{errores.telefono}</p> : null}

      <label className="mt-3 block text-base font-bold text-stone-900" htmlFor="contacto-municipio">Municipio</label>
       <input id="contacto-municipio" name="municipio" required autoComplete="address-level2" value={municipio} onBlur={() => actualizarError("municipio", municipio)} onChange={(e) => { const valor = e.target.value; setMunicipio(valor); actualizarError("municipio", valor); }} aria-invalid={Boolean(errores.municipio)} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base" />
       {errores.municipio ? <p className="mt-1 text-sm font-semibold text-red-700">{errores.municipio}</p> : null}

       <label className="mt-3 block text-base font-bold text-stone-900" htmlFor="contacto-cultivo">Cultivo que recibirá avisos</label>
       <select id="contacto-cultivo" required value={cultivo} onBlur={() => actualizarError("cultivo", cultivo)} onChange={(e) => { const valor = e.target.value; setCultivoLocal(valor); onCultivoChange?.(valor); actualizarError("cultivo", valor); }} aria-invalid={Boolean(errores.cultivo)} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-stone-300 bg-white px-4 py-3 text-base">
         <option value="">Selecciona tu cultivo</option>{cultivos.map((opcion) => <option key={opcion}>{opcion}</option>)}
       </select>
       {errores.cultivo ? <p className="mt-1 text-sm font-semibold text-red-700">{errores.cultivo}</p> : null}

       <label className="mt-4 flex min-h-[52px] cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-300 p-3">
          <input type="checkbox" required checked={acepta} onChange={(e) => { const valor = e.target.checked; setAcepta(valor); actualizarError("privacidad", valor); }} className="h-6 w-6 shrink-0 accent-brand-800" />
          <span className="text-[15px] font-medium text-stone-900"><strong>Necesario:</strong> acepto el tratamiento de mis datos para gestionar la solicitud y recibir avisos por WhatsApp. He leído la <Link href="/privacidad" className="font-bold text-brand-800 underline">política de privacidad</Link>.</span>
       </label>
       <label className="mt-2 flex min-h-[52px] cursor-pointer items-start gap-3 rounded-xl border-2 border-stone-200 bg-stone-50 p-3">
         <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="h-6 w-6 shrink-0 accent-brand-800" />
         <span className="text-[15px] font-medium text-stone-900"><strong>Opcional:</strong> acepto recibir comunicaciones comerciales de TecRural. Puedo retirarlo cuando quiera.</span>
       </label>

       {estado === "validando" ? <p role="status" className="mt-3 text-sm font-semibold text-stone-600">Validando…</p> : null}
       {listaErrores.length ? <div role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3"><p className="font-bold text-red-900">Datos incompletos</p><ul className="mt-1 list-disc pl-5 text-[15px] font-semibold text-red-800">{listaErrores.map((e) => <li key={e}>{e}</li>)}</ul></div> : null}
       {estado === "error" ? <div role="alert" className="mt-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3"><p className="font-bold text-amber-900">Error temporal</p><p className="mt-1 text-sm text-amber-800">No se pudo enviar. Inténtalo de nuevo en unos minutos.</p></div> : null}
        <button type="submit" disabled={estado === "enviando" || estado === "validando"} className="mt-4 min-h-[52px] w-full rounded-xl bg-brand-800 px-5 py-3 text-base font-extrabold text-white hover:bg-brand-900 disabled:opacity-60">{estado === "enviando" ? "Enviando…" : estado === "validando" ? "Validando…" : "Quiero recibir avisos"}</button>
    </form>
  );
}
