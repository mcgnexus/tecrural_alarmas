import type { HallazgoAgronomico } from "@/lib/dominio/tipos";
import type { ContextoAgronomico } from "../contexto";

export interface Regla {
  id: string;
  nombre: string;
  descripcion: string;
  evaluar(ctx: ContextoAgronomico): HallazgoAgronomico[];
}
