"use client";

import "client-only";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Section } from "@/lib/sections/types";

type FormSection = Extract<Section, { type: "form" }>;

const BORDER = "color-mix(in srgb, var(--vc-accent, #d4af37) 24%, transparent)";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

function initialValues(section: FormSection) {
  return Object.fromEntries(section.props.fields.map((field) => [field.name, ""])) as Record<string, string>;
}

function fieldInputType(type: FormSection["props"]["fields"][number]["type"]) {
  if (type === "phone") return "tel";
  return type;
}

function firstValueForType(
  section: FormSection,
  values: Record<string, string>,
  type: FormSection["props"]["fields"][number]["type"],
) {
  const field = section.props.fields.find((entry) => entry.type === type);
  if (!field) return undefined;
  const value = values[field.name]?.trim();
  return value || undefined;
}

function submissionError(code: unknown) {
  switch (code) {
    case "rate_limited":
      return "Too many submissions right now. Try again in a moment.";
    case "form_not_found":
      return "This form is not published yet.";
    case "captcha_failed":
      return "Lead capture is temporarily unavailable.";
    default:
      return "Could not send your message. Try again.";
  }
}

export function LeadFormSectionClient({ section }: { section: FormSection }) {
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(section));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const [pending, start] = useTransition();

  const requireConsent = section.props.requireConsent ?? false;
  const requireCaptcha = section.props.requireCaptcha ?? false;
  const consentText = section.props.consentText?.trim() || "I agree to be contacted about my inquiry.";
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

  useEffect(() => {
    if (!requireCaptcha || !turnstileSiteKey || !turnstileRef.current) return;

    let cancelled = false;
    const renderWidget = () => {
      if (cancelled || !turnstileRef.current || !window.turnstile || turnstileWidgetId.current) return;
      turnstileWidgetId.current = window.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(null),
        "error-callback": () => setTurnstileToken(null),
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile-script]");
      if (existing) {
        existing.addEventListener("load", renderWidget, { once: true });
      } else {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.turnstileScript = "true";
        script.addEventListener("load", renderWidget, { once: true });
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (turnstileWidgetId.current && window.turnstile) {
        window.turnstile.remove(turnstileWidgetId.current);
        turnstileWidgetId.current = null;
      }
    };
  }, [requireCaptcha, turnstileSiteKey]);

  function updateValue(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (requireConsent && !consent) {
      setErrorMessage("Please agree to the consent statement to continue.");
      return;
    }
    if (requireCaptcha && !turnstileSiteKey) {
      setErrorMessage("This form's CAPTCHA is not configured yet.");
      return;
    }
    if (requireCaptcha && !turnstileToken) {
      setErrorMessage("Please complete the CAPTCHA to continue.");
      return;
    }

    const payload = Object.fromEntries(
      section.props.fields.map((field) => [field.name, values[field.name]?.trim() ?? ""]),
    );

    start(async () => {
      const response = await fetch("/api/lead-forms/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          formId: section.id,
          payload,
          email: firstValueForType(section, values, "email"),
          phone: firstValueForType(section, values, "phone"),
          source: "profile",
          turnstileToken: turnstileToken ?? undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok || !body.ok) {
        setErrorMessage(submissionError(body.error));
        return;
      }

      setValues(initialValues(section));
      setTurnstileToken(null);
      if (turnstileWidgetId.current) window.turnstile?.reset(turnstileWidgetId.current);
      setSuccessMessage(section.props.successMessage);
    });
  }

  return (
    <form
      className="space-y-3 rounded-card p-4"
      onSubmit={onSubmit}
      style={{
        background: "var(--vc-bg-2, #141414)",
        border: `1px solid ${BORDER}`,
        borderRadius: "var(--vc-radius, 14px)",
        color: "var(--vc-fg, #f7f3ea)",
      }}
    >
      <p className="font-display text-lg" style={{ color: "var(--vc-fg, #f7f3ea)" }}>{section.props.title}</p>
      {section.props.fields.map((field) => (
        <label key={field.name} className="block">
          <span className="text-xs uppercase tracking-widest" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>
            {field.label}
          </span>
          {field.type === "textarea" ? (
            <textarea
              name={field.name}
              required={field.required}
              value={values[field.name] ?? ""}
              onChange={(event) => updateValue(field.name, event.target.value)}
              className="mt-1 w-full px-4 py-3 outline-none"
              style={{
                border: `1px solid ${BORDER}`,
                background: "var(--vc-bg, #0a0a0a)",
                borderRadius: "var(--vc-radius, 14px)",
                color: "var(--vc-fg, #f7f3ea)",
              }}
            />
          ) : (
            <input
              type={fieldInputType(field.type)}
              name={field.name}
              required={field.required}
              value={values[field.name] ?? ""}
              onChange={(event) => updateValue(field.name, event.target.value)}
              className="mt-1 w-full px-4 py-3 outline-none"
              style={{
                border: `1px solid ${BORDER}`,
                background: "var(--vc-bg, #0a0a0a)",
                borderRadius: "999px",
                color: "var(--vc-fg, #f7f3ea)",
              }}
            />
          )}
        </label>
      ))}
      <button
        className="w-full rounded-pill px-4 py-3 text-sm font-medium"
        type="submit"
        disabled={pending}
        style={{
          background: "var(--vc-accent, #d4af37)",
          color: "var(--vc-bg, #0a0a0a)",
        }}
      >
        {pending ? "Sending…" : "Send"}
      </button>
      {requireConsent ? (
        <label className="flex items-start gap-2 text-xs" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-1"
          />
          <span>{consentText}</span>
        </label>
      ) : null}
      {requireCaptcha ? <div ref={turnstileRef} className="min-h-[65px]" /> : null}
      {successMessage ? (
        <p
          className="rounded-card px-3 py-2 text-sm"
          style={{
            border: `1px solid ${BORDER}`,
            background: "color-mix(in srgb, var(--vc-accent, #d4af37) 10%, transparent)",
            color: "var(--vc-fg, #f7f3ea)",
          }}
        >
          {successMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p
          className="rounded-card px-3 py-2 text-sm"
          style={{
            border: "1px solid rgba(248, 113, 113, 0.35)",
            background: "rgba(127, 29, 29, 0.22)",
            color: "#fecaca",
          }}
        >
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}