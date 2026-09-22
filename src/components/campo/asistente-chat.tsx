"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { asegurarSesionDispositivo, obtenerDispositivoId } from "@/lib/datos/dispositivo";
import { registrarEventoEmbudo } from "@/lib/analitica";
import { VERSION_CONSENTIMIENTO } from "@/lib/privacidad/consentimiento";

interface Mensaje {
  de: "bot" | "usuario";
  texto: string;
}

type Paso = "inicio" | "problema" | "datos" | "enviando" | "enviado" | "error";

const PROBLEMAS = ["Heladas", "Riego", "Plagas", "Tiempo", "Sensores", "Otro"] as const;

/**
 * Asistente conversacional de portada: dos preguntas guiadas + contacto
 * mínimo. Resumen inmediato al equipo por Telegram vía /api/contacto.
 */
export function AsistenteChat() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [paso, setPaso] = useState<Paso>("inicio");
  const [perfil, setPerfil] = useState<"agricultura" | "ganaderia" | null>(null);
  const [problema, setProblema] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const finRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, paso, abierto]);

  function abrir() {
    setAbierto(true);
    if (mensajes.length === 0) {
      registrarEventoEmbudo("ai_conversation_started");
      registrarEventoEmbudo("lead_started", { origen: "asistente" });
      setMensajes([
        { de: "bot", texto: "Hola, soy el asistente de TecRural. Puedo ayudarte a saber qué solución encaja mejor con tu explotación." },
        { de: "bot", texto: "¿Eres agricultor o ganadero?" },
      ]);
    }
  }

  function reiniciar() {
    setMensajes([
      { de: "bot", texto: "Hola, soy el asistente de TecRural. Puedo ayudarte a saber qué solución encaja mejor con tu explotación." },
      { de: "bot", texto: "¿Eres agricultor o ganadero?" },
    ]);
    setPaso("inicio");
    setPerfil(null);
    setProblema("");
    setNombre("");
    setTelefono("");
    setMunicipio("");
    setAceptaPrivacidad(false);
  }

  function elegirPerfil(valor: "agricultura" | "ganaderia") {
    setPerfil(valor);
    const etiqueta = valor === "agricultura" ? "Agricultor" : "Ganadero";
    setMensajes((m) => [...m, { de: "usuario", texto: etiqueta }]);
    setMensajes((m) => [
      ...m,
      { de: "bot", texto: "¿Qué te preocupa más ahora mismo: heladas, riego, plagas, tiempo, sensores u otro problema?" },
    ]);
    setPaso("problema");
  }

  function elegirProblema(valor: string) {
    setProblema(valor);
    setMensajes((m) => [...m, { de: "usuario", texto: valor }]);
    setMensajes((m) => [
      ...m,
      { de: "bot", texto: "Perfecto. Para llamarte o escribirte por WhatsApp: ¿tu nombre, teléfono y municipio?" },
    ]);
    setPaso("datos");
  }

  function datosValidos(): boolean {
    return (
      nombre.trim().length >= 2 &&
       /^(?:\+34)?[6789]\d{8}$/.test(telefono.replace(/[\s().-]/g, "").replace(/^0034/, "+34")) &&
       municipio.trim().length >= 2 &&
       municipio.trim().length <= 80 &&
       aceptaPrivacidad
    );
  }

  async function enviar() {
    if (!datosValidos()) {
      setMensajes((m) => [...m, { de: "bot", texto: "Completa los tres datos y acepta la política de privacidad para enviar la solicitud." }]);
      return;
    }
    setPaso("enviando");
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
          tipoExplotacion: perfil,
          problema,
          origen: "asistente",
          aceptaPrivacidad: true,
          consentVersion: VERSION_CONSENTIMIENTO,
          marketingConsent: false,
        }),
      });
      if (!resp.ok) throw new Error();
      registrarEventoEmbudo("lead_submitted", { origen: "asistente", tipoExplotacion: perfil ?? null, problema });
      setMensajes((m) => [
        ...m,
         { de: "bot", texto: "Solicitud recibida. Revisaremos tus datos y te enviaremos un WhatsApp para confirmar la activación de los avisos, normalmente en menos de 24 horas laborables. Puedes cancelar respondiendo BAJA." },
      ]);
      setPaso("enviado");
    } catch {
      setMensajes((m) => [
        ...m,
        { de: "bot", texto: "No he podido enviar tus datos. Revisa la conexión y dale a enviar de nuevo." },
      ]);
      setPaso("error");
    }
  }

  return (
    <>
      {!abierto ? (
        <button
          type="button"
          onClick={abrir}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full border-2 border-brand-800 bg-brand-800 px-5 py-3 text-base font-bold text-white shadow-lg hover:bg-brand-900 md:w-auto"
        >
          ¿Te ayudo?
        </button>
      ) : null}

      {abierto ? (
        <div role="dialog" aria-modal="true" aria-labelledby="asistente-titulo" className="fixed inset-x-4 bottom-24 z-30 mx-auto flex max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col rounded-2xl border-2 border-stone-900 bg-white shadow-xl md:bottom-6">
          <div className="flex items-center justify-between rounded-t-2xl border-b-2 border-stone-200 bg-brand-800 px-4 py-3 text-white">
            <p id="asistente-titulo" className="text-sm font-bold">Asistente TecRural</p>
            <div className="flex gap-2">
              <button type="button" onClick={reiniciar} aria-label="Reiniciar conversación" className="min-h-[32px] rounded-lg px-2 text-sm font-bold hover:bg-brand-900">↺</button>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar asistente" className="min-h-[32px] rounded-lg px-2 text-sm font-bold hover:bg-brand-900">✕</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="flex flex-col gap-2">
              {mensajes.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-snug ${m.de === "bot" ? "self-start bg-stone-100 text-stone-900" : "self-end bg-brand-800 text-white"}`}
                >
                  {m.texto}
                </div>
              ))}
              <div ref={finRef} />
            </div>

            {paso === "inicio" ? (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => elegirPerfil("agricultura")} className="min-h-[44px] flex-1 rounded-xl border-2 border-brand-800 bg-white px-3 py-2 text-sm font-bold text-brand-900 hover:bg-brand-50">Agricultor</button>
                <button type="button" onClick={() => elegirPerfil("ganaderia")} className="min-h-[44px] flex-1 rounded-xl border-2 border-brand-800 bg-white px-3 py-2 text-sm font-bold text-brand-900 hover:bg-brand-50">Ganadero</button>
              </div>
            ) : null}

            {paso === "problema" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {PROBLEMAS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => elegirProblema(p)}
                    className="min-h-[40px] rounded-full border-2 border-brand-800 bg-white px-3 py-1.5 text-sm font-bold text-brand-900 hover:bg-brand-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            ) : null}

            {paso === "datos" || paso === "enviando" || paso === "error" ? (
              <div className="mt-3 flex flex-col gap-2">
                <label htmlFor="asistente-nombre" className="text-xs font-bold text-stone-700">Nombre <span className="font-normal">(obligatorio)</span></label>
                <input id="asistente-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. María García" autoComplete="name" className="min-h-[44px] w-full rounded-xl border-2 border-stone-300 px-3 py-2 text-sm font-medium" />
                <label htmlFor="asistente-telefono" className="text-xs font-bold text-stone-700">Teléfono o WhatsApp <span className="font-normal">(obligatorio)</span></label>
                <input id="asistente-telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej. 600 123 456" inputMode="tel" autoComplete="tel" className="min-h-[44px] w-full rounded-xl border-2 border-stone-300 px-3 py-2 text-sm font-medium" />
                <label htmlFor="asistente-municipio" className="text-xs font-bold text-stone-700">Municipio <span className="font-normal">(obligatorio)</span></label>
                <input id="asistente-municipio" value={municipio} onChange={(e) => setMunicipio(e.target.value)} placeholder="Ej. Baza" autoComplete="address-level2" className="min-h-[44px] w-full rounded-xl border-2 border-stone-300 px-3 py-2 text-sm font-medium" />
                {paso === "error" ? (
                  <p role="alert" className="text-xs font-semibold text-red-700">Revisa los datos (nombre, teléfono y municipio) e inténtalo de nuevo.</p>
                ) : null}
                <label htmlFor="asistente-privacidad" className="flex items-start gap-2 text-[11px] leading-snug text-stone-600"><input id="asistente-privacidad" type="checkbox" checked={aceptaPrivacidad} onChange={(e) => setAceptaPrivacidad(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Obligatorio:</strong> acepto el tratamiento de mis datos para gestionar esta solicitud y he leído la <Link href="/privacidad" className="font-bold text-brand-800 underline">política de privacidad</Link> ({VERSION_CONSENTIMIENTO}).</span></label>
                <button
                  type="button"
                  onClick={enviar}
                  disabled={paso === "enviando" || !datosValidos()}
                  className="min-h-[48px] w-full rounded-xl bg-brand-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-900 disabled:opacity-60"
                >
                  {paso === "enviando" ? "Enviando…" : "Enviar y que me contacten"}
                </button>
              </div>
            ) : null}

            {paso === "enviado" ? (
              <button type="button" onClick={reiniciar} className="mt-3 min-h-[40px] text-sm font-bold text-brand-800 underline underline-offset-4">
                Empezar de nuevo
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
