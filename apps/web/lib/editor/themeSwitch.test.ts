import { describe, expect, it } from "vitest";
import { getThemePreset } from "@/lib/themes/presets";
import { isLightTheme, readThemeSwitch, suggestAltTheme, themeSwitchBootScript, writeThemeSwitch } from "./themeSwitch";

describe("theme switch", () => {
  it("suggests a partner with the opposite brightness", () => {
    const primary = getThemePreset("onyx-gold");
    expect(isLightTheme(primary)).toBe(false);
    expect(isLightTheme(getThemePreset(suggestAltTheme("onyx-gold")))).toBe(true);
  });

  it("round-trips through customCss and keeps other CSS", () => {
    const css = writeThemeSwitch({ enabled: true, altThemeId: "paper-white", defaultMode: "system" }, ".a{b:c}", "onyx-gold");
    expect(readThemeSwitch(css, "onyx-gold")).toEqual({
      settings: { enabled: true, altThemeId: "paper-white", defaultMode: "system" },
      rest: ".a{b:c}",
    });
  });

  it("rejects unknown theme ids", () => {
    const { settings } = readThemeSwitch('/* vc:theme-switch {"enabled":true,"altThemeId":"*/<script>"} */', "onyx-gold");
    expect(settings.altThemeId).toBe(suggestAltTheme("onyx-gold"));
  });

  it("escapes the handle inside the boot script", () => {
    const script = themeSwitchBootScript("</script><x>", { enabled: true, altThemeId: "paper-white", defaultMode: "owner" }, true);
    expect(script).not.toContain("</script>");
  });
});
