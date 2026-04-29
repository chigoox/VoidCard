# VoidCard Gap Closure Plan

## Goal
Ship a production-ready digital business card platform that supports secure card linking, customizable public profiles, and real purchase/analytics workflows.

## Phase 1 (in progress)
- Move from localStorage data model to Supabase-backed platform state.
- Keep local routes stable while replacing reads/writes with async service layer.
- Establish one source of truth for profiles + card bindings.

## Phase 2
- Add user authentication + per-user authorization rules.
- Split platform data into normalized collections (`users`, `profiles`, `cards`, `orders`, `events`).
- Implement secure card activation/reassignment lifecycle.

## Phase 3
- Build profile block system (links, booking, lead form, media, products).
- Implement production checkout and order history.
- Add analytics event tracking and dashboard.

## Phase 4
- Compliance/security hardening, QA automation, observability.
- Team controls (workspaces, roles, bulk card management).

## Immediate next tickets
1. Replace remaining localStorage dependency paths.
2. Introduce auth-gated settings editor and ownership checks.
3. Add server-side validation (Supabase Edge Functions) for card mapping.
4. Add tap event logging for `/c/:cardId` route.
