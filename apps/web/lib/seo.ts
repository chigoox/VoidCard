import "server-only";
import type { Metadata } from "next";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://vcard.ed5enterprise.com";
export const SITE_NAME = "VoidCard";

export type SeoInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  type?: "website" | "article" | "profile";
  keywords?: string[];
  publishedAt?: string;
  modifiedAt?: string;
};

function absolute(url: string) {
  if (!url) return `${SITE_URL}/og-default.svg`;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return new URL(url, SITE_URL).toString();
}

export function buildMetadata(i: SeoInput): Metadata {
  const url = new URL(i.path || "/", SITE_URL).toString();
  const image = absolute(i.image ?? "/og-default.svg");
  return {
    title: i.title,
    description: i.description,
    keywords: i.keywords,
    alternates: { canonical: url },
    robots: i.noindex
      ? {
          index: false,
          follow: false,
          googleBot: { index: false, follow: false },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    openGraph: {
      type: i.type ?? "website",
      url,
      title: i.title,
      description: i.description,
      siteName: SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: i.title }],
      ...(i.publishedAt ? { publishedTime: i.publishedAt } : {}),
      ...(i.modifiedAt ? { modifiedTime: i.modifiedAt } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: i.title,
      description: i.description,
      images: [image],
    },
  };
}

export const NOINDEX_METADATA: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};
