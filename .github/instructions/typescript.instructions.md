---
applyTo: "apps/web/**/*.{ts,tsx}"
---

# TypeScript / Next.js Conventions

- TypeScript strict. No `any` without a `// eslint-disable-next-line` and a TODO.
- Server Components by default. `"use client"` only for interactivity, browser APIs, or stateful components.
- Server-only modules (`lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/stripe.ts`) must never be imported from client components. Add `import "server-only";` at the top.
- Client-only modules add `import "client-only";`.
- Use `next/font/google` for Fraunces + Inter; never link a CSS file from Google Fonts.
- `next/image` for all bitmap images; `next/link` for internal nav.
- Route handlers: `export async function GET/POST(req: Request)`. Validate body with `zod`. Return `NextResponse.json` with explicit status codes.
- Server actions: top of file `"use server";`. First line of every action: `const user = await requireUser();` then `const ent = entitlementsFor(user.plan, user.bonuses);`.
- File names: `kebab-case` for routes, `PascalCase` for components.
- Co-locate `Component.tsx` + `Component.test.tsx` (Vitest) when adding unit tests.
