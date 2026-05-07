"use client";

import { useState } from "react";

type Props = {
  url: string;
  title?: string;
};

const ICON_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  "aria-hidden": true as const,
};

const Icons = {
  x: (
    <svg {...ICON_PROPS}>
      <path d="M18.244 2H21l-6.55 7.49L22 22h-6.832l-4.96-6.493L4.5 22H1.74l7.014-8.02L1.5 2h6.97l4.49 5.93L18.244 2Zm-1.196 18h1.674L7.04 4H5.27l11.778 16Z" />
    </svg>
  ),
  linkedin: (
    <svg {...ICON_PROPS}>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.3-.03-2.97-1.81-2.97-1.82 0-2.1 1.42-2.1 2.88V21h-4V9Z" />
    </svg>
  ),
  facebook: (
    <svg {...ICON_PROPS}>
      <path d="M13.5 9H16V6h-2.5C11 6 9.5 7.5 9.5 10v2H7v3h2.5v7H13v-7h2.5l.5-3H13v-1.5c0-.83.67-1.5 1.5-1.5Z" />
    </svg>
  ),
  whatsapp: (
    <svg {...ICON_PROPS}>
      <path d="M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.5 0 .18 5.32.18 11.88c0 2.09.55 4.13 1.6 5.93L0 24l6.34-1.66a11.86 11.86 0 0 0 5.72 1.46h.01c6.56 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.16-3.43-8.44ZM12.07 21.7h-.01a9.86 9.86 0 0 1-5.02-1.37l-.36-.21-3.76.99 1-3.66-.23-.38a9.85 9.85 0 0 1-1.51-5.21c0-5.45 4.43-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.9 6.98c0 5.45-4.44 9.84-9.89 9.84Zm5.43-7.39c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.34.22-.64.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.79-1.67-2.09-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  ),
  telegram: (
    <svg {...ICON_PROPS}>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.24 3.64 11.95c-.88-.25-.89-.86.2-1.3L19.83 4.6c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.14-3.05-1.99 1.93c-.23.23-.42.42-.85.42z" />
    </svg>
  ),
  reddit: (
    <svg {...ICON_PROPS}>
      <path d="M22 12.14a2.13 2.13 0 0 0-3.61-1.53 10.43 10.43 0 0 0-5.7-1.81l.97-4.55 3.16.67a1.52 1.52 0 1 0 .15-.85l-3.53-.75a.43.43 0 0 0-.51.33l-1.08 5.13a10.43 10.43 0 0 0-5.78 1.83A2.13 2.13 0 1 0 4 13.83a4.2 4.2 0 0 0-.05.59c0 3.02 3.55 5.47 7.93 5.47s7.93-2.45 7.93-5.47a4.2 4.2 0 0 0-.05-.59A2.13 2.13 0 0 0 22 12.14ZM7 13.5A1.5 1.5 0 1 1 8.5 15 1.5 1.5 0 0 1 7 13.5Zm8.71 4.04a5.45 5.45 0 0 1-3.83 1.16 5.45 5.45 0 0 1-3.83-1.16.4.4 0 0 1 .57-.57 4.7 4.7 0 0 0 3.26.94 4.7 4.7 0 0 0 3.26-.94.4.4 0 1 1 .57.57Zm-.21-2.54a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5Z" />
    </svg>
  ),
  email: (
    <svg {...ICON_PROPS}>
      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4.24-8 4.95-8-4.95V6l8 4.95L20 6v2.24Z" />
    </svg>
  ),
  sms: (
    <svg {...ICON_PROPS}>
      <path d="M21 6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2v3l4-3h8a2 2 0 0 0 2-2V6Zm-13 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
    </svg>
  ),
  link: (
    <svg {...ICON_PROPS}>
      <path d="M10.6 13.4a4 4 0 0 1 0-5.66l3.54-3.54a4 4 0 0 1 5.66 5.66l-1.42 1.41-1.41-1.41 1.41-1.42a2 2 0 0 0-2.83-2.83l-3.54 3.54a2 2 0 0 0 0 2.83l-1.42 1.42Zm2.83-2.83a4 4 0 0 1 0 5.66l-3.54 3.54a4 4 0 0 1-5.66-5.66l1.42-1.41 1.41 1.41-1.41 1.42a2 2 0 0 0 2.83 2.83l3.54-3.54a2 2 0 0 0 0-2.83l1.42-1.42Z" />
    </svg>
  ),
  share: (
    <svg {...ICON_PROPS}>
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7a3.27 3.27 0 0 0 0-1.4l7.05-4.11A3 3 0 1 0 15 5.08c0 .24.04.47.09.7L8.04 9.89a3 3 0 1 0 0 4.22l7.13 4.16a2.83 2.83 0 0 0-.08.66 3 3 0 1 0 3-2.85Z" />
    </svg>
  ),
};

type Channel = {
  key: string;
  label: string;
  icon: React.ReactNode;
  href: (url: string, title: string) => string;
  testid: string;
  newTab?: boolean;
};

const CHANNELS: Channel[] = [
  {
    key: "x",
    label: "X (Twitter)",
    icon: Icons.x,
    href: (u, t) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`,
    testid: "share-x",
    newTab: true,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: Icons.linkedin,
    href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
    testid: "share-linkedin",
    newTab: true,
  },
  {
    key: "facebook",
    label: "Facebook",
    icon: Icons.facebook,
    href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
    testid: "share-facebook",
    newTab: true,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: Icons.whatsapp,
    href: (u, t) => `https://api.whatsapp.com/send?text=${encodeURIComponent(`${t} ${u}`)}`,
    testid: "share-whatsapp",
    newTab: true,
  },
  {
    key: "telegram",
    label: "Telegram",
    icon: Icons.telegram,
    href: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
    testid: "share-telegram",
    newTab: true,
  },
  {
    key: "reddit",
    label: "Reddit",
    icon: Icons.reddit,
    href: (u, t) => `https://www.reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`,
    testid: "share-reddit",
    newTab: true,
  },
  {
    key: "email",
    label: "Email",
    icon: Icons.email,
    href: (u, t) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(u)}`,
    testid: "share-email",
  },
  {
    key: "sms",
    label: "SMS",
    icon: Icons.sms,
    href: (u, t) => `sms:?&body=${encodeURIComponent(`${t} ${u}`)}`,
    testid: "share-sms",
  },
];

export function ShareChannels({ url, title = "My VoidCard" }: Props) {
  const [copied, setCopied] = useState(false);
  const canNativeShare =
    typeof navigator !== "undefined" && typeof (navigator as Navigator & { share?: unknown }).share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  async function nativeShare() {
    try {
      await (navigator as Navigator & { share: (data: { title?: string; url?: string; text?: string }) => Promise<void> }).share({
        title,
        url,
        text: title,
      });
    } catch {
      // user cancelled or unsupported
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {canNativeShare ? (
          <button
            type="button"
            onClick={nativeShare}
            data-testid="share-native"
            className="btn-ghost flex items-center justify-center gap-2 px-3 py-3 text-sm"
          >
            <span className="text-gold">{Icons.share}</span>
            <span>Share…</span>
          </button>
        ) : null}
        {CHANNELS.map((c) => (
          <a
            key={c.key}
            href={c.href(url, title)}
            target={c.newTab ? "_blank" : undefined}
            rel={c.newTab ? "noopener noreferrer" : undefined}
            data-testid={c.testid}
            className="btn-ghost flex items-center justify-center gap-2 px-3 py-3 text-sm"
          >
            <span className="text-gold">{c.icon}</span>
            <span className="truncate">{c.label}</span>
          </a>
        ))}
        <button
          type="button"
          onClick={copy}
          data-testid="share-copy"
          className="btn-ghost flex items-center justify-center gap-2 px-3 py-3 text-sm"
        >
          <span className="text-gold">{Icons.link}</span>
          <span>{copied ? "Copied!" : "Copy link"}</span>
        </button>
      </div>
    </div>
  );
}
