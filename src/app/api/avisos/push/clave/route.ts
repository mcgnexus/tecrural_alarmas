import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const clavePublica = process.env.VAPID_PUBLIC_KEY ?? null;
  return NextResponse.json({ clavePublica });
}
