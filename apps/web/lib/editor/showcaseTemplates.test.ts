import { describe, expect, it } from "vitest";
import { SHOWCASE_TEMPLATES } from "./showcaseTemplates";
import { Sections } from "@/lib/sections/types";
import { getThemePreset } from "@/lib/themes/presets";

describe("showcase templates", () => {
  it("have unique, url-safe ids", () => {
    const ids = SHOWCASE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it.each(SHOWCASE_TEMPLATES.map((t) => [t.id, t] as const))("%s builds valid sections with a real theme", (_id, template) => {
    const result = Sections.safeParse(template.build("example"));
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues[0])).toBe(true);
    expect(getThemePreset(template.themeId).id).toBe(template.themeId);
  });
});
