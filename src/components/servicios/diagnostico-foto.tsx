"use client";

import { useState } from "react";

type Resultado = { summary: string; hypotheses: string[]; recommendations: string[]; confidence: string; disclaimer: string };

export function DiagnosticoFoto() {
  const [crop, setCrop] = useState("almendro");
  const [phone, setPhone] = useState("");
  const [image, setImage] = useState("");
  const [notes, setNotes] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function enviar() {
    setError("");
    setResultado(null);
    if (!phone.trim()) return setError("Deja tu teléfono para poder usar el diagnóstico.");
    if (!/^\+?[1-9]\d{7,14}$/.test(phone.trim())) return setError("Introduce un teléfono válido, por ejemplo +34600000000.");
    if (!image) return setError("Selecciona una fotografía.");
    setCargando(true);
    try {
      const dispositivoId = localStorage.getItem("tecrural:dispositivo") || crypto.randomUUID();
      localStorage.setItem("tecrural:dispositivo", dispositivoId);
      await fetch("/api/sesion/dispositivo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ dispositivoId }) });
      const respuesta = await fetch("/api/diagnostico", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ imageData: image, crop, phone: phone.trim(), notes }) });
      const datos = await respuesta.json() as Resultado & { error?: string };
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo completar el diagnóstico.");
      setResultado(datos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo completar el diagnóstico.");
    } finally {
      setCargando(false);
    }
  }

  function leerImagen(file: File | undefined) {
    if (!file || !["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) return setError("Elige una imagen JPG, PNG, GIF o WebP.");
    if (file.size > 5 * 1024 * 1024) return setError("La imagen no puede superar 5 MB.");
    const lector = new FileReader();
    lector.onload = () => setImage(typeof lector.result === "string" ? lector.result : "");
    lector.readAsDataURL(file);
  }

  return <section id="diagnostico-foto" className="rounded-2xl border-2 border-brand-200 bg-brand-50 p-5">
    <h2 className="text-xl font-extrabold text-brand-950">Diagnóstico visual de una planta</h2>
    <p className="mt-1 text-base text-stone-700">Sube una foto clara de una hoja o fruto. Obtendrás hipótesis orientativas, no una receta.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="font-bold text-stone-800">Cultivo<select value={crop} onChange={(e) => setCrop(e.target.value)} className="mt-1 min-h-[48px] w-full rounded-xl border-2 border-stone-300 bg-white px-3 font-normal"><option value="almendro">Almendro</option><option value="olivar">Olivar</option><option value="pistacho">Pistacho</option><option value="cereal">Cereal</option><option value="aguacate">Aguacate</option></select></label>
      <label className="font-bold text-stone-800">Teléfono requerido<input type="tel" inputMode="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+34600000000" autoComplete="tel" className="mt-1 min-h-[48px] w-full rounded-xl border-2 border-stone-300 bg-white px-3 font-normal" /></label>
      <label className="font-bold text-stone-800">Fotografía<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(e) => leerImagen(e.target.files?.[0])} className="mt-1 block min-h-[48px] w-full rounded-xl border-2 border-stone-300 bg-white px-3 py-2 font-normal" /></label>
    </div>
    <label className="mt-3 block font-bold text-stone-800">Observaciones <span className="font-normal text-stone-600">(opcional)<textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} placeholder="Ej. manchas desde hace tres días" className="mt-1 w-full rounded-xl border-2 border-stone-300 bg-white px-3 py-2 font-normal" /></span></label>
    <button type="button" onClick={() => void enviar()} disabled={cargando} className="mt-3 min-h-[52px] rounded-xl bg-brand-800 px-5 py-3 font-bold text-white hover:bg-brand-900 disabled:opacity-60">{cargando ? "Analizando…" : "Analizar fotografía"}</button>
    {error ? <p role="alert" className="mt-3 font-semibold text-red-800">{error}</p> : null}
    {resultado ? <div role="status" className="mt-4 rounded-xl border-2 border-brand-200 bg-white p-4"><p className="font-bold text-brand-950">{resultado.summary}</p><p className="mt-2 text-sm text-stone-700">Confianza orientativa: {resultado.confidence}</p><h3 className="mt-3 font-bold">Posibles causas</h3><ul className="list-disc pl-5">{resultado.hypotheses.map((item) => <li key={item}>{item}</li>)}</ul><h3 className="mt-3 font-bold">Siguientes pasos</h3><ul className="list-disc pl-5">{resultado.recommendations.map((item) => <li key={item}>{item}</li>)}</ul><p className="mt-3 text-sm text-stone-600">{resultado.disclaimer}</p></div> : null}
  </section>;
}
