import { SITE_URL, SITE_NAME } from "./seo";

type JsonLd = Record<string, unknown>;

export function jsonLdScript(data: JsonLd | JsonLd[]) {
  return {
    __html: JSON.stringify(Array.isArray(data) ? data : data, null, 0),
  };
}

export function organization(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}#org`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.png`,
    sameAs: [
      "https://twitter.com/voidcard",
      "https://github.com/ed5enterprise",
    ],
  };
}

export function website(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}#site`,
    url: SITE_URL,
    name: SITE_NAME,
    publisher: { "@id": `${SITE_URL}#org` },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export type PersonInput = {
  username: string;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  worksFor?: string | null;
  links?: string[];
  verified?: boolean;
  modifiedAt?: string | null;
};

export function person(p: PersonInput): JsonLd {
  const url = `${SITE_URL}/u/${p.username}`;
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${url}#person`,
    name: p.name,
    alternateName: `@${p.username}`,
    url,
    ...(p.avatarUrl ? { image: p.avatarUrl } : {}),
    ...(p.bio ? { description: p.bio } : {}),
    ...(p.jobTitle ? { jobTitle: p.jobTitle } : {}),
    ...(p.worksFor
      ? { worksFor: { "@type": "Organization", name: p.worksFor } }
      : {}),
    ...(p.links && p.links.length ? { sameAs: p.links } : {}),
    ...(p.verified
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: "VoidCard Verified",
            value: p.username,
          },
        }
      : {}),
    ...(p.modifiedAt ? { dateModified: p.modifiedAt } : {}),
  };
}

export type ProductInput = {
  sku: string;
  name: string;
  description: string;
  image?: string;
  priceCents: number;
  currency: string;
  url: string;
  available?: boolean;
  ratingValue?: number;
  ratingCount?: number;
};

export function product(p: ProductInput): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    sku: p.sku,
    ...(p.image ? { image: p.image } : {}),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: p.url,
      priceCurrency: p.currency.toUpperCase(),
      price: (p.priceCents / 100).toFixed(2),
      availability: p.available === false
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
    ...(p.ratingValue && p.ratingCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.ratingValue,
            reviewCount: p.ratingCount,
          },
        }
      : {}),
  };
}

export function breadcrumbs(items: { name: string; url: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function faqPage(qa: { q: string; a: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
  };
}
