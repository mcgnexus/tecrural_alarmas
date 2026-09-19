import { catalogoCultivos } from "@/lib/cultivos/catalogo";
import { slugPlataformaDesdeCultura } from "@/lib/dominio/cultivos";
import {
  actualizarKcCultivo,
  listarCultivosPlataforma,
  upsertEstadoFenologico,
} from "@/lib/datos/catalogo-repo";

export interface ResultadoCargaCatalogo {
  cultivos: number;
  estados: number;
}

/**
 * Carga el catálogo fenológico interno en `plataforma` con sus Kc (candidatos,
 * `kc_validated = false`). No pisa cultivos/estados cuyo Kc ya esté validado.
 */
export async function cargarCatalogoFenologico(): Promise<ResultadoCargaCatalogo> {
  const cultivos = await listarCultivosPlataforma();
  const porSlug = new Map(cultivos.map((c) => [c.slug, c]));

  let cultivosCargados = 0;
  let estadosCargados = 0;

  for (const cultura of Object.values(catalogoCultivos)) {
    const slug = slugPlataformaDesdeCultura(cultura.id);
    if (!slug) continue;
    const crop = porSlug.get(slug);
    if (!crop) continue;

    if (!crop.kcValidated) {
      await actualizarKcCultivo(crop.id, {
        kc: cultura.factorKc,
        kcValidated: false,
      });
      cultivosCargados += 1;
    }

    for (let i = 0; i < cultura.fenologia.length; i += 1) {
      const fase = cultura.fenologia[i];
      if (!fase) continue;
      await upsertEstadoFenologico({
        cropId: crop.id,
        slug: fase.id,
        nameEs: fase.etiqueta,
        orderIndex: i,
        kc: fase.factorKc,
        kcValidated: false,
      });
      estadosCargados += 1;
    }
  }

  return { cultivos: cultivosCargados, estados: estadosCargados };
}
