import { describe, expect, it } from "vitest";
import { markdownToHtml, socialHref } from "./rendering";

describe("section rendering helpers", () => {
  it("normalizes social handles without duplicating pasted URLs", () => {
    expect(socialHref("instagram", "@voidcard")).toBe("https://instagram.com/voidcard");
    expect(socialHref("github", " https://github.com/ed5enterprise ")).toBe("https://github.com/ed5enterprise");
  });

  it("renders common markdown while escaping raw html", () => {
    const html = markdownToHtml("## About\n**Bold** and *italic*\n- [Site](https://example.com)\n<script>alert(1)</script>");

    expect(html).toContain("<h3>About</h3>");
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Site</a>');
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });
});