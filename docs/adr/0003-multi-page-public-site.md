# 0003 — A multi-page public site beside a separate app, with one workspace page

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

The product needs two different stories. A sponsor, organizer, or judge needs to understand the kernel before they trust the app. A collector needs a workspace where the photo, the claim, the checks, and the review controls stay in view.

A single-page app would blur those jobs. A four-step wizard for the pair workspace would hide the photo while the user marks the claim.

## Decision

Build two route groups:

- `app/(site)/` — `/`, `/how-it-works`, `/evidence`, `/for-organizers`, `/for-reviewers`, `/privacy`, `/about`.
- `app/(app)/` — `/cleanups`, `/cleanups/new`, `/cleanups/[id]`, `/cleanups/[id]/pairs/[pairId]`, `/review`, `/review/[claimId]`, `/cleanups/[id]/export`, `/settings`.

`/setup`, `/login`, `/p/[slug]`, and the API routes sit outside both groups. The public site has its own header and footer; the app has a thin work header. They share tokens, typography, and the receipt component.

The pair workspace stays **one page** with a **Capture → Mark → Compare → Submit** stepper. The stepper is a progress indicator with anchor links, not a wizard.

## Consequences

- More routes and more copy than a single-page app, but each audience gets a coherent surface.
- The workspace keeps the photo, region, claim, and checks in one context, which is required for precise marking.
- The public site can be server-rendered with no client JavaScript except the `<details>` mobile nav.
- The receipt component is shared across the app, export, and public page, so the kernel looks the same everywhere.
- The route groups add a small amount of layout duplication; the shared design tokens and components keep it from drifting.
