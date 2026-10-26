---
doc: prd
status: approved
---

# ShoreProof — Product Requirements

A photo-first cleanup evidence app for volunteer cleanup leads and the reviewer who signs off, where every exported claim resolves to a marked region in a specific photo and a named human decision.

Source: `scope.md > The Unique Kernel`, `scope.md > The Core Loop`.

## The Core Journey

1. The first run opens `/setup`. The user creates a **display name** and a role — collector, reviewer, or both. There is no email, password, or legal name. The app then opens an empty `/cleanups` list.
2. The user creates a cleanup: a public place label, a date, internal conditions, an optional public note, and a required consent attestation. The record opens with no pairs.
3. They add a pair and open the workspace. The stepper shows **Capture → Mark → Compare → Submit**.
4. They add a real before photo. The app strips EXIF/GPS, re-encodes a sanitized image, and runs preflight: resolution, blur, exposure, exact duplicate, near-duplicate. The uploader answers whether anyone is identifiable.
5. They draw a rectangle around the litter, pick a category, and write one plain sentence: "One bag of bottles removed from the rock line." The observation will be public if the claim is confirmed.
6. They click **Suggest candidates**. Dashed boxes appear in the AI layer with a COCO class and confidence. They accept one bottle, reject one false positive, and leave one untouched. Accepting creates an editable observation draft; rejecting is recorded with a reason.
7. They add the after photo of the same spot. Preflight runs again. The pair shows a framing signal — "shifted framing, 62/100" — and asks for a comparability state. They choose **partially comparable** and type: "Tide came in; camera shifted left."
8. They submit the pair for review. The record status becomes **In review**, and the claims appear in the reviewer queue with flags.
9. The reviewer opens the queue. Flagged claims sit on top. For each claim they see the before crop and after crop side by side, the observation, the AI provenance, the checks, the privacy status, and the comparability note.
10. The reviewer confirms the bottle claim, rejects "entire beach cleaned" as an overclaim, and sends a third claim back as **insufficient evidence** because the after photo does not show the marked rock.
11. The collector sees the returned claim and the reason. The confirmed claim is locked; the rejected and returned claims stay in the log but never reach the public page.
12. The reviewer opens **Export**. The evidence pack preview shows the confirmed claim, the exact crop, the reviewer, the timestamp, the photo hash, the model disclosure, and the decision log. They download the HTML pack and the JSON.
13. The organizer publishes the public page. A sponsor opens the link and sees only confirmed claims, each with its receipt, display names, and no coordinates or internal notes. The organizer can unpublish at any time; the old link stops working.

Success looks like this: a stranger can point at any sentence in the exported record and land on the pixels and the person responsible for it.

## Screens and Layout

The frontend has two shells: a public site and the app. They share typography, tokens, and the receipt component, but they do different jobs. Every surface is a route so the demo can deep-link.

### Public site

| Route | Purpose | Main sections |
|---|---|---|
| `/` | Explain the product and the kernel | Hero, the problem, the three-part kernel, the loop, AI disclosure, privacy promise, receipt anatomy, CTA |
| `/how-it-works` | Teach the workflow | Capture → Mark → Compare → Submit, then Review → Export; the four review actions; revisions; the `Not comparable` gate |
| `/evidence` | Explain what a receipt proves | Receipt fields, what "confirmed" means, what the detector can and cannot see, excluded claims, limitations |
| `/for-organizers` | Convince a cleanup lead | Running a cleanup, bulk import, sponsor-ready export, privacy controls, public page |
| `/for-reviewers` | Teach the reviewer | Queue flags, four decisions, self-review disclosure, revisions, empty queue |
| `/privacy` | State the data rules | What is collected, what is stripped, who sees what, public page controls, retention, deletion, limits |
| `/about` | Explain why it exists | Real-data stance, the Bittu Tabahi case study as a cited link, license, model, contact |

The public site uses a site header (wordmark, How it works, Evidence, For organizers, For reviewers, About, **Open the app**) and a footer (Privacy, License, GitHub). It has no fake testimonials, no invented counts, and no stock "save the ocean" imagery.

### App

| Route | Purpose |
|---|---|
| `/setup` | First-run display name and role |
| `/cleanups` | All cleanups, newest first; empty by default |
| `/cleanups/new` | Create a cleanup with consent |
| `/cleanups/[id]` | Record header, pair cards, publish status, actions |
| `/cleanups/[id]/pairs/[pairId]` | The core workspace: photo rail, compare canvas, evidence rail, stepper |
| `/review` | Split view: queue on the left, selected claim on the right |
| `/review/[claimId]` | Deep link to a claim in the review split view |
| `/cleanups/[id]/export` | Export preview, publication blockers, HTML/JSON downloads |
| `/settings` | People, privacy status, public page, data wipe instructions |
| `/p/[slug]` | Read-only public evidence page, outside the app shell |

The app header is a thin bar: wordmark, **Cleanups**, **Review**, **Settings**, **Public site**, user switcher. No sidebar, no dashboard tiles.

The pair workspace stays one page. The stepper is a progress indicator with anchor links to the Capture, Mark, Compare, and Submit panels; it is not a wizard. The photo and the claim must stay in view together.

## Look and Feel

Source: `scope.md > Inspiration & Identity`.

- **Metaphor:** a coastal survey sheet crossed with a chain-of-custody tag. Survey rules, field labels, photo corner ticks, a stamped receipt. Not a gamified eco app, and not the cream-and-terracotta field notebook cliché.
- **Palette:** salt-white `#F3F5F1` for surfaces, ink navy `#0E2433` for text and rules, tide-chart teal `#1C6B70` for confirmed and focus, safety orange `#E4572E` only for flags and the **insufficient evidence** action, cool hairline `#C6D1D2`, muted `#5A6A6D`. No green gradients, no glassmorphism, no beige paper.
- **Type:** **Archivo** for UI, **Newsreader** for record titles, **IBM Plex Mono** for IDs, hashes, timestamps, and receipt fields. The mono is the signal that this is a record, not a feed.
- **Layout:** photo-first. The compare canvas gets the width; the evidence rail is a fixed 360 px column. The public site uses a 12-column survey grid with visible hairline rules on the home page only. Receipts look like stamped tags with a perforated edge, not floating cards with shadows.
- **Receipt anatomy:** a punched hole, a perforated top edge, mono field labels, a rotated **CONFIRMED** stamp, a short hash strip, and fields for source, region, reviewer, decided-at, checks, and comparability. The same component appears in the app, the export, and the public page.
- **Tide-line divider:** a thin SVG wave rule between public-site sections. It draws once on the home page; it does not loop.
- **Motion:** the before/after wipe is direct manipulation. A review decision stamps in once with a 180 ms scale and a small rotation settle. The tide-line draws once. Nothing bounces, nothing loops. Respect `prefers-reduced-motion`.
- **Tone:** plain, specific, verifiable. Labels say "confirmed by", "checked at", "not included", "needs another photo". Never "AI-certified", "100% clean", or "verified beach".
- **Responsive:** below 900 px the compare canvas becomes Before/After tabs; the evidence rail stacks; the review split view becomes queue → claim. The public site nav collapses to a `<details>` menu with no client JavaScript.

## Features and Behavior

### First-Run Setup and People

Source: `scope.md > Privacy Baseline` (display names), `scope.md > The Core Loop` (step 1).

- `/setup` appears when there are no users. It asks for a **display name** (1–80 characters, unique) and a role: **Collector**, **Reviewer**, or **Both**. It shows the privacy notice and requires an acknowledgement.
- No email, password, legal name, organization, or address is collected.
- The choice is stored in a cookie and the app opens `/cleanups`.
- `/settings` lists people and lets the user add another display name and role. This is how a second reviewer joins a local workspace.
- The app header has a user switcher. Switching changes the actor on claims and decisions. There is no per-user password; the optional workspace passphrase gates the whole workspace.
- Self-review is allowed but disclosed. A solo organizer can use **Both**; a two-person team can add a reviewer.

### Cleanups

Source: `scope.md > The Core Loop`, steps 1–2.

- **Create:** site label (required, 1–120 characters; helper text says "Use a public place name, not a street address"), date (defaults to today, future dates rejected), lead (prefilled from the current display name), conditions (optional internal free text for weather, tide, notes), public note (optional; this is the only free text shown on the public page), and a consent attestation (required).
- **Consent:** "I took these photos or have permission to use them, and I have consent from anyone identifiable." The app stores the attestation actor, timestamp, and version. Uploads and imports are blocked without it.
- **List:** newest first. Each row shows site, date, lead display name, pair count, confirmed claim count, and a derived status chip. The public-page status is a separate chip: **Not published** or **Published**.
- **Status is derived, never hand-set:** **Draft** (no submitted pairs), **In review** (at least one pending or insufficient claim), **Reviewed** (all claims decided), **Exported** (an export was downloaded at least once).
- **Record header:** site, date, lead display name, conditions (internal), public note, pair count, confirmed claim count, reviewers, and the public-page panel.
- **No delete.** Records can be archived later; the POC has no destructive action inside the app, because the audit trail is the product. The operator can wipe the whole local data directory with a command.
- **Public page panel:** status, the current URL when published, a **Publish** or **Unpublish** button, and the blockers that prevent publishing.

### Photos, privacy, and preflight

Source: `scope.md > Privacy Baseline`, `scope.md > Where the AI Actually Is` (Check row).

- Upload JPEG, PNG, or WebP up to 20 MB. Drag-and-drop and file picker both work. HEIC is rejected with the iPhone hint.
- **Privacy pipeline runs before storage:** `sharp` applies EXIF orientation, re-encodes to JPEG, and drops EXIF, GPS, device, and timestamp metadata. The original upload bytes are discarded. The app records `original_sha256` for provenance and `sha256` for the sanitized bytes it stores and serves.
- **People-visible question:** "Is anyone identifiable in this photo?" Default **No**. If **Yes**, the photo is stored but marked **people visible**. It cannot be confirmed, exported, or published until it is replaced with a people-free photo or the claim is sent back. The POC does not auto-blur.
- Preflight runs in the browser before upload, in this order: decode, dimensions, blur, exposure, SHA-256, perceptual hash, near-duplicate comparison against the other current photos in the same cleanup.
- **Blur:** Laplacian variance on a grayscale copy scaled to a 1024 px long edge. Warn below 100. Show the raw number and the threshold.
- **Exposure:** share of pixels at or below 8 or at or above 247. Warn above 25%. Show the percentage.
- **Resolution:** warn below 1280 px on the long edge.
- **Exact duplicate:** SHA-256 of the sanitized bytes. If it matches another current photo in the cleanup, warn and offer **Use existing photo**.
- **Near-duplicate:** 64-bit dHash, Hamming distance ≤ 8 warns "likely duplicate", 9–14 informs "similar shot".
- **Never blocks upload.** Every result is a `pass`, `warn`, or `fail` with a number, a threshold, and a plain sentence. A warning becomes a queue flag, not a rejection.
- Preflight results are keyed to the sanitized file hash. Replacing the file re-runs every check.
- A photo cannot be replaced while it is the source of a confirmed claim. The user must create a revision first; the server enforces this.
- Only sanitized images are served. There is no route to the original upload, and original filenames are not stored.
- The workspace privacy panel states: **Metadata stripped**, **People visible: no/yes**, **Public use: allowed/blocked**.

### Regions and observations

Source: `scope.md > The Unique Kernel`.

- A photo can hold multiple observations, each with its own rectangle. One observation = one region + one sentence + one category.
- Draw by dragging on the photo; move and resize the rectangle; nudge with arrow keys. Coordinates are stored normalized to the image, so the crop survives any display size.
- **Observation text:** 1–280 characters, required. Placeholder: "What did you remove, from where?" Helper text: "This sentence will be public if the claim is confirmed."
- **Category:** a short ICC list — Beverage Bottles (Plastic), Beverage Cans, Caps & Lids, Cigarette Butts, Food Wrappers, Cups & Plates, Straws & Stirrers, Glass Beverage Bottles, Other Plastic Bags, Fishing Gear, Rope & Net, Other Trash — plus **Not sure**. The category is human-set. An AI mapping only pre-selects it.
- A claim cannot be submitted for review without a region, an observation, and a category.
- Draft claims can be edited or removed before submission. Removing a draft writes a `claim.draft_deleted` event; the claim itself was never evidence.

### AI suggestions

Source: `scope.md > Where the AI Actually Is`, **Propose** row.

- **Suggest candidates** runs YOLO26n in a Web Worker and returns boxes for the current before photo, the claim source.
- Each box shows: dashed outline, COCO class, confidence as a two-digit number, and a tentative ICC category followed by a question mark, e.g. `bottle 0.62 · Beverage Bottles (plastic)?`.
- Only a conservative allowlist maps to ICC: bottle → Beverage Bottles (Plastic); wine glass → Glass Beverage Bottles; cup and bowl → Cups & Plates; fork, knife, and spoon → Cups & Plates with an "uncertain mapping" note. Everything else is shown as **unmapped** and cannot be accepted without the human choosing a category.
- Per-box actions: **Accept**, **Edit box then accept**, **Reject**. Reject asks for one of: false positive, wrong category, duplicate of another box. The reason is optional but prompted.
- Accepting creates a *new* observation draft with the region and category prefilled. The suggestion row stays in the database, linked by `source_suggestion_id`.
- **No auto-accept.** There is no "accept all" and no confidence threshold that bypasses the buttons.
- Empty result: "No candidate boxes. COCO classes only — mark the litter yourself."
- Model unavailable: the button is disabled with "Detector not loaded. Check `npm run fetch-model`." The manual path is unaffected.
- The panel always shows the disclosure line: **"YOLO26n · COCO classes only — absence of a box is not evidence of absence."**
- The photo is not sent anywhere for inference. The model file is downloaded at build time and runs in the browser.

### Comparability

Source: `scope.md > The Core Loop`, step 5.

- When both photos exist, the app computes a **framing signal**: an 8×8 luminance-grid comparison plus brightness delta and aspect-ratio delta, reported as a 0–100 score and one of three words — **similar framing**, **shifted framing**, **very different framing**. It is labelled "signal, not a verdict".
- The human sets the state: **Comparable**, **Partially comparable**, **Not comparable**. A reason is required for the latter two.
- **Not comparable blocks confirmation.** The reviewer can still change the state with a reason, then confirm. This prevents a removal claim from shipping when the photos do not show the same spot.
- The state and reason appear in the export next to the claim.
- If either current photo in the pair is marked **people visible**, confirmation is blocked for the same reason: the claim cannot ship, so it should not be confirmed as final evidence.

### Review

Source: `scope.md > The Core Loop`, steps 6–7.

- **Queue order is deterministic.** Returned claims sit in a separate strip above the queue. For pending claims, first match wins: no region → not comparable → people visible → near-duplicate → absolute wording → low resolution → self-reviewed → accepted AI suggestion without edits → oldest first.
- **Flags are visible as text**, not icons alone: "near-duplicate", "uses absolute language", "same person collected and reviewed", "photo marked people-visible".
- **Absolute wording** is a small word list — entire, all, none, every, completely, fully, clean — matched case-insensitively as whole words. It flags; it never edits the claim.
- **Review panel:** before crop and after crop side by side with the region outlined, the observation, category, comparability, privacy status, preflight results, AI provenance (model, class, confidence, accepted/rejected), and the collector display name.
- **Four decisions**, each with a reason field:
  - **Confirm** — optional note. Locks the claim. Disabled when the pair is not comparable or either current photo is people-visible.
  - **Edit and confirm** — edits create a new revision; the previous text stays in the log.
  - **Reject** — reason required.
  - **Insufficient evidence** — reason required; returns the claim to the collector with a "needs another photo" state.
- **Self-review is allowed but disclosed.** If the reviewer is the collector, a chip says "self-reviewed", and the export records it. A two-person volunteer team should not be blocked by a rule it cannot staff.
- Confirmed claims are immutable. A correction creates a new draft revision; when that revision is confirmed, the old one is marked **superseded**, and both remain in the audit log.
- The queue is empty-state aware: "Nothing waiting. Confirmed claims are in the record."

### Evidence pack and public page

Source: `scope.md > The Core Loop`, step 8; `scope.md > Privacy Baseline`.

- **Export mode** contains, in order: cover (site, date, lead display name, reviewers, counts), method (what was checked, what the detector can and cannot see), confirmed claims with crop, receipt, and comparability note, **excluded claims appendix** (rejected and insufficient, with reasons, marked "not in the public record"), AI disclosure (model file, hash, runtime, boxes proposed/accepted/rejected/edited), and the audit log.
- **Public mode** contains only the cover, method, and confirmed claims with receipts. No excluded appendix, no internal conditions, no audit log.
- **Receipt per claim:** claim id, revision, sanitized source hash, original upload hash in the JSON export, region as normalized coordinates, crop, collector display name, reviewer display name, decision, decided-at timestamp, preflight results, comparability state and reason, and `source_suggestion_id` when one exists.
- **Publication blockers:** the public page and export are blocked when a confirmed claim's source photo is missing, superseded, or marked people-visible; when its pair is not comparable or partial; when the region, text, or category is missing; or when the public page has no confirmed claims. The UI lists the blockers with links to fix them.
- **Public page:** off by default. Publishing requires at least one confirmed claim and a clean blocker check. It uses a random slug, shows display names and roles only, has no coordinates, no internal conditions, no rejected or insufficient claims, and no audit log. It is `noindex` by default; share the link directly.
- **Unpublish:** sets `public_enabled = 0` and regenerates the slug, so the old link 404s. Republishing creates a new link.
- **Downloads:** a self-contained HTML file with embedded 640 px crops and a JSON file with the same data. Both are generated on demand; nothing is stored as a separate artifact. Filenames are generic (`shoreproof-record-<short-id>.html`), never the site name.
- The public page has a "Report a concern" link to the repository issues, not a contact form that collects personal data.

### Real records and import

Source: `scope.md > Where Real Data Comes From`.

- The app has **no demo record**. The empty state explains the two ways to start: capture a pair in the app, or import a real cleanup from a manifest.
- **Manifest import** is for a whole cleanup delivered as a folder of real photos plus a JSON file:

  ```json
  {
    "schema": "shoreproof.import.v1",
    "cleanup": {
      "external_id": "2026-10-24-north-jetty",
      "site": "North Jetty",
      "date": "2026-10-24",
      "lead": "Maya C.",
      "conditions": "Low tide, overcast, 12 volunteers.",
      "public_note": "Twelve volunteers removed 18 bags from the north jetty rock line."
    },
    "consent": {
      "attested": true,
      "by": "Maya C.",
      "note": "Photos taken by the cleanup lead; no identifiable people."
    },
    "pairs": [
      {
        "label": "Rock line at the north jetty",
        "before": "photos/pair-1-before.jpg",
        "after": "photos/pair-1-after.jpg",
        "before_people_visible": false,
        "after_people_visible": false
      }
    ]
  }
  ```

- The importer creates the cleanup, pairs, sanitized photos, preflight results, framing signal, and an import audit row. It **never creates claims, observations, categories, comparability states, suggestions, or review decisions**.
- **Consent is required.** A manifest with `attested: false` or a missing consent block is rejected.
- **Unknown keys are rejected** at every level, so a manifest cannot smuggle in `claims`, `observations`, or `review`.
- **Path safety:** every photo path is resolved relative to the manifest, must stay inside the manifest directory, must be a regular file (no symlinks), and must be JPEG/PNG/WebP under 20 MB.
- **Idempotency:** a manifest hash that was already imported is skipped. An `external_id` that already exists with a different manifest fails with a clear message.
- **Exact duplicate pair:** if the before and after sanitize to the same hash or the same dHash, the import rejects that pair because it is not evidence of removal.
- **Warnings:** blur, exposure, low resolution, and people-visible flags are printed in the import summary and stored on the photos. They do not block the import, but they block confirmation/export/publication later.
- **Dry run:** `npm run import -- --dry-run ./imports/north-jetty/manifest.json` validates and prints the plan without writing.
- `imports/` is gitignored. The committed example lives at `docs/import-manifest.example.json` and contains placeholder paths, not data.
- No CSV, Clean Swell, OpenLitterMap, or social-media integration in the POC. Those are context sources, not paired evidence.

### Public site

Source: `scope.md > Public Site and App Routes`, `scope.md > Inspiration & Identity`.

- Seven server-rendered pages with a site header, footer, survey grid, tide-line divider, and the receipt component.
- `/` explains the kernel in one screen: region + named review + receipt. It uses a receipt anatomy card with labelled fields and redacted values, not a fake claim.
- `/how-it-works` walks the six-step loop and the four review actions, including **insufficient evidence** and the `Not comparable` gate.
- `/evidence` explains what a receipt proves and what it does not: sanitized hash, region, reviewer, timestamp, checks, AI provenance. It states the detector's COCO limitation and the excluded-claims rule.
- `/for-organizers` covers first-party capture, the manifest importer, sponsor-ready export, privacy controls, and the public page.
- `/for-reviewers` covers queue flags, the four decisions, self-review disclosure, revisions, and the empty queue.
- `/privacy` is the plain-language version of the privacy baseline, including retention, data wipe, the optional workspace passphrase, and the limits of the POC.
- `/about` states the real-data position and cites the Bittu Tabahi / Ajnar River cleanup as an external case study with a link. It does not embed or re-host the video.
- **No fabricated proof:** no invented testimonial, no "trusted by N organizers", no stock cleanup photo presented as a ShoreProof record. If the site shows a receipt, it is labelled as an anatomy example or links to a real published record.
- The site has no third-party analytics, fonts, or scripts. The mobile nav uses `<details>`; the rest is server-rendered.

### Privacy and consent

Source: `scope.md > Privacy Baseline`.

- **Collected:** display name, role, cleanup site label, date, internal conditions, public note, sanitized photos, claims, decisions, timestamps, and hashes.
- **Not collected:** email, phone, postal address, GPS coordinates, device metadata, analytics identifiers, or legal names.
- **Consent:** required at cleanup creation and import; stored with actor, timestamp, and version. Uploads are blocked without it.
- **Metadata:** stripped on upload; original bytes discarded; only sanitized images served.
- **People:** the uploader flags identifiable people; flagged photos block confirmation, export, and publication until replaced. No automatic face blur.
- **Public identity:** display names and roles only. No emails, addresses, or coordinates.
- **Public page:** off by default, random slug, new slug on publish, `noindex`, only confirmed claims.
- **Export:** display names, excluded appendix, audit log. It is for the organizer and sponsor, not the public page.
- **Retention:** local data stays until `npm run data:wipe -- --yes`; a hosted operator controls the volume and retention.
- **Limits:** the POC is not anonymous, not a compliance product, and has no per-user accounts. A hosted workspace must use the workspace passphrase. These limits are stated on `/privacy`.

## States and Boundaries

- **First use** — `/setup` with display name and role; then an empty `/cleanups` with **New cleanup** and a short explanation of capture vs. import. No **Load demo record**.
- **No photos** — the pair shows two empty slots labelled "Before" and "After", with the preflight panel muted.
- **Preflight running** — the upload preview shows a progress line; the claim panel is disabled until it finishes.
- **Privacy blocked** — a people-visible photo shows a clear warning and the actions that are disabled: confirm, export, publish. The remedy is "replace with a people-free photo" or "send back".
- **Model unavailable** — **Suggest candidates** is disabled with the fetch-model hint. Manual regions, checks, review, and export all still work.
- **No suggestions** — explicit "no boxes" message plus the COCO limitation. No spinner left running.
- **Near-duplicate** — warning card with both thumbnails and **Use existing photo**.
- **No region** — submit is disabled with "Mark the claimed area first."
- **Not comparable** — confirm is disabled with "These photos do not show the same spot. Send back for a re-shoot or change the state with a reason."
- **Returned claim** — collector sees a banner with the reviewer's reason and an **Add replacement photo** action.
- **Confirmed claim** — read-only, with a **Revise** action that creates a new revision.
- **Empty queue** — "Nothing waiting" plus a link back to the record.
- **Zero confirmed claims** — export is allowed, but the pack says "No confirmed claims" and lists the excluded ones. Publication is blocked.
- **Public page off** — `/p/[slug]` returns 404; the record shows **Not published** and the blockers.
- **Public page on** — a random URL, display names only, confirmed claims only, `noindex`; **Unpublish** invalidates the link.
- **Import errors** — missing consent, unknown keys, path escape, unsupported file, duplicate manifest, duplicate `external_id`, exact duplicate pair. Each prints one plain sentence and exits non-zero.
- **Hosted without a passphrase** — the app shows a banner: "No workspace passphrase set. Do not expose this instance."
- **Persistence** — SQLite and sanitized uploads survive restarts locally and across deploys when `/data` is mounted.
- **Identity** — display names, a user switcher, no passwords; the optional workspace passphrase gates the workspace.

## Product Decisions

- **No demo data, ever.** Reason: a trust product that fakes its own evidence is not credible. The app starts empty and the importer never creates claims.
- **First-party capture plus a manifest importer.** Reason: no public dataset contains paired before/after cleanup photos, and the pair is the kernel.
- **Strip metadata and discard the original upload.** Reason: privacy. The receipt hashes the sanitized bytes that are actually stored and served; `original_sha256` preserves provenance without retaining the original.
- **People-visible photos block confirmation, export, and publication.** Reason: consent and privacy. A claim that cannot ship should not be confirmed as final evidence.
- **Display names only.** Reason: data minimization. A reviewer can be named without collecting a legal identity.
- **Public page off by default, random slug, new slug on publish, `noindex`.** Reason: the public page is for a sponsor with the link, not for search engines.
- **The export includes an excluded-claims appendix; the public page does not.** Reason: transparency for the sponsor without publishing rejected claims as if they were findings.
- **Confirmed claims are immutable; corrections create revisions.** Reason: the audit trail must not be rewritten.
- **`Not comparable` blocks confirmation.** Reason: a removal claim needs the same spot.
- **Self-review is allowed and disclosed.** Reason: small volunteer teams cannot always staff two people.
- **A named human decides; the model proposes.** Reason: the kernel, and AgentVQA's 58.5% best score with grounding failures.
- **No auto-accept threshold.** Reason: a confidence number is not authority.
- **Raw evidence plus an append-only log.** Reason: no derived "case state" that the app trusts over the log.
- **Rule-based queue, no learned controller.** Reason: readable, deterministic ordering.
- **Checks are keyed to the stored hash and re-run on change.** Reason: stale evidence must not be reused.
- **Every claim carries an evidence receipt; unresolved claims are marked `insufficient`.** Reason: evidence-first verification.
- **No third-party runtime calls.** Reason: the photo, the claim, and the reviewer stay on the workspace machine.

## What We're Building

- First-run setup with display names and roles; people management; user switcher.
- Cleanup create, list, and record view with consent attestation and public note.
- Pair workspace with stepper, sanitized before/after upload, privacy panel, preflight, and compare.
- Browser YOLO26n suggestions with accept, edit, and reject.
- Rectangle regions with normalized coordinates.
- Observation text and ICC category picker.
- Framing signal plus human comparability state and reason.
- Reviewer queue with deterministic flags and four decisions.
- Claim revisions with superseded history.
- Evidence receipt per confirmed claim.
- Append-only decision log.
- Export preview, self-contained HTML download, and JSON download with excluded appendix.
- Public evidence page with publish/unpublish, random slug, display names, and privacy blockers.
- Manifest importer for real cleanup records; never creates claims.
- Seven-page public site and the app routes above.
- One-command local run, Dockerfile, optional Fly config, workspace passphrase, and data wipe.
- README, AGPL-3.0 license, tests, and submission docs.

## Deferred From the POC

- **Real accounts and organizations** — the POC uses display names and an optional workspace passphrase; per-user auth would add a week and does not prove the kernel.
- **Multi-user concurrency** — SQLite is single-writer; a chapter-sized team is fine for the demo.
- **Video clips and best-frame extraction** — the kernel is provable with two stills.
- **Homography or automatic alignment** — the POC reports a framing signal, not a registration.
- **C2PA signing** — needs a real signing identity; SHA-256 plus a log is enough for the POC.
- **CSV import from Clean Swell or Debris Tracker** — useful context, but not paired evidence.
- **Third-party social video ingestion** — permission and privacy problems; cite, don't ingest.
- **Automatic face blurring** — a wrong blur is worse than an honest block.
- **A fine-tuned litter detector** — no labeled data, no GPU, no time.
- **S3 or Supabase storage** — one local adapter is easier to debug in two days.
- **Maps, GPS, and OSPAR transects** — a site label and a marked spot prove the kernel.
- **Notifications** — the returned-claim banner is enough.
- **Native app** — a responsive web app is enough for the video.

## Possible Later Enhancements

- C2PA Content Credentials signing for the exported pack.
- OSPAR-style 100 m survey units with GPS and a repeat-visit schedule, opt-in and coarse by default.
- Open-vocabulary detection (YOLOE-26) once a GPU is available.
- Reviewer calibration: compare decisions across reviewers on the same claim.
- A public read API and an offline PWA for beach volunteers with no signal.
- 3D site reconstruction from a photo set, if capture protocols ever justify it.
- Face redaction with a human check.
- A consented connector to an organizer's own archive.

## Non-Goals

- **Automatic litter counting or a "clean" verdict.** The model is not reliable enough on beach litter, and a wrong verdict would destroy the kernel.
- **LLM-written review decisions or auto-approval.** The reviewer must be a named human.
- **A local VLM in the POC.** CPU latency is impractical, and October 2026 work documents grounding and inverse-scaling failures.
- **Greenwashing scores or brand ratings.** Out of scope and reputationally risky.
- **Blockchain anchoring.** Hashes and an append-only log carry the trust story without the theatre.
- **Training or fine-tuning a model.** No data, no GPU, no time.
- **Certification.** ShoreProof records evidence; it does not certify a beach.
- **Re-hosting third-party cleanup video.** Cite and link; do not download, clip, or republish.
- **Fabricated demo records.** No seed, no sample claims, no invented cleanup.

## Open Questions

None for the product. The three integrity calls were confirmed at review: the excluded-claims appendix stays, confirmed claims stay immutable, and `Not comparable` blocks confirmation. The real-data and privacy calls are settled in `scope.md`.

One delivery dependency remains: the demo video needs two real before/after pairs captured with consent. The build can proceed without them; the video cannot honestly show the core loop without them. The Instagram case study is cited on `/about`, not ingested.