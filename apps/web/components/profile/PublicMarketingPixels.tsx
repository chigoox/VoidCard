"use client";

import { useEffect } from "react";
import type { ProfileIntegrations } from "@/lib/profile-integrations";

const CONSENT_STORAGE_KEY = "vc.consent.v1";
const CONSENT_EVENT = "vc:consent";

type ConsentChoice = { analytics?: boolean; marketing?: boolean };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: FacebookPixelQueue;
    _fbq?: Window["fbq"];
  }
}

type FacebookPixelQueue = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded: boolean;
  version: string;
};

export function PublicMarketingPixels({ googleAnalyticsId, facebookPixelId }: ProfileIntegrations) {
  useEffect(() => {
    function loadAllowedPixels() {
      const consent = readConsent();
      if (googleAnalyticsId && consent.analytics) loadGoogleAnalytics(googleAnalyticsId);
      if (facebookPixelId && consent.marketing) loadFacebookPixel(facebookPixelId);
    }

    loadAllowedPixels();
    window.addEventListener(CONSENT_EVENT, loadAllowedPixels);
    window.addEventListener("storage", loadAllowedPixels);
    return () => {
      window.removeEventListener(CONSENT_EVENT, loadAllowedPixels);
      window.removeEventListener("storage", loadAllowedPixels);
    };
  }, [facebookPixelId, googleAnalyticsId]);

  return null;
}

function readConsent(): ConsentChoice {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY) ?? "{}") as ConsentChoice;
  } catch {
    return {};
  }
}

function loadGoogleAnalytics(id: string) {
  if (document.querySelector(`script[data-vc-ga="${id}"]`)) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? function gtag(...args: unknown[]) { window.dataLayer?.push(args); };
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.dataset.vcGa = id;
  document.head.appendChild(script);
  window.gtag("js", new Date());
  window.gtag("config", id, { page_path: window.location.pathname, page_title: document.title });
}

function loadFacebookPixel(id: string) {
  if (!window.fbq) {
    const fbq = ((...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    }) as FacebookPixelQueue;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = "2.0";
    window.fbq = fbq;
    window._fbq = fbq;
  }

  if (!document.querySelector("script[data-vc-fb-pixel]")) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.dataset.vcFbPixel = "1";
    document.head.appendChild(script);
  }

  if (!document.documentElement.dataset[`vcFbPixel${id}`]) {
    document.documentElement.dataset[`vcFbPixel${id}`] = "1";
    window.fbq?.("init", id);
  }
  window.fbq?.("track", "PageView");
}
