"use client";

import Link from "next/link";
import { useState } from "react";
import { asegurarSesionDispositivo, obtenerDispositivoId } from "@/lib/datos/dispositivo";
import type { InteresLead } from "@/lib/dominio/leads";
import { registrarEventoEmbudo } from "@/lib/analitica";
import { VERSION_CONSENTIMIENTO } from "@/lib/privacidad/consentimiento";
import { municipioDeUbicacion } from "@/lib/datos/ubicacion";
import type { CulturaId } from "@/lib/cultivos/catalogo";
import { catalogoCultivos } from "@/lib/cultivos/catalogo";

type Estado = "inicial" | "validando" | "enviando" | "enviado" | "error";
type Errores = Partial<Record<"nombre" | "telefono" | "municipio" | "cultivo" | "privacidad" | "ubicacion", string>>;
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
function idCultivoPorNombre(nombre: string): CulturaId | null {
  const entrada = Object.entries(catalogoCultivos).find(([, cultura]) => cultura.nombre.toLocaleLowerCase("es-ES") === nombre.trim().toLocaleLowerCase("es-ES"));
  return (entrada?.[0] as CulturaId | undefined) ?? null;
}

export function FormularioContacto({ servicioKey, servicioNombre, interes, municipioInicial = "", cultivoInicial = "", onCultivoChange, activarAvisosGratis = false, ubicacionAvisos }: { servicioKey?: string; servicioNombre?: string; interes?: InteresLead; municipioInicial?: string; cultivoInicial?: string; onCultivoChange?: (cultivo: string) => void; activarAvisosGratis?: boolean; ubicacionAvisos?: { lat: number; lon: number } | null }) {
  const [estado, setEstado] = useState<Estado>("inicial");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [municipio, setMunicipio] = useState(() => municipioDeUbicacion(municipioInicial));
  const [cultivoLocal, setCultivoLocal] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [website, setWebsite] = useState("");
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
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
    if (activarAvisosGratis && !ubicacionAvisos) siguientes.ubicacion = "Busca y selecciona el municipio para asociar los avisos a su zona.";
    if (!cultivo) siguientes.cultivo = "Selecciona tu cultivo.";
    if (activarAvisosGratis && cultivo && !idCultivoPorNombre(cultivo)) siguientes.cultivo = "Para activar avisos automáticos, selecciona uno de los cultivos disponibles.";
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
    setErrorEnvio(null);
    const siguientes = validar();
    setErrores(siguientes);
    if (Object.keys(siguientes).length) { registrarEventoEmbudo("lead_form_error", { origen: "formulario", campos: Object.keys(siguientes).join(",") }); setEstado("inicial"); return; }
    setEstado("enviando");
    let contactoRecibido = false;
    try {
      await asegurarSesionDispositivo();
      const dispositivoId = obtenerDispositivoId();
      const resp = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dispositivoId, nombre: nombre.trim(), telefono: telefono.trim(), municipio: municipio.trim(), cultivo,
          tipoExplotacion: "agricultura", problema: "Avisos gratuitos por WhatsApp", servicioKey, servicioNombre, interes,
           origen: "formulario", aceptaPrivacidad: true, consentVersion: VERSION_CONSENTIMIENTO, marketingConsent: marketing, website,
        }),
      });
      if (!resp.ok) throw new Error();
      contactoRecibido = true;
      if (activarAvisosGratis && ubicacionAvisos) {
        const activacion = await fetch("/api/avisos/activar-gratis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            dispositivoId,
            nombre: municipio.trim(),
            cultivo: idCultivoPorNombre(cultivo),
            latitud: ubicacionAvisos.lat,
            longitud: ubicacionAvisos.lon,
            telefono: telefono.trim(),
            aceptaAvisos: acepta,
          }),
        });
        if (!activacion.ok) {
          const detalle = await activacion.json().catch(() => null) as { error?: string } | null;
          throw new Error(detalle?.error ?? "No se pudieron activar los avisos. Revisa la conexión e inténtalo de nuevo.");
        }
      }
      setEstado("enviado");
      registrarEventoEmbudo("lead_form_submitted", { origen: "formulario", servicioKey: servicioKey ?? null });
    } catch (error) {
      setEstado("error");
      registrarEventoEmbudo("lead_form_error", { origen: "formulario" });
      setErrorEnvio(contactoRecibido
        ? `Recibimos tus datos, pero no se pudo completar el alta automática. ${error instanceof Error ? error.message : "Inténtalo de nuevo para finalizar la activación."}`
        : "No se pudo enviar. Revisa la conexión e inténtalo de nuevo.");
    }
  }

  if (estado === "enviado") return activarAvisosGratis ? <div role="status" className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5"><p className="text-xl font-extrabold text-emerald-900">¡Avisos activados!</p><p className="mt-2 text-base leading-relaxed text-emerald-900">Hemos guardado esta zona y cultivo en este dispositivo y activado el envío de avisos a {telefono.trim()} por WhatsApp. La suscripción queda vinculada al identificador de este navegador para que el servicio la reconozca cuando vuelvas.</p><p className="mt-2 text-base leading-relaxed text-emerald-900">Recibirás mensajes solo cuando las evaluaciones programadas detecten un riesgo relevante. No son alertas en tiempo real. Una persona del equipo podrá contactarte por WhatsApp en menos de 24 horas laborables para comprobar que el alta quedó correcta.</p><p className="mt-3 text-sm font-medium text-emerald-800">Para solicitar la baja o eliminar estos datos, escribe a <a className="font-bold underline" href="mailto:mcgtecrural@gmail.com">mcgtecrural@gmail.com</a>.</p></div> : <div role="status" className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5"><p className="text-xl font-extrabold text-emerald-900">Solicitud recibida</p><p className="mt-2 text-base leading-relaxed text-emerald-900">Una persona del equipo de TecRural revisará tus datos y te contactará por WhatsApp en menos de 24 horas laborables.</p><p className="mt-3 text-sm font-medium text-emerald-800">Para cancelar la solicitud, escribe a <a className="font-bold underline" href="mailto:mcgtecrural@gmail.com">mcgtecrural@gmail.com</a>.</p></div>;

  const listaErrores = Object.values(errores).filter(Boolean);
  return (
    <form onSubmit={enviar} noValidate className="rounded-2xl border-2 border-brand-800 bg-white p-5 shadow-sm">
       <h3 className="text-xl font-extrabold text-stone-900">Recibe avisos por WhatsApp</h3>
       <p className="mt-1 text-base text-stone-700">Déjanos estos datos y te avisaremos gratis de lo importante para tu cultivo.</p>
        <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm leading-relaxed text-brand-950"><p><strong>¿Qué recogemos?</strong> Nombre, teléfono o WhatsApp, municipio y cultivo.</p><p className="mt-1"><strong>¿Para qué?</strong> Para crear en este dispositivo la parcela y la suscripción de avisos de WhatsApp que solicitas.</p><p className="mt-1"><strong>¿Qué pasa después?</strong> Al enviar el formulario, el alta gratuita se activa automáticamente y queda vinculada a este navegador/dispositivo. Las evaluaciones se ejecutan de forma programada y se envía WhatsApp solo si se detecta una condición relevante para esa zona y cultivo; no es un servicio en tiempo real. Una persona del equipo puede escribirte en menos de 24 horas laborables para comprobar que todo quedó correcto.</p><p className="mt-1"><strong>¿Cómo cancelas?</strong> Solicita la baja o eliminación de tus datos en mcgtecrural@gmail.com.</p></div>
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
        <input id="contacto-municipio" name="municipio" required readOnly={activarAvisosGratis && Boolean(ubicacionAvisos)} autoComplete="address-level2" value={municipio} onBlur={() => actualizarError("municipio", municipio)} onChange={(e) => { const valor = e.target.value; setMunicipio(valor); actualizarError("municipio", valor); }} aria-invalid={Boolean(errores.municipio || errores.ubicacion)} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base read-only:bg-stone-100" />
        {errores.municipio ? <p className="mt-1 text-sm font-semibold text-red-700">{errores.municipio}</p> : null}
        {activarAvisosGratis && !ubicacionAvisos ? <p className="mt-1 text-sm text-stone-600">Primero busca y selecciona el municipio en el paso de zona para vincular las alertas a su ubicación.</p> : null}
        {errores.ubicacion ? <p className="mt-1 text-sm font-semibold text-red-700">{errores.ubicacion}</p> : null}

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

        <div className="mt-4 rounded-xl border-2 border-olive-300 bg-olive-50 p-3 text-sm leading-relaxed text-olive-950" aria-label="Qué ocurrirá al solicitar los avisos">
          <p className="font-extrabold">Antes de enviar: esto es lo que ocurrirá</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Al enviar, se crea la parcela y se activa automáticamente la suscripción de WhatsApp gratuita en este dispositivo.</li>
            <li>El sistema evaluará los riesgos según su programación y enviará WhatsApp solo cuando detecte condiciones relevantes para la zona y el cultivo.</li>
            <li>Las alertas no son en tiempo real. La persona del equipo puede contactarte después para comprobar que los datos y el alta sean correctos.</li>
          </ul>
        </div>

        {estado === "validando" ? <p role="status" className="mt-3 text-sm font-semibold text-stone-600">Validando…</p> : null}
       {listaErrores.length ? <div role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3"><p className="font-bold text-red-900">Datos incompletos</p><ul className="mt-1 list-disc pl-5 text-[15px] font-semibold text-red-800">{listaErrores.map((e) => <li key={e}>{e}</li>)}</ul></div> : null}
        {estado === "error" ? <div role="alert" className="mt-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-3"><p className="font-bold text-amber-900">{activarAvisosGratis ? "No se completó la activación" : "Error temporal"}</p><p className="mt-1 text-sm text-amber-800">{errorEnvio ?? "No se pudo enviar. Inténtalo de nuevo en unos minutos."}</p></div> : null}
        <button type="submit" disabled={estado === "enviando" || estado === "validando"} className="mt-4 min-h-[52px] w-full rounded-xl bg-brand-800 px-5 py-3 text-base font-extrabold text-white hover:bg-brand-900 disabled:opacity-60">{estado === "enviando" ? "Enviando…" : estado === "validando" ? "Validando…" : "Quiero recibir avisos"}</button>
    </form>
  );
}
