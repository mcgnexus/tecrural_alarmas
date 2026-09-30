import type { Severidad, TipoAlerta } from "@/lib/dominio/tipos";

export const EMOJI_TIPO: Record<TipoAlerta, string> = {
  helada: "❄️",
  "golpe-de-calor": "🥵",
  viento: "💨",
  lluvia: "🌧️",
  "demanda-hidrica": "💧",
};

export const EMOJI_SEVERIDAD: Record<Severidad, string> = {
  info: "🟢",
  aviso: "🟡",
  alerta: "🟠",
  critica: "🔴",
};

export const ETIQUETA_SEVERIDAD: Record<Severidad, string> = {
  info: "Información",
  aviso: "Aviso",
  alerta: "Alerta",
  critica: "Crítico",
};

export const ETIQUETA_TIPO: Record<TipoAlerta, string> = {
  helada: "Helada",
  "golpe-de-calor": "Golpe de calor",
  viento: "Viento",
  lluvia: "Lluvia",
  "demanda-hidrica": "Demanda de agua",
};

export function emojiTipo(tipo: TipoAlerta | string): string {
  return EMOJI_TIPO[tipo as TipoAlerta] ?? "⚠️";
}

export function emojiSeveridad(severidad: Severidad | string): string {
  return EMOJI_SEVERIDAD[severidad as Severidad] ?? "🟠";
}

export function etiquetaSeveridad(severidad: Severidad | string): string {
  return ETIQUETA_SEVERIDAD[severidad as Severidad] ?? String(severidad);
}

export function etiquetaTipo(tipo: TipoAlerta | string): string {
  return ETIQUETA_TIPO[tipo as TipoAlerta] ?? String(tipo).replace(/-/g, " ");
}

export interface ExplicacionAlerta {
  enUnaFrase: string;
  queEs: string;
  porQue: string;
  cuando: string;
  queHacer: string[];
  proteger: string;
}

const EXPLICACIONES: Record<TipoAlerta, ExplicacionAlerta> = {
  helada: {
    enUnaFrase: "Va a hacer el frío suficiente como para dañar el cultivo.",
    queEs:
      "Una helada es una bajada de temperatura hasta 0 °C o menos a ras de suelo. Cuando el cultivo está despierto (floración, cuajado o fruto joven), el agua de sus tejidos se hiela y puede romper flores, brotes y frutos.",
    porQue:
      "Aparece sobre todo de madrugada. En noches despejadas y con poco viento, el suelo pierde calor rápidamente (enfriamiento radiativo) y el aire más frío se acumula cerca del suelo.",
    cuando: "De madrugada, normalmente entre las 2 y las 7 de la mañana.",
    queHacer: [
      "Riega un poco antes de la noche: el suelo húmedo retiene más calor.",
      "Cubre plantas jóvenes o en floración con mantas térmicas o mallas.",
      "En parcelas pequeñas, el riego por aspersión durante la madrugada ayuda si dispones de agua.",
      "Evita podar o hacer labores que dejen heridas estos días.",
      "Al día siguiente, revisa flores y brotes y anota los daños que veas.",
    ],
    proteger: "Flores, brotes tiernos y frutos recién cuajados.",
  },
  "golpe-de-calor": {
    enUnaFrase: "El calor del mediodía puede estresar o quemar el cultivo.",
    queEs:
      "Es un exceso de temperatura en las horas centrales del día. Puede provocar estrés térmico, caída de flor, quemaduras en frutos expuestos y parada del crecimiento.",
    porQue:
      "Se alcanza en días despejados, con mucha radiación solar, poco viento y suelo seco, que calienta el aire y la planta.",
    cuando: "Horas centrales del día, aproximadamente de 12 a 18 h.",
    queHacer: [
      "Riega al amanecer o al atardecer, nunca en pleno mediodía.",
      "Aumenta la frecuencia de riego si el cultivo está en fase sensible.",
      "Protege del sol los frutos más expuestos (mallas de sombreo).",
      "No apliques tratamientos fitosanitarios con tanto calor.",
    ],
    proteger: "Flores, frutos expuestos al sol y hojas jóvenes.",
  },
  viento: {
    enUnaFrase: "Habrá rachas fuertes que pueden dañar el cultivo o impedir labores.",
    queEs:
      "El viento fuerte puede romper ramas, tirar frutos, volcar tutores y dañar cubiertas o estructuras. También arrastra las pulverizaciones y las hace perder eficacia.",
    porQue:
      "Entra una masa de aire con rachas por encima del umbral de tu cultivo. El viento daña más cuando la planta tiene fruto cargado o está en crecimiento activo.",
    cuando: "Rachas previstas en las próximas horas y días.",
    queHacer: [
      "Revisa tutores, espalderas y cubiertas antes de que llegue.",
      "Recoge mallas, plásticos y herramientas sueltas.",
      "Evita tratamientos por pulverización: el viento provoca deriva.",
      "No es buen día para poda ni para labores que dejen heridas.",
    ],
    proteger: "Ramas cargadas, estructuras, tutores y cubiertas.",
  },
  lluvia: {
    enUnaFrase: "Se espera una lluvia intensa que puede encharcar la parcela.",
    queEs:
      "Una lluvia intensa es una precipitación abundante en poco tiempo. Cuando el agua no se infiltra porque el suelo ya está saturado, se producen charcos, encharcamiento y erosión. También aumenta el riesgo de enfermedades fúngicas y de que se desprendan frutos y hojas.",
    porQue:
      "Se compara la lluvia acumulada prevista para el día con el umbral de tu cultivo. Si además la probabilidad de lluvia es alta, es más probable que el agua llegue y se acumule en la parcela.",
    cuando: "Durante el episodio de lluvia, normalmente en pocas horas.",
    queHacer: [
      "Revisa y despeja los desagües, caños y zanjas para que el agua no se quede estancada.",
      "En pendiente, coloca barreras o albarradas para que no se arrastre la tierra.",
      "Aplaza las labores: no trabajes el suelo mojado, se compacta y se estructura mal.",
      "Retira o asegura mule, plástico y herramientas que el agua pueda arrastrar.",
      "Tras la lluvia, revisa si hay frutos, ramas o estructuras dañados.",
    ],
    proteger: "El sistema radicular, los frutos y el suelo para que no se erosione.",
  },
  "demanda-hidrica": {
    enUnaFrase: "El cultivo pide más agua de la que ha recibido estos días.",
    queEs:
      "La demanda hídrica es el agua que el cultivo necesita (por calor, sol y viento) menos la lluvia útil de los últimos días. Si el déficit crece, puede faltar agua justo cuando más la necesita.",
    porQue:
      "Se calcula con la evapotranspiración (ETo), la lluvia de los últimos 7 días y tu fase de cultivo. Un modificador sube el nivel si se espera calor fuerte.",
    cuando: "Estimación de los últimos 7 días, con la previsión de calor cercana.",
    queHacer: [
      "Comprueba la humedad del suelo antes de decidir.",
      "Riega con más frecuencia si el cultivo está en floración o engorde.",
      "Aprovecha las horas frescas para regar y reducir pérdidas.",
      "Ajústalo a tu parcela: no es una recomendación de riego automática.",
    ],
    proteger: "Cultivo en floración, cuajado o engorde de fruto.",
  },
};

export function explicacionDeAlerta(tipo: TipoAlerta | string): ExplicacionAlerta {
  return EXPLICACIONES[tipo as TipoAlerta] ?? {
    enUnaFrase: "Revisa esta alerta con atención.",
    queEs: "Esta alerta señala una condición que puede afectar a tu cultivo.",
    porQue: "Se ha detectado a partir de los datos meteorológicos y tu cultivo.",
    cuando: "Según la previsión consultada.",
    queHacer: ["Revisa tu parcela y toma medidas según tu criterio técnico."],
    proteger: "El cultivo y su estado actual.",
  };
}
