import Link from "next/link";

export const metadata = { title: "Ubicación" };

export default function LocationPage() {
  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="text-xl font-bold">Ubicación</h1>
      <p className="mt-2 text-sm text-stone-600">Selección anónima de municipio o GPS. Ver <Link href="/" className="underline">inicio</Link>.</p>
    </div>
  );
}
