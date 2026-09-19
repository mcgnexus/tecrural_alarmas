"use client";
import { useState } from "react";
export default function AdminEventosPage() {
  const [secret, setSecret] = useState("");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [err, setErr] = useState<string | null>(null);
  async function load() {
    setErr(null);
    try {
      const r = await fetch("/api/admin/eventos", { headers: { "x-admin-secret": secret } });
      if (!r.ok) throw new Error((await r.json()).error);
      const j = await r.json() as { eventos: Record<string, unknown>[] };
      setData(j.eventos);
    } catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
  }
  return <div className="mx-auto max-w-3xl p-4"><h1 className="text-xl font-bold">Eventos</h1><div className="mt-2 flex gap-2"><input value={secret} onChange={(e)=>setSecret(e.target.value)} placeholder="ADMIN_SECRET" type="password" className="flex-1 rounded-xl border-2 border-stone-300 px-3 py-2" /><button onClick={load} className="rounded-xl bg-stone-900 px-4 py-2 text-white">Cargar</button></div>{err && <p className="mt-2 text-sm text-red-700">{err}</p>}<div className="mt-4 overflow-x-auto rounded-xl border-2 border-stone-200"><table className="w-full text-sm"><thead className="bg-stone-900 text-white"><tr><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Puntos</th><th className="px-3 py-2">Usuario</th><th className="px-3 py-2">Fecha</th></tr></thead><tbody className="divide-y">{data.map((r,i)=><tr key={i}><td className="px-3 py-2">{String(r.event_type)}</td><td className="px-3 py-2">{String(r.points)}</td><td className="px-3 py-2">{String((r as Record<string, unknown>).usuario ?? r.anonymous_id ?? "—")}</td><td className="px-3 py-2">{new Date(String(r.created_at)).toLocaleDateString("es-ES")}</td></tr>)}</tbody></table></div></div>;
}
