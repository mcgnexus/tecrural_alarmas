export const dynamic = "force-static";
export const revalidate = false;

export async function GET() {
  const contacto = "hola@tecrural.es";
  const dominio =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://tecrural.es");

  const cuerpo = [
    "Contact: mailto:" + contacto,
    "Expires: 2027-12-31T23:59:59.000Z",
    "Preferred-Languages: es",
    "Canonical: " + dominio + "/.well-known/security.txt",
    "Policy: " + dominio + "/privacidad",
    "Acknowledges-Activity: true",
  ].join("\n") + "\n";

  return new Response(cuerpo, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
      "Referrer-Policy": "no-referrer",
    },
  });
}
