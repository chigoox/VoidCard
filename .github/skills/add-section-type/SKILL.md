---
description: Add a new section type to the page builder (one of the 17 existing or a new one).
---

# Skill: Add a Section Type

## When to use
User asks to add or modify a builder section type (header, link, image, video, spotify, youtube, map, embed, form, gallery, markdown, divider, spacer, social, qr, tip, schedule).

## Steps
1. Open `apps/web/lib/sections/types.ts`. Add or update the `SectionType` discriminated union and zod schema.
2. Create `apps/web/components/sections/<Name>.tsx` — a server component that takes `props: SectionProps<'name'>` and renders the public-profile output.
3. Create `apps/web/components/sections/<Name>.editor.tsx` — a client component for the builder side panel.
4. Register both in `apps/web/lib/sections/registry.ts` map.
5. Add a Playwright spec at `apps/web/e2e/builder-<name>.spec.ts` covering: add section → fill props → publish → assert visible on `/u/<username>`.
6. Run `pnpm -C apps/web typecheck && pnpm -C apps/web e2e --grep <name>`.

## Constraints
- All section types are **free** (per plan §1). Do not add an entitlement check.
- A section must render in <50ms server-side or be deferred via `Suspense`.
- Image/video sections must respect `vcard_media` storage RLS.
