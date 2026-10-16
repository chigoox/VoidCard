// Counts quoted in marketing copy, derived from the code so they can't drift.
import { THEME_PRESETS } from "@/lib/themes/presets";
import { Section } from "@/lib/sections/types";

export const THEME_COUNT = THEME_PRESETS.length;
export const SECTION_TYPE_COUNT = Section.options.length;
