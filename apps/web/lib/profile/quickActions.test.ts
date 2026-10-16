import { describe, expect, it } from "vitest";
import { Sections } from "@/lib/sections/types";
import { quickActionsFor } from "./quickActions";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const parse = (raw: unknown[]) => Sections.parse(raw);
const booking = { id: id(1), type: "booking", props: { ownerSlug: "studio" } };
const store = { id: id(2), type: "store", props: { productIds: [id(9)] } };
const phone = { id: id(3), type: "phone", props: { phone: "+1 (555) 010-2030" } };

describe("quickActionsFor", () => {
  it("orders book, shop, call and caps at three", () => {
    const actions = quickActionsFor(parse([phone, store, booking]), { handle: "gloss", showSaveContact: true });
    expect(actions.map((a) => a.kind)).toEqual(["book", "shop", "call"]);
    expect(actions[2]).toMatchObject({ href: "tel:+15550102030" });
  });

  it("adds save contact and needs at least two actions", () => {
    expect(quickActionsFor(parse([booking]), { handle: "gloss", showSaveContact: true }).map((a) => a.kind)).toEqual(["book", "save"]);
    expect(quickActionsFor(parse([booking]), { handle: "gloss", showSaveContact: false })).toEqual([]);
  });

  it("skips hidden, phone-hidden and empty sections", () => {
    const sections = parse([
      { ...booking, visible: false },
      { ...store, props: { productIds: [] } },
      { ...phone, layout: { hideOnMobile: true } },
    ]);
    expect(quickActionsFor(sections, { handle: "gloss", showSaveContact: true })).toEqual([]);
  });
});
