---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast. I build and verify each slice; hands-on checkpoints after slices 3, 7, and 10.

## Slices

- [x] **1. You can set up a workspace and create a real cleanup**
  Becomes usable: A running app with first-run setup, an empty cleanup list, a create form with a consent attestation, and a cleanup record page. Nothing about photos yet.
  Why now: Bootstrapping, identity, and the real-data rule live inside the first usable behavior. There is no seed and no demo record, so the empty state is the real starting point.
  PRD ref: `prd.md > The Core Journey` (steps 1–2), `prd.md > Features and Behavior > First-Run Setup and People`, `prd.md > Features and Behavior > Cleanups`
  Spec ref: `spec.md > Build Configuration`, `spec.md > Components > First-Run Setup and People`, `spec.md > Components > App Shell and Identity`, `spec.md > Components > Cleanup List and Creation`, `spec.md > Components > Cleanup Record`, `spec.md > Data Model`, `spec.md > File Structure`
  Build: Scaffold Next 16.4.3 with TypeScript and Tailwind 4; add the salt/ink/tide tokens and Archivo/Newsreader/IBM Plex Mono; install `better-sqlite3`, `zod`, and `sharp`; create the schema, DB bootstrap, and first-run setup; add the display-name cookie, user switcher, cleanup list, create page, consent attestation, public slug, and record header. No `db:seed`, no demo link.
  Verify (mechanical): `npm run build` passes; a fresh `DATA_DIR` redirects to `/setup`; creating a person opens `/cleanups`; creating a cleanup inserts a row and opens its record; a future date or missing consent is rejected; `vitest` covers slug generation, consent validation, and status derivation; a text search finds no demo seed path or "Load demo record".
  Learner check: Open `/`, set up your display name, create a cleanup, and open its record. Tell me whether the empty state feels intentional rather than broken, and whether the type and colors feel like the coastal survey sheet we described.
  Commit: `Add first-run setup and real cleanup records`

- [ ] **2. You can upload a real before photo and see privacy-safe evidence checks**
  Becomes usable: A pair workspace with a Before slot, drag-and-drop or file-picker upload, a sanitized stored image, a thumbnail, a privacy panel, and a preflight panel showing resolution, blur, exposure, exact duplicate, and near-duplicate results.
  Why now: Every claim needs a source photo, and privacy has to be enforced before any bytes are stored. Building the sanitize-on-write path before the region tools means later slices cannot accidentally store an unsafe original.
  PRD ref: `prd.md > The Core Journey` (steps 3–4), `prd.md > Features and Behavior > Photos, privacy, and preflight`
  Spec ref: `spec.md > Components > Pair Workspace`, `spec.md > Components > Preflight Engine and Photo Privacy`, `spec.md > Data Model`, `spec.md > Important Failure Modes`
  Build: Add pair creation and the workspace shell; build the upload route with `sharp` orientation, re-encode, EXIF/GPS strip, `original_sha256`/`sha256`, 20 MB and JPEG/PNG/WebP validation, thumbnail generation, dHash, blur, exposure, and near-duplicate comparison; build the browser provisional preflight path; render the preflight panel with pass/warn/fail, numbers, and thresholds; add the privacy panel and the people-visible question; serve only sanitized images; add the 640 px thumb route; write the privacy and preflight tests.
  Verify (mechanical): `npm run build` passes; `vitest` covers blur, exposure, dHash, duplicate distance, and metadata stripping; upload a generated JPEG with GPS EXIF through `curl -F`, confirm the stored file has no `exif` or `gps`, confirm the served bytes hash to `sha256`, and confirm `original_sha256` differs; the thumb route returns an image; a HEIC upload is rejected; a people-visible upload stores the flag.
  Learner check: Add a pair, upload a real before photo, and check the preflight numbers and the privacy panel. Does the photo appear with the right orientation, and does the privacy note make sense without a security lecture?
  Commit: `Add sanitized before photo upload and preflight checks`

- [ ] **3. You can mark a real claim and save an observation**
  Becomes usable: A rectangle drawn on the before photo, an observation sentence, an ICC category, a saved draft claim, a claim list, and a draft that survives a reload.
  Why now: The human-marked region plus the named observation is the unit the whole product exists to protect. It must exist before AI suggestions, review, or export.
  PRD ref: `prd.md > The Core Journey` (step 5), `prd.md > Features and Behavior > Regions and observations`
  Spec ref: `spec.md > Components > Region Editor and Compare Canvas`, `spec.md > Components > Pair Workspace`, `spec.md > Data Model`
  Build: Build the SVG region overlay with normalized coordinates, pointer drawing, move/resize, arrow-key nudge, minimum size, and **Mark full photo**; build the claim form with 1–280 characters, the 12 ICC categories plus **Not sure**, and **Save draft**; add `saveClaim` with server-side validation; render the claim list with edit and remove for drafts; add the `claim.draft_deleted` event.
  Verify (mechanical): `vitest` covers region clamp and normalization; a `tsx` check creates a draft claim with a region, text, and category; the pair page renders the region; the server rejects a claim with no region, no text, no category, or an after-photo source; multiple claims can exist on one pair; removing a draft writes the event and removes the row.
  Learner check: Draw a box around the litter line, write one plain sentence, pick a category, and save. Reload and confirm the box and text are still there. Tell me if drawing feels precise enough.
  Commit: `Add region marking and draft observations`

- [ ] **4. AI proposes candidate boxes and you accept or reject each one**
  Becomes usable: A **Suggest candidates** button that runs YOLO26n in the browser, dashed boxes with COCO class and confidence, and per-box Accept, Edit box then accept, and Reject actions that create or reject a draft claim.
  Why now: This is the visible AI and the riskiest technical unknown. The manual claim path already works, so a detector failure is contained; testing it now avoids building review and export around an assumption.
  PRD ref: `prd.md > The Core Journey` (step 6), `prd.md > Features and Behavior > AI suggestions`
  Spec ref: `spec.md > Components > Detector Worker (YOLO26n)`, `spec.md > Components > Suggestion Layer`, `spec.md > Build Configuration`, `spec.md > Data Model`
  Build: Add the checksum-pinned model fetch and ORT WASM copy scripts; build the worker, output-shape parser, COCO names, conservative COCO→ICC map, and detector client; add `saveSuggestions`, `acceptSuggestion`, and `rejectSuggestion`; render dashed boxes, provenance, the model disclosure, and the empty/unavailable states; test letterbox versus direct resize on a real litter photo and record the answer in the spec.
  Verify (mechanical): `npm run fetch-model` reports the expected 9,890,454 bytes and SHA-256; `vitest` covers both output shapes; Playwright or a manual run uploads a real photo, runs the detector, and confirms at least one box lands on an object; accepting creates a claim with the same region and `source_suggestion_id`; rejecting creates no claim and writes the reason; the model-unavailable state leaves the manual path working.
  Learner check: Upload a real beach or park photo with litter, click **Suggest candidates**, accept one real box and reject one false positive. Confirm the box outline lands on the object and the panel discloses the model and the COCO limitation.
  Commit: `Add browser YOLO26n suggestions with human accept or reject`

- [ ] **5. You can add the after photo, compare the spot, and submit for review**
  Becomes usable: Both sides of a pair, a draggable before/after wipe, a framing signal, a human comparability state with a reason, a working stepper, and a submitted pair whose claims enter the review queue.
  Why now: A removal claim needs both photos and a comparability decision. `Not comparable` and `people-visible` must block confirmation before the reviewer screen exists, not after.
  PRD ref: `prd.md > The Core Journey` (steps 7–8), `prd.md > Features and Behavior > Comparability`, `prd.md > Features and Behavior > Photos, privacy, and preflight`
  Spec ref: `spec.md > Components > Pair Workspace`, `spec.md > Components > Comparability Panel`, `spec.md > Components > Region Editor and Compare Canvas`, `spec.md > Data Model`
  Build: Add the After upload slot and compare canvas with a keyboard-operable range control; compute the 8×8 framing signal; add `setComparability` with required reasons for partial and not comparable; add `submitPair` validation for both photos, a comparability state, at least one claim, and every claim's region, text, and category; derive the record's **In review** status; wire the stepper; carry the after photo's people-visible flag into the pair's blockers.
  Verify (mechanical): `vitest` covers the framing formula and words; Playwright uploads both photos, sets **Partially comparable** with a reason, submits, and confirms the claims are `pending` and the record is **In review**; submit is rejected when the after photo, comparability, or a complete claim is missing; a people-visible after photo is stored and shown as a blocker.
  Learner check: Add the after photo, drag the compare wipe, choose **Partially comparable**, type the tide/camera reason, and submit. Tell me whether the framing signal reads as a helpful hint rather than a verdict.
  Commit: `Add after photo, comparability, and review submission`

- [ ] **6. A reviewer can confirm, edit, reject, or send a claim back**
  Becomes usable: A `/review` split view with a deterministic flagged queue, before/after crops with the region outlined, AI provenance, privacy status, and four decisions that write an append-only log. Confirmed claims lock; a revision creates a new draft.
  Why now: The named human decision is the authority layer. The kernel is not proven until confirm, reject, insufficient evidence, self-review disclosure, privacy blocking, and revision history all work together.
  PRD ref: `prd.md > The Core Journey` (steps 9–10), `prd.md > Features and Behavior > Review`
  Spec ref: `spec.md > Components > Review Queue`, `spec.md > Components > Claim Review and Decisions`, `spec.md > Data Model`
  Build: Build `lib/queue.ts` flags and priority; render the queue, returned strip, and claim panel; add before/after crops with the region outlined; implement `decideClaim` as one transaction for confirm, edit-and-confirm, reject, and insufficient; implement `reviseClaim` as a draft revision; add the self-reviewed chip, absolute-wording flag, people-visible block, not-comparable block, and empty queue state.
  Verify (mechanical): `vitest` covers queue order, flag matching, and terminal-state rules; Playwright confirms one claim, rejects one, sends one back, and verifies the database statuses, `decided_by`, `decided_at`, and events; a second decision is refused; a `not_comparable` pair blocks confirm; a people-visible photo blocks confirm; a revision keeps the old claim visible until the revision is confirmed.
  Learner check: Switch to Ravi, open **Review**, confirm one claim, reject the overclaim, and send one back as **insufficient evidence**. Switch back to Maya and confirm the returned reason is visible. Tell me whether the queue puts the right claim first.
  Commit: `Add reviewer queue, decisions, and revisions`

- [ ] **7. Every confirmed claim exports with a receipt, and the public page is private until published**
  Becomes usable: An export preview, a self-contained HTML download, a JSON download, and a read-only public page that is off by default and only shows confirmed claims. Each confirmed claim carries its crop, sanitized source hash, region, collector, reviewer, timestamp, checks, comparability note, and AI provenance. Rejected and insufficient claims appear only in the export appendix.
  Why now: This is the kernel payoff. With real decisions in place, the receipt can be assembled, filtered, escaped, and checked end to end rather than mocked.
  PRD ref: `prd.md > The Core Journey` (steps 11–12), `prd.md > Features and Behavior > Evidence pack and public page`
  Spec ref: `spec.md > Components > Evidence Pack`, `spec.md > Data Model`, `spec.md > Components > Privacy and Data Lifecycle`, `spec.md > File Structure`
  Build: Build `lib/export.ts` receipt assembly and confirmed-claim filtering; `lib/privacy.ts` export and public blockers; `lib/html.ts` escaping and the standalone pack template; the evidence-pack component in export and public modes; the export route for HTML and JSON; the public page; the excluded-claims appendix; the AI disclosure; the audit log; the publish/unpublish actions with a new random slug on each transition; `noindex`; and `export.downloaded` / `public.published` / `public.unpublished` events.
  Verify (mechanical): `vitest` covers receipt filtering, blockers, and HTML escaping; `curl` downloads both formats; the JSON parses and every receipt hash matches the stored sanitized photo; the HTML opens offline with visible crops; a rejected claim is absent from `/p/[slug]` and present in the export appendix; `/p/[slug]` is 404 before publish; publish is blocked with zero confirmed claims; a people-visible photo blocks export and publish; unpublishing makes the old link 404; a missing source file fails the export loudly.
  Learner check: Export the record, open the HTML offline, and click a claim to see its crop, reviewer, and hash. Open the public page in a private window and confirm the rejected claim is not there. Unpublish and confirm the old link is dead. Tell me whether the receipt is understandable without an explanation.
  Commit: `Add evidence receipts, export pack, and private-by-default public page`

- [ ] **8. You can import a real cleanup from a manifest without fabricating claims**
  Becomes usable: A CLI importer that takes a JSON manifest and a folder of real photos, creates the cleanup, pairs, sanitized photos, preflight results, framing signal, and an import audit row, and leaves the record with zero claims.
  Why now: This is the honest bulk-feed path for real cleanups. It reuses the slice 2 ingestion code, so privacy and checks cannot drift between upload and import.
  PRD ref: `prd.md > Features and Behavior > Real records and import`, `prd.md > The Core Journey` (optional bulk path)
  Spec ref: `spec.md > Components > Real Record Importer`, `spec.md > Data Model`, `spec.md > File Structure`, `spec.md > Important Failure Modes`
  Build: Build `lib/import.ts` with a strict Zod manifest, consent resolution, path validation, idempotency, exact-duplicate pair rejection, and a dry-run; build `scripts/import.ts` with a readable summary and warnings; add the `import_batches` table and `cleanup.imported` event; add `docs/import-manifest.example.json`; never create claims, suggestions, comparability, or review rows.
  Verify (mechanical): Import a real two-pair manifest; confirm the cleanup, pairs, and sanitized photos exist and the record has zero claims and zero suggestions; re-run the same manifest and confirm it skips; a manifest with a `claims` key is rejected; a `../` path or symlink escape is rejected; missing consent is rejected; an exact duplicate before/after pair is rejected; a GPS-tagged photo produces a sanitized file with no GPS; `--dry-run` writes nothing.
  Learner check: Create a folder with two real pairs and a manifest, run the import, and open the record. Confirm the pairs and checks are there and there are no claims. Does the summary tell you what to do next?
  Commit: `Add manifest importer for real cleanup records`

- [ ] **9. The public site is genuinely multi-page and the app has its own routes**
  Becomes usable: Seven public pages with a site shell, a receipt component, a tide-line divider, a survey grid, and the app's separate routes for setup, cleanups, record, workspace, review, export, and settings.
  Why now: The core loop works and the product has something to explain. The public site is the submission's front door and the user's explicit multi-page requirement; building it now lets the final pass focus on copy and polish rather than structure.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Features and Behavior > Public site`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Components > Public Site`, `spec.md > Look and Feel`, `spec.md > File Structure`
  Build: Add the `(site)` and `(app)` route groups; build the site header/footer, tide-line divider, field label, survey grid, and receipt anatomy; write the seven pages; add the app navigation and the `/setup`, `/settings`, `/review/[claimId]`, and `/cleanups/new` routes; make the mobile nav a `<details>` menu; add metadata; run the copy audit; add the `/about` case-study link with `rel="noopener noreferrer"`.
  Verify (mechanical): `npm run build` passes; every public route returns 200; every nav link resolves; no page contains "demo data", "AI-certified", "100% clean", "verified beach", or an invented count; the layout works at 360 px; keyboard focus is visible; `prefers-reduced-motion` removes the stamp and tide-line animation; `curl` shows the expected titles.
  Learner check: Click through every public page and every app route. Does it feel like one designed product rather than a template? Is the receipt the memorable element? Tell me what to change.
  Commit: `Add multi-page public site and app route shell`

- [ ] **10. The Docker image, README, license, and demo path make it reproducible**
  Becomes usable: A Docker image with a `/data` volume, a `fly.toml`, a README, an AGPL-3.0 license, an `.env.example`, a data-wipe command, an optional workspace passphrase, and a Playwright happy path plus insufficient-evidence path.
  Why now: The product works; this slice makes it reproducible for the video and for anyone who tries it, and removes the setup ambiguity that would otherwise leak into the submission.
  PRD ref: `prd.md > States and Boundaries`, `prd.md > What We're Building`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Build Configuration`, `spec.md > Components > Privacy and Data Lifecycle`, `spec.md > Important Failure Modes`
  Build: Add the Dockerfile, `.dockerignore`, `fly.toml`, `README.md`, `LICENSE` (AGPL-3.0), `.env.example`, and `scripts/data-wipe.mjs`; add the optional `WORKSPACE_PASSPHRASE` login and middleware; add the Playwright happy path and insufficient-evidence path; run the copy audit; add the root README links to `devpost/scope.md`, `devpost/prd.md`, and `devpost/spec.md`; write the demo rehearsal checklist for the two real pairs.
  Verify (mechanical): `docker build` succeeds; the container serves the app with a named volume at `/data`; a fresh local run works from the README commands; `npm run test` and the Playwright suite pass; the passphrase gate protects `/cleanups` but not `/p/[slug]`; `npm run data:wipe -- --yes` removes the database and uploads; a text search finds no "AI-certified", "100% clean", or "verified beach"; the README commands match the actual scripts.
  Learner check: Run the setup commands from a clean `data/` folder, create a real record, and try the full journey. Then run the Docker container if you want the deployment path checked. Tell me anything that feels slow, confusing, or unfinished.
  Commit: `Add Docker, docs, passphrase gate, and final polish`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 3, when a real cleanup, a sanitized before photo, and a marked draft claim exist
- [ ] Core journey explored — after slice 7, when the full collect → review → export → public loop works
- [ ] Final kick-the-tires exploration and feedback completed — after slice 10

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence:
Route and stops:
Edit outcome:
Reflection:
Activity mode:

## Revisions

- 2026-10-24 — Build mode set to fast. Slice 1 complete: Next 16.4.3 scaffold, design tokens and fonts, SQLite schema and bootstrap, first-run setup, display-name cookie and switcher, settings/people, empty cleanup list, cleanup creation with consent attestation, cleanup record, and pair creation. Added a minimal pair/workspace shell so a new record has a next step before photo upload lands in slice 2. Verified with `npm run build`, 16 Vitest tests, a `tsx` data smoke, and a Playwright pass over setup → empty list → create → record → pair → add person → switch user with no console errors. Corrected the spec's React version to 19.3.0 and TypeScript to 5.9.3.
