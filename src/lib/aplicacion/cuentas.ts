import {
  anonimizarLeadsDeUsuario,
  listarLeadsDeUsuario,
  vincularLeadsAUsuario,
} from "@/lib/datos/crm-repo";
import {
  eliminarParcelasDeUsuario,
  eliminarSuscripcionesDeUsuario,
  reclamarParcelasDeDispositivo,
} from "@/lib/datos/parcelas-repo";
import {
  buscarUsuarioPorId,
  consumirInvitacion,
  crearInvitacion,
  crearUsuario,
  eliminarUsuario,
  listarUsuarios,
  type NuevoUsuario,
} from "@/lib/datos/usuarios-repo";

export interface InvitacionCreada {
  usuarioId: string;
  token: string;
  expiresAt: Date;
}

/** Crea la cuenta y una invitación de un solo uso para entregar por WhatsApp. */
export async function crearCuentaConInvitacion(
  input: NuevoUsuario,
): Promise<InvitacionCreada> {
  const usuario = await crearUsuario(input);
  const invitacion = await crearInvitacion(usuario.id);
  return { usuarioId: usuario.id, token: invitacion.token, expiresAt: invitacion.expiresAt };
}

/** Vincula los datos anónimos del dispositivo actual a la cuenta. */
export async function reclamarDispositivo(
  userId: string,
  dispositivoId: string,
): Promise<{ parcelas: number; consultas: number }> {
  const [parcelas, consultas] = await Promise.all([
    reclamarParcelasDeDispositivo(userId, dispositivoId),
    vincularLeadsAUsuario(dispositivoId, userId),
  ]);
  return { parcelas, consultas };
}

/**
 * Canjea la invitación y reclama los datos del dispositivo desde el que se abre
 * el enlace. Devuelve el userId o null si el token no es válido.
 */
export async function aceptarInvitacion(
  token: string,
  dispositivoId: string,
): Promise<string | null> {
  const userId = await consumirInvitacion(token);
  if (!userId) return null;
  await reclamarDispositivo(userId, dispositivoId);
  return userId;
}

export interface CuentaExportada {
  usuario: { id: string; nombre: string | null; email: string | null; telefono: string | null; creadoEl: string };
  consultas: {
    id: string;
    creadoEl: string;
    estado: string;
    nombre: string | null;
    telefono: string | null;
    comentario: string | null;
  }[];
}

/** Exporta los datos de una cuenta (RGPD: derecho de acceso/portabilidad). */
export async function exportarCuenta(userId: string): Promise<CuentaExportada | null> {
  const usuario = await buscarUsuarioPorId(userId);
  if (!usuario) return null;
  const leads = await listarLeadsDeUsuario(userId);
  return {
    usuario: {
      id: usuario.id,
      nombre: usuario.name,
      email: usuario.email,
      telefono: usuario.phone,
      creadoEl: usuario.createdAt.toISOString(),
    },
    consultas: leads.map((l) => ({
      id: l.id,
      creadoEl: l.createdAt.toISOString(),
      estado: l.status,
      nombre: l.contactName,
      telefono: l.contactPhone,
      comentario: l.comment,
    })),
  };
}

/** Borra la cuenta: anonimiza consultas y elimina parcelas, suscripciones y usuario. */
export async function borrarCuenta(userId: string): Promise<void> {
  await anonimizarLeadsDeUsuario(userId);
  await eliminarSuscripcionesDeUsuario(userId);
  await eliminarParcelasDeUsuario(userId);
  await eliminarUsuario(userId);
}

export { listarUsuarios };
