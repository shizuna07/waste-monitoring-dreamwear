"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const basePath =
      process.env.NEXT_PUBLIC_BASE_PATH ?? "";

    const workerUrl =
      `${basePath}/sw.js`;

    const scope =
      basePath
        ? `${basePath}/`
        : "/";

    async function register() {
      try {
        await navigator.serviceWorker.register(
          workerUrl,
          {
            scope,
          },
        );

        console.log(
          "PWA Waste Monitoring aktif",
        );
      } catch (error) {
        console.error(
          "Service Worker gagal:",
          error,
        );
      }
    }

    void register();
  }, []);

  return null;
}
