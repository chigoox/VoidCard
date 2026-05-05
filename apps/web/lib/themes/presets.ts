// 12 first-party theme presets shipped with all plans (Free included).
// Each preset is a JSON-serializable object stored in vcard_profile_ext.theme.

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  // CSS custom properties applied to the public profile root.
  vars: Record<string, string>;
  // Optional preview swatch colors used by the editor picker.
  preview: { bg: string; fg: string; accent: string };
};

export const THEME_PRESETS: readonly ThemePreset[] = [
  {
    id: "onyx-gold",
    name: "Onyx Gold",
    description: "House signature. Black onyx with gold-grad accents.",
    vars: {
      "--vc-bg": "#0a0a0a",
      "--vc-bg-2": "#141414",
      "--vc-fg": "#f7f3ea",
      "--vc-fg-mute": "#a8a39a",
      "--vc-accent": "#d4af37",
      "--vc-accent-2": "#f0d97e",
      "--vc-radius": "14px",
    },
    preview: { bg: "#0a0a0a", fg: "#f7f3ea", accent: "#d4af37" },
  },
  {
    id: "ivory-noir",
    name: "Ivory Noir",
    description: "Inverted: ivory paper with deep ink.",
    vars: {
      "--vc-bg": "#f7f3ea",
      "--vc-bg-2": "#ffffff",
      "--vc-fg": "#0a0a0a",
      "--vc-fg-mute": "#525252",
      "--vc-accent": "#0a0a0a",
      "--vc-accent-2": "#262626",
      "--vc-radius": "14px",
    },
    preview: { bg: "#f7f3ea", fg: "#0a0a0a", accent: "#0a0a0a" },
  },
  {
    id: "midnight-cyan",
    name: "Midnight Cyan",
    description: "Cyber-noir with cyan accent.",
    vars: {
      "--vc-bg": "#050a14",
      "--vc-bg-2": "#0c1424",
      "--vc-fg": "#e6f7ff",
      "--vc-fg-mute": "#7daab8",
      "--vc-accent": "#22d3ee",
      "--vc-accent-2": "#67e8f9",
      "--vc-radius": "8px",
    },
    preview: { bg: "#050a14", fg: "#e6f7ff", accent: "#22d3ee" },
  },
  {
    id: "void-luxury",
    name: "Void Luxury",
    description: "Pure black with platinum accents.",
    vars: {
      "--vc-bg": "#000000",
      "--vc-bg-2": "#0a0a0a",
      "--vc-fg": "#fafafa",
      "--vc-fg-mute": "#9ca3af",
      "--vc-accent": "#e5e4e2",
      "--vc-accent-2": "#ffffff",
      "--vc-radius": "2px",
    },
    preview: { bg: "#000000", fg: "#fafafa", accent: "#e5e4e2" },
  },
  {
    id: "rose-dusk",
    name: "Rose Dusk",
    description: "Soft rose gradient with cream type.",
    vars: {
      "--vc-bg": "#1a0d12",
      "--vc-bg-2": "#2b1721",
      "--vc-fg": "#fff1ec",
      "--vc-fg-mute": "#c8a39a",
      "--vc-accent": "#f5a3b3",
      "--vc-accent-2": "#ffd1dc",
      "--vc-radius": "20px",
    },
    preview: { bg: "#1a0d12", fg: "#fff1ec", accent: "#f5a3b3" },
  },
  {
    id: "emerald-vault",
    name: "Emerald Vault",
    description: "Deep forest green with brass.",
    vars: {
      "--vc-bg": "#04140d",
      "--vc-bg-2": "#0a2418",
      "--vc-fg": "#e8f5ee",
      "--vc-fg-mute": "#86a995",
      "--vc-accent": "#b08d57",
      "--vc-accent-2": "#d4af37",
      "--vc-radius": "12px",
    },
    preview: { bg: "#04140d", fg: "#e8f5ee", accent: "#b08d57" },
  },
  {
    id: "sunset-tape",
    name: "Sunset Tape",
    description: "Magnetic-tape gradient: amber → magenta.",
    vars: {
      "--vc-bg": "#1a0e0a",
      "--vc-bg-2": "#2a1209",
      "--vc-fg": "#fff5ec",
      "--vc-fg-mute": "#c4a18b",
      "--vc-accent": "#ff7849",
      "--vc-accent-2": "#ff3da8",
      "--vc-radius": "16px",
    },
    preview: { bg: "#1a0e0a", fg: "#fff5ec", accent: "#ff7849" },
  },
  {
    id: "paper-white",
    name: "Paper White",
    description: "Editorial: high-key cream with charcoal serif feel.",
    vars: {
      "--vc-bg": "#fafaf7",
      "--vc-bg-2": "#ffffff",
      "--vc-fg": "#1a1a1a",
      "--vc-fg-mute": "#6b6b6b",
      "--vc-accent": "#9c1f1f",
      "--vc-accent-2": "#c63131",
      "--vc-radius": "4px",
    },
    preview: { bg: "#fafaf7", fg: "#1a1a1a", accent: "#9c1f1f" },
  },
  {
    id: "neon-grid",
    name: "Neon Grid",
    description: "Synthwave grid with magenta+cyan glow.",
    vars: {
      "--vc-bg": "#0a0518",
      "--vc-bg-2": "#1a0a30",
      "--vc-fg": "#f5f0ff",
      "--vc-fg-mute": "#9d8dc7",
      "--vc-accent": "#ff00aa",
      "--vc-accent-2": "#00e5ff",
      "--vc-radius": "6px",
    },
    preview: { bg: "#0a0518", fg: "#f5f0ff", accent: "#ff00aa" },
  },
  {
    id: "concrete",
    name: "Concrete",
    description: "Brutalist mid-grey with stark white.",
    vars: {
      "--vc-bg": "#3d3d3d",
      "--vc-bg-2": "#4a4a4a",
      "--vc-fg": "#ffffff",
      "--vc-fg-mute": "#bdbdbd",
      "--vc-accent": "#ffd400",
      "--vc-accent-2": "#fff200",
      "--vc-radius": "0px",
    },
    preview: { bg: "#3d3d3d", fg: "#ffffff", accent: "#ffd400" },
  },
  {
    id: "sapphire-cardinal",
    name: "Sapphire Cardinal",
    description: "Royal blue with cardinal red.",
    vars: {
      "--vc-bg": "#0a0f24",
      "--vc-bg-2": "#10173a",
      "--vc-fg": "#eaf0ff",
      "--vc-fg-mute": "#8e9bc4",
      "--vc-accent": "#c8102e",
      "--vc-accent-2": "#ff3b3b",
      "--vc-radius": "10px",
    },
    preview: { bg: "#0a0f24", fg: "#eaf0ff", accent: "#c8102e" },
  },
  {
    id: "matcha",
    name: "Matcha",
    description: "Powder green with bamboo neutrals.",
    vars: {
      "--vc-bg": "#f3f7ec",
      "--vc-bg-2": "#ffffff",
      "--vc-fg": "#1f2918",
      "--vc-fg-mute": "#6b7d59",
      "--vc-accent": "#7ba05b",
      "--vc-accent-2": "#a3c082",
      "--vc-radius": "18px",
    },
    preview: { bg: "#f3f7ec", fg: "#1f2918", accent: "#7ba05b" },
  },
] as const;

export function getThemePreset(id: string | null | undefined): ThemePreset {
  if (!id) return THEME_PRESETS[0];
  return THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];
}

/** Render the theme variables as a CSS rule scoped to a selector. */
export function themeToCss(theme: ThemePreset, selector = ":root"): string {
  const body = Object.entries(theme.vars)
    .map(([k, v]) => `${k}: ${v};`)
    .join(" ");
  return `${selector} { ${body} }`;
}
