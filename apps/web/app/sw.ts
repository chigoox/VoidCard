import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  NetworkFirst,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & typeof globalThis & {
  registration: { scope: string };
  skipWaiting(): void;
};

const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url }) => url.pathname.startsWith("/u/"),
    handler: new StaleWhileRevalidate({ cacheName: "voidcard-profiles" }),
  },
  {
    matcher: ({ request }) =>
      ["image", "font", "style"].includes(request.destination),
    handler: new CacheFirst({ cacheName: "voidcard-static" }),
  },
  {
    matcher: ({ url }) =>
      url.pathname.startsWith("/api/") &&
      !["/api/auth", "/api/stripe", "/api/admin", "/api/security"].some((p) =>
        url.pathname.startsWith(p),
      ),
    handler: new NetworkFirst({
      cacheName: "voidcard-api",
      networkTimeoutSeconds: 5,
    }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }: { request: Request }) =>
          request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
