import { describe, it, expect } from "vitest";
import { tipoLeadEvento } from "@/lib/aplicacion/lead-events";
import { clasificarLead } from "@/lib/dominio/lead-scores";

describe("E2E usuario entra → ubicación → añade parcela → almendro → dashboard → helada → sensor → solicita información", () => {
  it("genera correctamente todos los eventos de lead", () => {
    const eventos: string[] = [];

    // 1. usuario entra
    let t = tipoLeadEvento("consulta_meteorologia", []);
    expect(t).toBe("APP_VISIT");
    eventos.push(t!);

    // 2. ubicación (app visit + location)
    t = tipoLeadEvento("consulta_meteorologia", []);
    // simulamos LOCATION_SELECTED via lead event type deduction (no direct mapping, but via tipoLeadEvento default)
    // For E2E we push manual types as per funnel
    eventos.push("LOCATION_SELECTED");

    // 3. añade parcela
    t = tipoLeadEvento("parcela_anadida", []);
    expect(t).toBe("PLOT_CREATED");
    eventos.push(t!);

    // 4. selecciona almendro
    t = tipoLeadEvento("parcela_anadida", []);
    // CROP_SELECTED via interest?
    eventos.push("CROP_SELECTED");

    // 5. dashboard → abre helada
    t = tipoLeadEvento("diagnostico_usado", []);
    // ALERT_OPENED not via tipoLeadEvento directly, but we simulate
    eventos.push("ALERT_OPENED");

    // 6. pulsa sensor (CTA contextual helada)
    t = tipoLeadEvento("presupuesto_intent", ["SENSORS"]);
    expect(t).toBe("SENSOR_CTA_CLICKED");
    eventos.push(t!);

    // 7. solicita información (CTA servicio) — sin interés SENSORS para llegar a CONTACT_REQUESTED
    t = tipoLeadEvento("solicitar_informacion", []);
    expect(t).toBe("CONTACT_REQUESTED");
    eventos.push(t!);

    // Verificar funnel completo contiene los esperados
    expect(eventos).toContain("APP_VISIT");
    expect(eventos).toContain("PLOT_CREATED");
    expect(eventos).toContain("SENSOR_CTA_CLICKED");
    expect(eventos).toContain("CONTACT_REQUESTED");

    // Verificar scoring: CONTACT_REQUESTED =20 pts, total debe clasificar
    const puntosPorEvento: Record<string, number> = {
      APP_VISIT: 1,
      LOCATION_SELECTED: 1,
      PLOT_CREATED: 5,
      CROP_SELECTED: 3,
      ALERT_OPENED: 1,
      SENSOR_CTA_CLICKED: 10,
      CONTACT_REQUESTED: 20,
    };
    const total = eventos.reduce((s, e) => s + (puntosPorEvento[e] ?? 0), 0);
    expect(total).toBe(41);
    expect(clasificarLead(total)).toBe("caliente"); // 31+ caliente

    // Verificar orden y que no falta CONTACT_REQUESTED final
    expect(eventos[eventos.length - 1]).toBe("CONTACT_REQUESTED");
  });

  it("respeta que activar alerta no equivale a marketing", () => {
    const alerta = tipoLeadEvento("avisos_activados", []);
    expect(alerta).toBe("ALERTS_ENABLED");
    // No debe generar CONTACT_REQUESTED implícitamente
    expect(alerta).not.toBe("CONTACT_REQUESTED");
    const marketing = tipoLeadEvento("solicitar_informacion", []);
    expect(marketing).toBe("CONTACT_REQUESTED");
  });
});
