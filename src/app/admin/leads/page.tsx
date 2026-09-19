"use client";
import { useState } from "react";
import { TablaLeads } from "@/components/admin/tabla-leads";
export default function AdminLeadsPage() {
  const [secret, setSecret] = useState("");
  const [ok, setOk] = useState(false);
  return <div className="mx-auto max-w-3xl p-4"><h1 className="text-xl font-bold">Leads</h1><div className="mt-2 flex gap-2"><input value={secret} onChange={(e)=>setSecret(e.target.value)} placeholder="ADMIN_SECRET" type="password" className="flex-1 rounded-xl border-2 border-stone-300 px-3 py-2" /><button onClick={()=>setOk(true)} className="rounded-xl bg-stone-900 px-4 py-2 text-white">Ver</button></div>{ok && <div className="mt-4"><TablaLeads secret={secret} /></div>}</div>;
}
