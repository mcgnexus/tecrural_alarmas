import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const clavePublica = process.env.VAPID_PUBLIC_KEY ?? null;
  // Health check: el canal push solo se ofrece si VAPID está configurado.
  return NextResponse.json({ clavePublica, disponible: Boolean(clavePublica) });
}
