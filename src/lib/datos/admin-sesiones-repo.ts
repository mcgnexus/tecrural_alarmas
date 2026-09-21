import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { obtenerDb } from "./db";
import { sesionesAdmin } from "./plataforma-schema";

/** Duración de una sesión de administración (8 horas). */
export const DURACION_SESION_ADMIN_MS = 60 * 60 * 8 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Crea una sesión de admin: genera un token aleatorio (se entrega al cliente en
 * una cookie HttpOnly) y guarda solo su hash en base de datos.
 */
export async function crearSesionAdmin(): Promise<{ token: string; expiresAt: Date }> {
  const db = obtenerDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + DURACION_SESION_ADMIN_MS);
  await db.insert(sesionesAdmin).values({ tokenHash: hashToken(token), expiresAt });
  await purgarSesionesAdmin();
  return { token, expiresAt };
}

/** ¿El token corresponde a una sesión no revocada y vigente? */
export async function sesionAdminValida(token: string): Promise<boolean> {
  if (!token) return false;
  const db = obtenerDb();
  const [fila] = await db
    .select({ id: sesionesAdmin.id })
    .from(sesionesAdmin)
    .where(
      and(
        eq(sesionesAdmin.tokenHash, hashToken(token)),
        isNull(sesionesAdmin.revokedAt),
        gt(sesionesAdmin.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return Boolean(fila);
}

/** Revoca la sesión asociada al token (logout). */
export async function revocarSesionAdmin(token: string): Promise<void> {
  if (!token) return;
  const db = obtenerDb();
  await db
    .update(sesionesAdmin)
    .set({ revokedAt: new Date() })
    .where(eq(sesionesAdmin.tokenHash, hashToken(token)));
}

/** Elimina sesiones caducadas (limpieza oportunista). */
export async function purgarSesionesAdmin(): Promise<void> {
  const db = obtenerDb();
  await db.delete(sesionesAdmin).where(lt(sesionesAdmin.expiresAt, new Date()));
}
