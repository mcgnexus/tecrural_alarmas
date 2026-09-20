/**
 * Datos de contacto comerciales de TecRural. El teléfono y el WhatsApp se
 * configuran por entorno (`NEXT_PUBLIC_TECRURAL_TELEFONO`,
 * `NEXT_PUBLIC_TECRURAL_WHATSAPP`); si no están definidos, la UI muestra solo
 * el email y el formulario.
 */

const TELEFONO = process.env.NEXT_PUBLIC_TECRURAL_TELEFONO?.trim() ?? "";
const WHATSAPP = process.env.NEXT_PUBLIC_TECRURAL_WHATSAPP?.trim() ?? "";

export const EMAIL_CONTACTO = "mcgtecrural@gmail.com";

/** Teléfono en formato visible, p. ej. "600 000 000". Vacío si no hay config. */
export const TELEFONO_VISIBLE = TELEFONO;

/** Teléfono en formato enlace "tel:+34600000000". Null si no hay config. */
export function enlaceTelefono(): string | null {
  if (!TELEFONO) return null;
  return `tel:${TELEFONO.replace(/[^\d+]/g, "")}`;
}

/** Número de WhatsApp en dígitos (con prefijo). Null si no hay config. */
export function numeroWhatsapp(): string | null {
  if (!WHATSAPP) return null;
  return WHATSAPP.replace(/[^\d]/g, "");
}

export function enlaceWhatsapp(mensaje?: string): string | null {
  const numero = numeroWhatsapp();
  if (!numero) return null;
  const texto = mensaje ? `?text=${encodeURIComponent(mensaje)}` : "";
  return `https://wa.me/${numero}${texto}`;
}

/**
 * Mensaje preescrito con perfil y municipio del visitante (si constan en el
 * dispositivo): «Hola, vengo de TecRural. Soy agricultor de Baza y quiero
 * información sobre las soluciones para mi explotación.»
 * Solo válido en cliente (lee localStorage).
 */
export function mensajeWhatsappPersonal(servicioOProblema?: string): string {
  if (typeof window === "undefined") {
    return "Hola, vengo de TecRural y quiero información sobre las soluciones para mi explotación.";
  }
  let perfil = "agricultor";
  try {
    const guardado = localStorage.getItem("tecrural:perfil");
    if (guardado === "ganadero") perfil = "ganadero";
  } catch {}
  let municipio = "";
  try {
    const raw = localStorage.getItem("tecrural:ubicacion");
    if (raw) {
      const nombre = (JSON.parse(raw) as { nombre?: string }).nombre ?? "";
      municipio = nombre.split(",")[0]?.trim() ?? "";
    }
  } catch {}
  const conMunicipio = municipio ? ` de ${municipio}` : "";
  const sobre = servicioOProblema
    ? ` y quiero información sobre ${servicioOProblema}`
    : " y quiero información sobre las soluciones para mi explotación";
  return `Hola, vengo de TecRural. Soy ${perfil}${conMunicipio}${sobre}.`;
}

/** Igual que `enlaceWhatsapp` pero con el mensaje personalizado del visitante. */
export function enlaceWhatsappPersonal(servicioOProblema?: string): string | null {
  return enlaceWhatsapp(mensajeWhatsappPersonal(servicioOProblema));
}
