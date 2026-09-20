"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { asegurarSesionDispositivo, obtenerDispositivoId } from "@/lib/datos/dispositivo";
import type { InteresLead } from "@/lib/dominio/leads";
import { enlaceWhatsapp } from "@/lib/config/contacto";
import { registrarEventoEmbudo } from "@/lib/analitica";

type Estado = "inicial" | "enviando" | "enviado" | "error";
type Errores = Partial<Record<"nombre" | "telefono" | "municipio" | "privacidad", string>>;

function municipioGuardado(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("tecrural:ubicacion");
    const nombre = raw ? (JSON.parse(raw) as { nombre?: string }).nombre ?? "" : "";
    return nombre.split(",")[0]?.trim() ?? "";
  } catch { return ""; }
}

export function FormularioContacto({ servicioKey, servicioNombre, interes }: { servicioKey?: string; servicioNombre?: string; interes?: InteresLead }) {
  const [estado, setEstado] = useState<Estado>("inicial");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [municipio, setMunicipio] = useState(municipioGuardado);
  const [acepta, setAcepta] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [leadIniciado, setLeadIniciado] = useState(false);
  const wa = useMemo(() => enlaceWhatsapp(servicioNombre ? `Hola, quiero información sobre: ${servicioNombre}` : "Hola, quiero información para mi explotación."), [servicioNombre]);

  function iniciarLead() {
    if (leadIniciado) return;
    setLeadIniciado(true);
    registrarEventoEmbudo("lead_started", { origen: "formulario", servicioKey: servicioKey ?? null });
  }

  function validar(): Errores {
    const siguientes: Errores = {};
    if (nombre.trim().length < 2) siguientes.nombre = "Escribe tu nombre.";
    if (!/^\+?[\d\s().-]{9,20}$/.test(telefono.trim())) siguientes.telefono = "Escribe un teléfono válido.";
    if (!municipio.trim()) siguientes.municipio = "Escribe tu municipio.";
    if (!acepta) siguientes.privacidad = "Debes aceptar que te contactemos.";
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
          dispositivoId: obtenerDispositivoId(), nombre: nombre.trim(), telefono: telefono.trim(), municipio: municipio.trim(),
          tipoExplotacion: "agricultura", problema: servicioNombre || "Orientación inicial", servicioKey, servicioNombre, interes,
          origen: "formulario", aceptaPrivacidad: true,
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

  if (estado === "enviado") return <div role="status" className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5"><p className="text-xl font-extrabold text-emerald-900">Solicitud enviada</p><p className="mt-1 text-base text-emerald-900">Te contactaremos en menos de 24 h laborables.</p></div>;

  const listaErrores = Object.values(errores).filter(Boolean);
  return (
    <form onSubmit={enviar} noValidate className="rounded-2xl border-2 border-brand-800 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-extrabold text-stone-900">Te llamamos</h3>
      <p className="mt-1 text-base text-stone-700">Solo necesitamos tres datos. Sin compromiso.</p>
      {wa ? <a href={wa} target="_blank" rel="noopener noreferrer" onClick={() => registrarEventoEmbudo("click_whatsapp", { origen: "formulario", servicioKey: servicioKey ?? null })} className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-base font-extrabold text-white hover:bg-emerald-800">Escribir por WhatsApp</a> : null}

      <label className="mt-4 block text-base font-bold text-stone-900" htmlFor="contacto-nombre">Nombre</label>
      <input id="contacto-nombre" name="nombre" required value={nombre} onFocus={iniciarLead} onChange={(e) => setNombre(e.target.value)} autoComplete="name" aria-invalid={Boolean(errores.nombre)} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base" />
      {errores.nombre ? <p className="mt-1 text-sm font-semibold text-red-700">{errores.nombre}</p> : null}

      <label className="mt-3 block text-base font-bold text-stone-900" htmlFor="contacto-telefono">Teléfono o WhatsApp</label>
      <input id="contacto-telefono" name="telefono" required type="tel" inputMode="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} aria-invalid={Boolean(errores.telefono)} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base" />
      {errores.telefono ? <p className="mt-1 text-sm font-semibold text-red-700">{errores.telefono}</p> : null}

      <label className="mt-3 block text-base font-bold text-stone-900" htmlFor="contacto-municipio">Municipio</label>
      <input id="contacto-municipio" name="municipio" required autoComplete="address-level2" value={municipio} onChange={(e) => setMunicipio(e.target.value)} aria-invalid={Boolean(errores.municipio)} className="mt-1 min-h-[52px] w-full rounded-xl border-2 border-stone-300 px-4 py-3 text-base" />
      {errores.municipio ? <p className="mt-1 text-sm font-semibold text-red-700">{errores.municipio}</p> : null}

      <label className="mt-4 flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl border-2 border-stone-300 p-3">
        <input type="checkbox" required checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="h-6 w-6 shrink-0 accent-brand-800" />
        <span className="text-[15px] font-medium text-stone-900">Acepto que TecRural me contacte y he leído la <Link href="/privacidad" className="font-bold text-brand-800 underline">política de privacidad</Link>.</span>
      </label>

      {listaErrores.length ? <div role="alert" className="mt-3 rounded-xl border-2 border-red-300 bg-red-50 p-3"><p className="font-bold text-red-900">Revisa estos datos:</p><ul className="mt-1 list-disc pl-5 text-[15px] font-semibold text-red-800">{listaErrores.map((e) => <li key={e}>{e}</li>)}</ul></div> : null}
      <button type="submit" disabled={estado === "enviando"} className="mt-4 min-h-[52px] w-full rounded-xl bg-brand-800 px-5 py-3 text-base font-extrabold text-white hover:bg-brand-900 disabled:opacity-60">{estado === "enviando" ? "Enviando…" : "Quiero que me llamen"}</button>
    </form>
  );
}
