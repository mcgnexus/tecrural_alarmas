const CACHE = "tecrural-campo-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("push", (event) => {
  let datos = { title: "TecRural", body: "Nueva alerta en tu parcela", url: "/alertas" };
  try {
    if (event.data) datos = { ...datos, ...event.data.json() };
  } catch {
    // payload no JSON: se mantiene el texto por defecto
  }
  event.waitUntil(
    self.registration.showNotification(datos.title, {
      body: datos.body,
      data: { url: datos.url },
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/alertas";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientes) => {
      const existente = clientes.find((c) => c.url.includes(url));
      if (existente) return existente.focus();
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Las respuestas de API nunca se cachean: meteorología, riesgo y avisos
  // deben ser siempre frescos. Sin respondWith, el navegador va a red.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return resp;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/")),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return resp;
        }),
    ),
  );
});