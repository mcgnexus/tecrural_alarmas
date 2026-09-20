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
