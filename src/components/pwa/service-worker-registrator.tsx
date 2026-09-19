"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrator() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registro) => registro.update())
      .catch(() => {
        /* el registro es un refuerzo, no bloquea la app */
      });
  }, []);

  return null;
}