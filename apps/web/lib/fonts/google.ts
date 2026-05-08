export const GOOGLE_FONT_FAMILIES = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Nunito",
  "DM Sans",
  "Space Grotesk",
  "Outfit",
  "Manrope",
  "Work Sans",
  "Rubik",
  "Quicksand",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "Source Serif 4",
  "Cormorant Garamond",
  "Fraunces",
  "Oswald",
  "Bebas Neue",
  "Abril Fatface",
] as const;

export type GoogleFontFamily = (typeof GOOGLE_FONT_FAMILIES)[number];

export function googleFontUrl(family: GoogleFontFamily) {
  const encoded = family.trim().replace(/\s+/g, "+");
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@300;400;500;600;700&display=swap`;
}
