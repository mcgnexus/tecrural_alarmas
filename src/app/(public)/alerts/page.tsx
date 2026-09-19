import Link from "next/link";

export const metadata = { title: "Alerts" };

export default function AlertsPublicPage() {
  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="text-xl font-bold">Alerts</h1>
      <p className="mt-2 text-sm text-stone-600">Vista pública de alertas genéricas. Ver <Link href="/alertas" className="underline">alertas</Link> reales.</p>
    </div>
  );
}
