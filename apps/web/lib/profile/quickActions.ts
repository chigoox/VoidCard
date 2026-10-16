import type { Sections } from "@/lib/sections/types";
import type { QuickAction } from "@/components/profile/QuickActionBar";

/**
 * Picks the phone quick-action bar for a public profile: Book, Shop, Call and
 * Save contact, in that priority, from sections visible on phones. Returns no
 * actions when fewer than two apply (one action is already on the page).
 */
export function quickActionsFor(sections: Sections, opts: { handle: string; showSaveContact: boolean }): QuickAction[] {
  const onPhone = sections.filter((section) => section.visible !== false && !section.layout?.hideOnMobile);
  const actions: QuickAction[] = [];
  const booking = onPhone.find((section) => section.type === "booking");
  if (booking) actions.push({ kind: "book", label: "Book", sectionId: booking.id });
  const store = onPhone.find((section) => section.type === "store" && section.props.productIds.length > 0);
  if (store) actions.push({ kind: "shop", label: "Shop", sectionId: store.id });
  const phone = onPhone.find((section) => section.type === "phone");
  if (phone?.type === "phone") {
    const digits = phone.props.phone.replace(/[^+\d]/g, "");
    if (digits) actions.push({ kind: "call", label: "Call", href: `tel:${digits}` });
  }
  if (opts.showSaveContact) actions.push({ kind: "save", label: "Save", href: `/u/${opts.handle}/vcard.vcf` });
  return actions.length >= 2 ? actions.slice(0, 3) : [];
}
