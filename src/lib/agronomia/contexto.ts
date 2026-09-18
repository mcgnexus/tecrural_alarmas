import type { FaseFenologica, Cultura } from "@/lib/cultivos/catalogo";
import type { ClimaPunto } from "@/lib/clima/tipos";

export interface ContextoAgronomico {
  clima: ClimaPunto;
  cultivo: Cultura;
  fenofase: FaseFenologica | null;
  momento: Date;
}