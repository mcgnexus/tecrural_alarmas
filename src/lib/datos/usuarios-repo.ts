import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { obtenerDb } from "./db";
import { tokensUsuario, usuarios } from "./plataforma-schema";
import type { Plan } from "@/lib/planes/permisos";

export type Usuario = typeof usuarios.$inferSelect;

export interface NuevoUsuario {
  nombre: string;
  telefono?: string | null;
  email?: string | null;
  authProvider?: string;
  consentVersion?: string | null;
  marketingConsent?: boolean;
  subscriptionPlan?: Plan;
}

/** Duración de una invitación de acceso (14 días). */
export const DURACION_INVITACION_MS = 14 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function crearUsuario(input: NuevoUsuario): Promise<Usuario> {
  const db = obtenerDb();
  const ahora = new Date();
  const [fila] = await db
    .insert(usuarios)
    .values({
      name: input.nombre.trim(),
      phone: input.telefono?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      authProvider: input.authProvider ?? "manual",
      subscriptionPlan: input.subscriptionPlan ?? "free",
      consentVersion: input.consentVersion ?? null,
      consentTimestamp: input.consentVersion ? ahora : null,
      marketingConsent: input.marketingConsent ?? false,
      marketingConsentAt: input.marketingConsent ? ahora : null,
    })
    .returning();
  if (!fila) throw new Error("No se pudo crear el usuario.");
  return fila;
}

export async function buscarUsuarioPorId(id: string): Promise<Usuario | null> {
  const db = obtenerDb();
  const [fila] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
  return fila ?? null;
}

export async function listarUsuarios(limite = 200): Promise<Usuario[]> {
  const db = obtenerDb();
  return db.select().from(usuarios).orderBy(desc(usuarios.createdAt)).limit(limite);
}

export async function actualizarUsuario(
  id: string,
  cambios: Partial<Pick<Usuario, "name" | "phone" | "email" | "marketingConsent" | "subscriptionPlan">>,
): Promise<void> {
  const db = obtenerDb();
  await db
    .update(usuarios)
    .set({ ...cambios, updatedAt: new Date() })
    .where(eq(usuarios.id, id));
}

export async function eliminarUsuario(id: string): Promise<void> {
  const db = obtenerDb();
  await db.delete(usuarios).where(eq(usuarios.id, id));
}

/** Crea una invitación de un solo uso y devuelve el token en claro. */
export async function crearInvitacion(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const db = obtenerDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DURACION_INVITACION_MS);
  await db.insert(tokensUsuario).values({
    userId,
    tokenHash: hashToken(token),
    tipo: "invite",
    expiresAt,
  });
  return { token, expiresAt };
}

/**
 * Canjea una invitación: valida (no usada, no caducada) y la marca como usada
 * en una única sentencia atómica. Devuelve el userId o null.
 */
export async function consumirInvitacion(token: string): Promise<string | null> {
  if (!token) return null;
  const db = obtenerDb();
  const [fila] = await db
    .update(tokensUsuario)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(tokensUsuario.tokenHash, hashToken(token)),
        eq(tokensUsuario.tipo, "invite"),
        isNull(tokensUsuario.usedAt),
        gt(tokensUsuario.expiresAt, new Date()),
      ),
    )
    .returning({ userId: tokensUsuario.userId });
  return fila?.userId ?? null;
}
