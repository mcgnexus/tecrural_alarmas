"use client";
import { useState } from "react";

type Solicitud = {
  id: string;
  nombre: string | null;
  telefono: string | null;
  score: number | null;
  status: string | null;
  source: string | null;
  created_at: string;
  municipio: string | null;
  servicio: string | null;
  problema: string | null;
  tipo_explotacion: string | null;
};

export default function AdminSolicitudesPage() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<Solicitud[]>([]);
  const [err, setErr] = useState<string | null>(null);
  async function load() {
    setErr(null);
    try {
      const r = await fetch("/api/admin/solicitudes", { headers: { "x-admin-secret": secret } });
      if (!r.ok) throw new Error((await r.json()).error);
      const j = await r.json() as { solicitudes: Solicitud[] };
      setData(j.solicitudes);
    } catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
  }
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-xl font-bold">Solicitudes comerciales</h1>
      <p className="mt-1 text-sm text-stone-600">Contactos captados por formulario o asistente (CRM).</p>
      <div className="mt-2 flex gap-2">
        <input value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="ADMIN_SECRET" type="password" className="flex-1 rounded-xl border-2 border-stone-300 px-3 py-2" />
        <button onClick={load} className="rounded-xl bg-stone-900 px-4 py-2 text-white">Cargar</button>
      </div>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
      <div className="mt-4 overflow-x-auto rounded-xl border-2 border-stone-200">
        <table className="w-full text-sm">
          <thead className="bg-stone-900 text-white">
            <tr>
              <th className="px-3 py-2 text-left">Nombre</th>
              <th className="px-3 py-2 text-left">Teléfono</th>
              <th className="px-3 py-2 text-left">Municipio</th>
              <th className="px-3 py-2 text-left">Servicio</th>
              <th className="px-3 py-2 text-left">Problema</th>
              <th className="px-3 py-2 text-left">Explotación</th>
              <th className="px-3 py-2 text-center">Score</th>
              <th className="px-3 py-2 text-left">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-4 text-center text-stone-600">Sin resultados. Pulsa Cargar.</td></tr>
            ) : data.map((s) => (
              <tr key={s.id}>
                <td className="px-3 py-2 font-semibold">{s.nombre ?? "—"}</td>
                <td className="px-3 py-2">{s.telefono ?? "—"}</td>
                <td className="px-3 py-2">{s.municipio ?? "—"}</td>
                <td className="px-3 py-2">{s.servicio ?? "—"}</td>
                <td className="px-3 py-2">{s.problema ?? "—"}</td>
                <td className="px-3 py-2">{s.tipo_explotacion ?? "—"}</td>
                <td className="px-3 py-2 text-center font-bold">{s.score ?? 0}</td>
                <td className="px-3 py-2">{new Date(s.created_at).toLocaleDateString("es-ES")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
