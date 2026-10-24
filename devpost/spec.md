---
doc: spec
status: approved
---

# ShoreProof — Technical Spec

## How This Works, In Plain Language

ShoreProof is one web app backed by one small database and one folder of sanitized photos. There is no separate Python service, no model server, and no GPU.

- **The app** is a Next.js application. One Node process serves the public site, the app pages, and the small server functions that create records and save decisions.
- **The database** is SQLite, which is a single file (`shoreproof.db`). It holds cleanups, pairs, photos, claims, imports, and the append-only event log.
- **The photos** are ordinary files under `${DATA_DIR}/uploads`. The app stores a sanitized JPEG and a thumbnail. The database stores their path, hashes, and measurements, not the image bytes.
- **The AI** is a YOLO26n model exported to ONNX, a portable model file. The browser downloads that file once and runs it with ONNX Runtime Web, which uses WebAssembly. Inference happens in the volunteer's browser; the photo is not sent anywhere for a suggestion.
- **The checks** (blur, exposure, duplicate hashes) are plain arithmetic on pixels, done twice: in the browser for instant feedback, and on the server with `sharp` for the canonical record.
- **Privacy is a pipeline, not a policy.** On upload, the server applies orientation, re-encodes the image, drops EXIF/GPS, and stores only the sanitized bytes. The original upload is never written to disk. The receipt hashes the sanitized bytes that are actually served.
- **Real records only.** The app starts empty. A record comes from first-party capture or from the manifest importer, which creates the cleanup, pairs, sanitized photos, and checks but never claims.
- **The frontend has two shells.** The public site explains the product; the app does the work. They share tokens and the receipt component but have separate layouts and navigation.
- **The evidence pack** is generated from the database and the sanitized files. It is HTML plus JSON, not a PDF, so every claim can carry its crop and its receipt.

Why this shape: the kernel needs a trustworthy record, not a scalable platform. One process, one file database, a browser-side detector, and a sanitize-on-write pipeline are the fewest moving parts that can prove it. A separate model service or a hosted vector database would add failure modes without making the evidence stronger.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

1. **Open `/`** → the public home page renders from static content. **Open the app** links to `/cleanups`.
2. **No users yet** → `/cleanups` redirects to `/setup` → `createFirstUser` validates the display name and role, inserts one row, sets the `shoreproof_user_id` cookie, and redirects to `/cleanups`.
3. **Create a cleanup** → `createCleanup` validates the form (site, date, conditions, public note, consent), inserts one row with a random `public_slug` and `public_enabled = 0`, writes a `cleanup.created` event, and revalidates `/cleanups`.
4. **Open the record** → the server component loads the cleanup, its pairs, current photos, claim counts, and publication blockers → pair cards render.
5. **Add a pair** → `createPair` inserts a pair row and a `pair.created` event.
6. **Upload the before photo** → the browser runs provisional preflight → `POST /api/pairs/[pairId]/photos` sends the file → the server validates it, checks consent, sanitizes it with `sharp` (orientation, re-encode, metadata strip), computes `original_sha256`, `sha256`, dHash, blur, exposure, and near-duplicate distance → in one transaction, any previous current photo on that side is marked `superseded_at`, then the new `photos` row and `photo.uploaded` event are inserted → the workspace refreshes.
7. **Draw a region and write the observation** → the region editor stores normalized coordinates in local state → `saveClaim` inserts a draft `claims` row and a `claim.created` event, or updates an existing draft and writes `claim.updated`.
8. **Suggest candidates** → the detector worker loads the ONNX file, runs one inference, returns boxes → the browser posts the boxes to `saveSuggestions`, which inserts one `model_runs` row and its `suggestions` → dashed boxes render.
9. **Accept or reject a box** → `acceptSuggestion` creates a draft claim with the box's region and a `source_suggestion_id`; `rejectSuggestion` records the reason. Both write events.
10. **Upload the after photo** → same path as step 6 → the pair now has both sides.
11. **Set comparability** → the server computes the framing signal from both sanitized photos → `setComparability` stores the human state, reason, and actor → a `comparability.set` event.
12. **Submit for review** → `submitPair` validates both photos, a comparability state, at least one claim, and every claim's region, text, and category → sets claims to `pending` → a `claim.submitted` event.
13. **Review** → `/review` loads pending claims, computes flags and priority in `lib/queue.ts`, and renders the split view → `decideClaim` checks the pair's comparability and the photos' people-visible flags, then writes a `claim.confirmed` / `claim.rejected` / `claim.insufficient` event and updates the claim status in one SQLite transaction.
14. **Export** → `/cleanups/[id]/export` shows the preview and blockers → `GET /api/cleanups/[id]/export?format=html|json` loads confirmed claims and their receipts, refuses if a blocker remains, renders the pack, streams it as a download, and records an `export.downloaded` event.
15. **Publish** → `publishCleanup` checks the publication blockers, generates a new random `public_slug`, sets `public_enabled = 1`, and writes a `public.published` event → `/p/[slug]` renders the public evidence page with confirmed claims only.
16. **Import a real cleanup** → `npm run import -- ./imports/site/manifest.json` validates the manifest, sanitizes the photos through the same `ingestPhoto` path, creates the cleanup, pairs, photos, checks, and an `import_batches` row, writes a `cleanup.imported` event, and creates **zero claims**.

## Stack

| Layer | Choice | Version | Why | Docs |
|---|---|---|---|---|
| Runtime | Node.js | 24.21.0 (installed) | Already on the machine; one language for app and scripts. | https://nodejs.org/docs |
| Package manager | npm | 11.19.0 (installed) | `pnpm` is not installed; npm removes a setup step. Tradeoff: slower installs. | https://docs.npmjs.com |
| Framework | Next.js App Router | 16.4.3 | Server components for reads, server actions for writes, route handlers for uploads and downloads. | https://nextjs.org/docs |
| UI | React | 19.3.0 | Comes with Next; server/client component split fits the workspace. | https://react.dev |
| Language | TypeScript | 5.9.3 (pinned by `create-next-app`) | Types catch the claim/status mistakes that would corrupt the record. | https://www.typescriptlang.org/docs |
| Styling | Tailwind CSS | 4.3.3 | Fast custom styling; CSS-first `@theme` tokens, no config file. | https://tailwindcss.com/docs |
| Database | SQLite via `better-sqlite3` | 13.0.3 | One file, synchronous queries, no ORM. Tradeoff: hand-written SQL. | https://github.com/WiseLibs/better-sqlite3 |
| Validation | Zod | 4.6.7 | One schema for forms, server actions, and the import manifest. | https://zod.dev |
| Images | `sharp` | 0.35.5 | Metadata, orientation, sanitization, thumbnails, crops, pixel statistics; prebuilt binaries for Node 24. | https://sharp.pixelplumbing.com |
| Detector runtime | `onnxruntime-web` | 1.30.0 | WASM inference in a Web Worker; no GPU, no server. | https://onnxruntime.ai/docs/tutorials/web/ |
| Model | YOLO26n ONNX | 9,890,454 bytes, SHA-256 `cda08d9440217e243e075ee839f40383c59b3f973e493f9f6c7452922a69436e` | Small CPU detector; 2.4 M params; COCO classes. | https://huggingface.co/onnx-community/yolo26n-ONNX |
| Tests | Vitest | 5.0.5 | Pure-function tests for hashes, privacy, queue rules, import validation, export filtering. | https://vitest.dev |
| E2E | Playwright | 1.64.1 | One happy path and one insufficient-evidence path. | https://playwright.dev |
| Scripts | `tsx` | 4.23.15 | Run the importer and data scripts in TypeScript with the same lib code. | https://tsx.is |
| Fonts | Archivo, Newsreader, IBM Plex Mono | current Google Fonts | Grotesque UI, sharp record titles, mono receipts. Self-hosted at build time. | https://fonts.google.com |

**Detector license:** YOLO26 is AGPL-3.0. The repo is AGPL-3.0. The model file is fetched by a script, not committed.

**Unverified at spec time:** the exported ONNX file's expected preprocessing (letterbox vs direct resize) and exact output layout. The model card's processor resizes directly to 640×640 with no padding; Ultralytics normally trains with letterboxing. The first detector slice tests both on a real photo and keeps the one with stable boxes. This is the one genuine unknown in the build.

## Where It Runs and How Someone Tries It

**Local (the demo path):**

```bash
npm install
npm run fetch-model      # downloads the pinned ONNX file into public/models/
npm run dev              # http://localhost:3000
```

Open `/`, click **Open the app**, create the first display name, then create a cleanup. The app starts empty; there is no seed command. The database and `uploads/` are created under `./data` on first write.

Requirements: Node 24+, npm 11+, about 60 MB of disk for the model, plus the photo storage. No API keys. No GPU. No external services at runtime.

**Import a real cleanup (optional bulk path):**

```bash
npm run import -- ./imports/north-jetty/manifest.json
npm run import -- --dry-run ./imports/north-jetty/manifest.json
```

**Wipe local data (destructive):**

```bash
npm run data:wipe -- --yes
```

**Production container:**

```bash
docker build -t shoreproof .
docker run -p 3000:3000 -v shoreproof-data:/data shoreproof
```

`DATA_DIR` defaults to `./data` locally and `/data` in the container. The database and sanitized uploads must live on the same persistent volume.

**Hosted (optional):**

```bash
fly launch --no-deploy          # keep the committed fly.toml
fly volumes create shoreproof_data --size 1
fly secrets set WORKSPACE_PASSPHRASE="..." AUTH_SECRET="..."
fly deploy
```

One Machine, one volume mounted at `/data`, `min_machines_running = 1`, no autoscaling. The hosted workspace is gated by `WORKSPACE_PASSPHRASE`; the public page is public by design. Do not expose an ungated workspace with real photos.

**Recording:** 1440×900 Chrome window, local build, real first-party photos. The video shows the flow in `prd.md > The Core Journey`. No seeded demo record.

## Build Configuration

Scaffolded with `create-next-app` (Next 16.4.3) using TypeScript, Tailwind, the App Router, no `src/` directory, and the `@/*` import alias.

**`next.config.ts`:**

```ts
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self'; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'sharp'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
```

`better-sqlite3` and `sharp` are native modules; keeping them external stops Next's bundler from trying to trace their `.node` binaries. The CSP blocks third-party origins; `'unsafe-inline'` is present because Next's bootstrap scripts are inline, and `'wasm-unsafe-eval'` is required by ONNX Runtime Web.

**`package.json` scripts:**

| Script | Command | Used by |
|---|---|---|
| `dev` | `next dev` | local demo |
| `build` | `next build` | Docker, Fly |
| `start` | `next start` | Docker, Fly |
| `postinstall` | `node scripts/copy-ort.mjs` | after `npm install` |
| `fetch-model` | `node scripts/fetch-model.mjs` | setup, Docker build |
| `import` | `tsx scripts/import.ts` | bulk real records |
| `data:wipe` | `node scripts/data-wipe.mjs` | local reset |
| `test` | `vitest run` | mechanical verification |
| `test:e2e` | `playwright test` | final verification |

`postinstall` only copies ONNX Runtime's WASM files into `public/ort/`, so it cannot fail the install when the model is absent. `fetch-model` stays separate because it is a 9.9 MB network download with a checksum check.

**Environment variables:**

| Variable | Default | Meaning |
|---|---|---|
| `DATA_DIR` | `./data` | Directory holding `shoreproof.db` and `uploads/`. Docker sets `/data`. |
| `SITE_URL` | `http://localhost:3000` | Absolute base for public-page links and exports. |
| `WORKSPACE_PASSPHRASE` | unset | If set, the app routes require a login cookie. Public site and `/p/[slug]` stay public. |
| `AUTH_SECRET` | unset | Required when `WORKSPACE_PASSPHRASE` is set; signs the session cookie. |
| `PORT` | `3000` | Container only. |

No other secrets. `.env.example` documents the variables and is committed; `.env*` stays ignored.

**`.gitignore` adds** the build and data paths while preserving the existing privacy rules: `node_modules/`, `.next/`, `out/`, `data/`, `imports/`, `public/models/`, `public/ort/`, `test-results/`, `playwright-report/`, `coverage/`, `*.db`, `*.db-shm`, `*.db-wal`.

**Dockerfile shape:** a `node:24-bookworm-slim` builder installs `python3`, `make`, and `g++` (needed only if `better-sqlite3` has no matching prebuilt binary), then runs `npm ci`, `npm run fetch-model`, and `npm run build`; the runtime stage copies `node_modules`, `.next`, `public`, `package.json`, and `next.config.ts`, creates `/data`, and runs `npm start`. Copying full `node_modules` is deliberate: a larger image than a standalone trace, but far fewer native-module surprises with `better-sqlite3` and `sharp` on the first deploy.

**`middleware.ts`:** if `WORKSPACE_PASSPHRASE` is set, protect `/cleanups`, `/review`, `/settings`, `/setup`, `/api/pairs`, and `/api/cleanups`. Redirect page requests to `/login?next=...`; return 401 for API requests. Do not protect `/`, the `(site)` pages, `/p/[slug]`, or `/api/photos`. If the passphrase is set without `AUTH_SECRET`, fail fast at startup with one line naming the missing variable.

## Look and Feel

Carried forward from `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`.

- **Palette tokens:** `--color-salt #F3F5F1`, `--color-ink #0E2433`, `--color-tide #1C6B70`, `--color-flag #E4572E`, `--color-flag-ink #A63A1C`, `--color-line #C6D1D2`, `--color-muted #5A6A6D`, `--color-wash #E6EDEB`. No green gradients, no glassmorphism, no beige paper.
- **Type:** `Archivo` for UI, `Newsreader` for record titles, `IBM Plex Mono` for IDs, hashes, timestamps, and receipt fields, loaded with `next/font/google` and exposed as CSS variables. Weights: Archivo 400/500/600/700, Newsreader 400/500/600, IBM Plex Mono 400/500.
- **Density:** spacious around photos, dense inside receipts. The compare canvas is the widest element; the evidence rail is 360 px on desktop and stacks below 900 px.
- **Shape:** 2 px radii, hairline rules, no drop shadows. Confirmed chips look like a stamp: uppercase mono, 1 px border, slight letter-spacing.
- **Receipt:** a salt-white card with a perforated top edge (`radial-gradient` circles), a punched hole, mono field labels, a rotated stamp, and a short hash strip. It is the same component in the app, the export, and the public page.
- **Tide-line divider:** an inline SVG wave path with `stroke="var(--color-line)"`. The home page draws it once with `stroke-dashoffset`; every other page shows it static.
- **Survey grid:** a 12-column hairline grid on the home page hero and the receipt anatomy section only. It is a background, not a border around every card.
- **Motion:** the compare slider is direct manipulation. A decision stamps in with a 180 ms scale from 1.06 to 1 and a 2° rotation settle. The tide-line draws once. `prefers-reduced-motion` removes both.
- **Copy tone:** "confirmed by", "checked at", "not included", "needs another photo", "metadata stripped". Never "AI-certified", "100% clean", "verified beach".
- **Responsive:** below 900 px the compare canvas becomes Before/After tabs; the evidence rail stacks; the review split view becomes queue → claim. The public site nav collapses to a `<details>` menu with no client JavaScript.

## Components

### First-Run Setup and People

What it does: creates the first local person and manages the small people list.

- `/setup` checks `countUsers()`. If users exist, it redirects to `/cleanups`. Otherwise it renders a form with **display name** (1–80 characters, unique), **role** (Collector, Reviewer, Both), and a required privacy acknowledgement.
- `createFirstUser` validates with Zod, inserts one `users` row, sets the `shoreproof_user_id` cookie, and redirects to `/cleanups`.
- `/settings` lists people and has an **Add person** form with the same fields. Display names are unique; there is no delete.
- `switchUser` validates the target user and sets the cookie. The header shows the current display name.
- `requireUser()` returns the cookie user or the first user; if there are no users, it redirects to `/setup`.

Talks to: `app/setup/page.tsx`, `app/(app)/settings/page.tsx`, `lib/users.ts`, `app/actions.ts`, `lib/validation.ts`.

PRD ref: `prd.md > Features and Behavior > First-Run Setup and People`.

Notes: no passwords, no roles enforcement beyond labels. The optional workspace passphrase is separate and gates the whole workspace. `cookies()` is async in Next 16.

Verify: a fresh `DATA_DIR` redirects to `/setup`; creating a person opens the empty cleanup list; adding a second person makes them available in the switcher; switching users changes the actor on a saved claim.

### App Shell and Identity

What it does: renders the app top bar (wordmark, Cleanups, Review, Settings, Public site, user switcher), the salt background, and the local-mode banner. Resolves the current user from the `shoreproof_user_id` cookie.

Talks to: `app/(app)/layout.tsx`, `components/app-shell.tsx`, `components/user-switcher.tsx`, `lib/users.ts`, `app/actions.ts`.

PRD ref: `prd.md > Screens and Layout`, `prd.md > States and Boundaries` (identity).

Notes: the public site has its own header and footer; the app shell never renders marketing navigation. If `NODE_ENV=production` and `WORKSPACE_PASSPHRASE` is unset, show a dismissible banner: "No workspace passphrase set. Do not expose this instance."

Verify: switching users changes the name in the header and the reviewer name on decisions; the app shell is absent from `/`, `/how-it-works`, and `/p/[slug]`.

### Cleanup List and Creation

What it does: lists cleanups newest first with site, date, lead display name, pair count, confirmed claim count, derived status chip, and public-page status. **New cleanup** opens `/cleanups/new`.

Talks to: `app/(app)/cleanups/page.tsx`, `app/(app)/cleanups/new/page.tsx`, `createCleanup` in `app/(app)/cleanups/actions.ts`, `lib/cleanups.ts`.

PRD ref: `prd.md > Features and Behavior > Cleanups`.

- `createCleanup` schema: `site` 1–120, `date` ISO date not in the future, `conditions` ≤ 2000 optional, `public_note` ≤ 2000 optional, `consent` literal `true`.
- The action inserts `consent_attested_by = currentUser.id`, `consent_attested_at = now`, `consent_version = '2026-10-24'`, generates a unique `public_slug`, and writes `cleanup.created`.
- Status derivation, in order: `Exported` if any export exists; else `In review` if any pending or insufficient claim; else `Reviewed` if any confirmed or rejected claim; else `Draft`. An `insufficient` claim keeps the record **In review** because the collector still owes another photo.
- Empty state: "No cleanups yet. Create one, or import a real cleanup with `npm run import`." No demo link.

Verify: creating a cleanup adds a row and navigates to it; a future date is rejected; missing consent is rejected; the empty state appears on a fresh database; status chips match the claim states.

### Cleanup Record

What it does: shows the header (site, date, lead display name, conditions, public note, reviewers), pair cards with before/after thumbnails, claim counts, the public-page panel, and the actions **Add pair**, **Submit all complete pairs**, **Export**.

Talks to: `app/(app)/cleanups/[id]/page.tsx`, `createPair`, `submitAllPairs`, `publishCleanup`, `unpublishCleanup` actions, `lib/pairs.ts`, `lib/privacy.ts`.

PRD ref: `prd.md > Features and Behavior > Cleanups`, `prd.md > Features and Behavior > Evidence pack and public page`.

- Pair card: before/after thumbnails, label, comparability chip, claim counts, privacy warning if either photo is people-visible.
- **Submit all complete pairs** submits every pair that has both photos, a comparability state, and at least one complete claim; it names any skipped pair and why.
- **Public page panel:** status, URL when published, copy button, **Publish** / **Unpublish**, and the blocker list with links.
- Export stays available with zero confirmed claims; the pack says so.

Verify: a pair card links to its workspace; **Submit all complete pairs** skips an incomplete pair with a visible reason; publishing is blocked until a confirmed claim exists; unpublishing makes the old URL 404.

### Pair Workspace

What it does: the core screen. A large compare canvas on the left, a 360 px evidence rail on the right with **Privacy**, **Preflight**, **AI suggestions**, **Claim**, and **Comparability** panels. The photo rail sits under the canvas with Before and After slots. A **Capture → Mark → Compare → Submit** stepper sits above the canvas.

Talks to: server component `app/(app)/cleanups/[id]/pairs/[pairId]/page.tsx`; client components `compare-canvas.tsx`, `region-editor.tsx`, `photo-rail.tsx`, `preflight-panel.tsx`, `privacy-panel.tsx`, `suggestion-panel.tsx`, `comparability-panel.tsx`, `claim-form.tsx`, `stepper.tsx`; actions in `app/(app)/cleanups/actions.ts`.

PRD ref: `prd.md > Screens and Layout`, `prd.md > Features and Behavior > Regions and observations`, `prd.md > Features and Behavior > Photos, privacy, and preflight`.

- Stepper state is derived: **Capture** complete when the before photo exists; **Mark** complete when at least one claim has a region, text, and category; **Compare** complete when the after photo exists and comparability is set; **Submit** complete when every claim is pending or decided and the pair has been submitted.
- Claim form: observation text 1–280 characters, a required ICC category (the 12-item list in `prd.md > Features and Behavior > Regions and observations`, plus **Not sure**), and **Save draft**. The server rejects a claim without a region, text, or category.
- The claim list shows drafts and submitted claims; a draft can be selected for editing or removed. Confirmed and pending claims are read-only.
- The privacy panel is always visible: metadata stripped, people-visible status, public-use status.

Verify: the whole loop from upload to submit works without leaving the screen; the compare slider is keyboard-operable; the selected claim's region is visible on the photo; the stepper matches the pair's real state.

### Preflight Engine and Photo Privacy

What it does: sanitizes the upload, computes the five photo checks, and enforces the privacy gate.

**Sanitize (`lib/privacy.ts`):**

```ts
const output = await sharp(input, { limitInputPixels: 40_000_000, failOn: 'error' })
  .rotate()
  .jpeg({ quality: 82, mozjpeg: true })
  .toBuffer({ resolveWithObject: true });
```

- `original_sha256 = sha256(input)`; `sha256 = sha256(output.data)`.
- The original bytes are never written to disk. Only `output.data` and a 640 px thumbnail are stored.
- `sharp` drops EXIF/GPS by default. The implementation verifies with `sharp(output.data).metadata()` that `exif` and `gps` are absent; if either is present, the upload fails rather than storing metadata.
- Orientation is applied before the hash, so the stored image and the displayed image agree.
- The stored MIME is `image/jpeg`; the original MIME is not retained.

**Checks (`lib/preflight.ts`):**

- `sharp` metadata; grayscale 1024 px raw buffer; Laplacian variance; exposure share at ≤8 and ≥247; 9×8 dHash; near-duplicate comparison against current photos in the same cleanup.
- **Browser provisional path** (`lib/preflight-client.ts`): `createImageBitmap(file, { imageOrientation: 'from-image' })` + canvas; SHA-256 via `crypto.subtle`; same dHash and Laplacian math. Shown immediately, replaced by server values after upload.
- **Runtime:** the upload route declares `export const runtime = 'nodejs'`; `sharp` and `better-sqlite3` cannot run on the Edge runtime.

**Thresholds:** blur warn < 100, exposure warn > 25%, resolution warn < 1280 px long edge, near-duplicate warn at Hamming ≤ 8, similar at 9–14. `blur_score` is raw Laplacian variance; `exposure_clipped` is stored as a 0–1 fraction and displayed as a percentage. Upload limits: 20 MB, JPEG/PNG/WebP only; HEIC is rejected with the iPhone hint.

**Ingest (`lib/photos.ts`):** one function used by the upload route and the importer.

1. Load the pair and cleanup; require `consent_attested_at`.
2. If replacing a current photo, refuse when that photo is the source of a confirmed claim.
3. Sanitize; compute checks; compare dHash against current photos in the same cleanup.
4. Write the sanitized file and thumbnail atomically.
5. In one transaction: mark the previous current photo on that side `superseded_at`, insert the new `photos` row, write `photo.uploaded`.
6. Return the photo; on failure, delete any written files.

**Serving:** `/api/photos/[photoId]` and `/api/photos/[photoId]/thumb` serve only the sanitized files, with `Content-Type: image/jpeg`, `Content-Disposition: inline; filename="shoreproof-photo.jpg"`, `Cache-Control: private, max-age=0, must-revalidate`, and `X-Content-Type-Options: nosniff`. There is no original-file route. Original filenames are not stored.

Talks to: `app/api/pairs/[pairId]/photos/route.ts`, `lib/photos.ts`, `lib/privacy.ts`, `lib/preflight.ts`, `lib/preflight-client.ts`, `lib/storage.ts`, `preflight-panel.tsx`, `privacy-panel.tsx`.

PRD ref: `prd.md > Features and Behavior > Photos, privacy, and preflight`.

Verify: a deliberately blurred image warns but still uploads; replacing the file re-runs every check; a JPEG with GPS EXIF produces a stored file with no `exif` or `gps`; the stored hash matches the served bytes; the original hash differs; HEIC is rejected; a confirmed claim's source photo cannot be replaced; the thumb route returns an image.

### Detector Worker (YOLO26n)

What it does: loads `public/models/yolo26n.onnx` once, runs one inference per **Suggest candidates** click, and returns normalized boxes. `lib/detector/detect.ts` sets `ort.env.wasm.wasmPaths = '/ort/'` and `ort.env.wasm.numThreads = 1` before creating the session, so no CDN is contacted and the worker does not depend on `SharedArrayBuffer` or COOP/COEP headers. SIMD is used when the browser provides it.

Protocol:

```ts
// main → worker
{ type: 'detect', bitmap: ImageBitmap }
// worker → main
{ type: 'progress', loaded: number, total: number }
{ type: 'result', boxes: Box[], runtimeMs: number, input: [number, number] }
{ type: 'error', message: string }
```

Preprocessing (verified on a real litter photo): the model's `preprocessor_config.json` sets `do_pad: false`, `do_resize: true`, `size: 640 × 640`, `do_rescale: true`, so the bitmap is drawn straight to a 640 × 640 `OffscreenCanvas` with **no letterbox padding**, then read as RGB, transposed to CHW, and scaled to 0–1. A side-by-side check on the same public-domain bottle photo found the bottle at 0.59 with a direct resize and **no box at all** with letterbox padding, so direct resize is the shipped path.

Output parsing (verified against the real ONNX file): this export returns **two** outputs, not one fused tensor — `logits [1, 300, 80]` holds raw class logits and `pred_boxes [1, 300, 4]` holds normalized `cx, cy, w, h`. The class score is `sigmoid(max logit)` over the 80 COCO classes; the box is `cx ± w/2`, already normalized to the input image, which maps straight back to the photo because the resize is a plain stretch. The parser also accepts the fused shape assumed in the first draft of this spec — `[1, 300, 6]` rows of `[x1, y1, x2, y2, score, classId]` and the transposed `[1, 6, 300]` — so a future export cannot silently break the panel. Filter `score ≥ 0.35`, clamp to the image, grow anything smaller than the 2% minimum region, sort by score, keep the top 20. There is no NMS: this YOLOS-style model is NMS-free.

Mapping: `lib/detector/coco.ts` holds the 80 names; `lib/detector/icc.ts` maps only bottle → Beverage Bottles (Plastic), wine glass → Glass Beverage Bottles, cup/bowl → Cups & Plates, fork/knife/spoon → Cups & Plates with `mapping_uncertain = 1`. Everything else is `null`.

Talks to: `workers/detector.worker.ts`, `lib/detector/detect.ts`, `suggestion-panel.tsx`, `saveSuggestions` action.

PRD ref: `prd.md > Features and Behavior > AI suggestions`.

Verify: on a real litter photo, at least one real bottle is detected and one false positive appears; the box outline lands on the object; the panel shows the model hash and runtime. If the worker fails to bundle, fall back to a plain `public/detector.worker.js` with the same protocol.

**Verified in the browser:** a public-domain beach bottle photo (`File: A bottle found at the beach.jpg`, CC BY 2.0, test fixture only) was ingested through the app's own sanitizing upload path; the in-browser worker returned one box at confidence 0.66 that landed exactly on the bottle; accepting it created a draft claim with the same normalized region and the `suggestion_id`; a second run on another pair was rejected with a reason and created no claim; with the model file removed the panel showed "Detector not loaded. Check `npm run fetch-model`" and the manual marking path kept working.

### Region Editor and Compare Canvas

What it does: draws, moves, and resizes rectangles on the before photo; shows all claim regions with the selected one highlighted; compares before and after with a draggable wipe.

Implementation: a relatively positioned image wrapper; an absolutely positioned SVG overlay in normalized coordinates (`viewBox="0 0 1 1"` with `preserveAspectRatio="none"`); pointer events for draw/move/resize; arrow keys nudge by 0.002; **Mark full photo** sets `0,0,1,1` as the keyboard fallback. Minimum region 0.02 × 0.02. The compare canvas clips the after image with `clip-path: inset(0 0 0 X%)` driven by a range input.

**Layout decision (slice 5):** the marking surface and the wipe are two separate blocks in the workspace — the before photo with the region overlay stays on top, and the before/after wipe sits below the photo slots as its own `CompareCanvas`. Overlaying the after image on the before photo would hide the regions the collector is drawing, and the claim always points at the before photo anyway. The wipe divider is draggable with a pointer and movable with the arrow keys through its range control.

The before image is the claim source. The after image is comparison evidence; the server rejects a claim pointing at an after photo.

Talks to: `compare-canvas.tsx`, `region-editor.tsx`, `lib/region.ts`.

PRD ref: `prd.md > Features and Behavior > Regions and observations`.

Verify: a region drawn at any display size stores the same normalized coordinates; resizing the window does not move it; the compare slider works with arrow keys; **Mark full photo** works without a pointer.

### Suggestion Layer

What it does: renders dashed boxes over the photo, one card per box with class, confidence, tentative ICC category, and **Accept**, **Edit box then accept**, **Reject**.

Accept calls `acceptSuggestion`, which creates a draft claim with the box's region, the mapped category (or none), and `source_suggestion_id`; the claim form opens for the observation text. Reject records one of three reasons. The panel always shows: "YOLO26n · COCO classes only — absence of a box is not evidence of absence."

No accept-all. Unmapped classes disable Accept until a category is chosen.

Talks to: `suggestion-panel.tsx`, `lib/suggestions.ts`, actions in `app/(app)/cleanups/actions.ts`.

PRD ref: `prd.md > Features and Behavior > AI suggestions`.

Verify: accepted box → claim exists with the same normalized region and a source id; rejected box → no claim and a rejection event; untouched box → `open` and counted as untouched in the disclosure.

### Comparability Panel

What it does: shows the framing signal and captures the human state.

Framing signal: 8×8 mean-luminance grids for both photos; `gridSim = 1 - meanAbsDiff/255`; `aspectSim = 1 - |ratioA - ratioB| / max(ratioA, ratioB)`; `score = round(100 * (0.7 * gridSim + 0.3 * aspectSim))`. Words: ≥80 similar, 50–79 shifted, <50 very different. Stored with the sub-scores in `framing_detail`.

State: **Comparable**, **Partially comparable**, **Not comparable**. A reason is required for the latter two. `Not comparable` disables Confirm in review until the state changes with a reason. A people-visible photo in the pair also disables Confirm.

**Blocker levels (slice 5):** `getPairBlockers` returns two levels. *Blockers* stop a pair from being submitted: a missing before or after photo, no comparability decision, no claims, or a claim missing its region, observation, or category. *Warnings* do not stop submission but stop a later confirmation: a people-visible current photo and a `Not comparable` state. This matches the PRD, which ties people-visible to confirmation, export, and publishing rather than to submission — the workspace shows the warning before the collector sends the pair to a reviewer.

Talks to: `comparability-panel.tsx`, `lib/framing.ts`, `setComparability` action.

PRD ref: `prd.md > Features and Behavior > Comparability`.

Verify: two crops of the same scene score high; a different scene scores low; changing the state writes an event with the actor and reason; the panel says "signal, not a verdict".

### Review Queue

What it does: split view with pending claims on the left and the selected claim on the right. A top strip shows claims returned to collectors, with links. Flags are text, not icons alone.

Priority (`lib/queue.ts`, lower runs first): `no_region` 10, `not_comparable` 20, `people_visible` 25, `near_duplicate` 30, `absolute_wording` 40, `low_resolution` 50, `self_reviewed` 60, `ai_box_unedited` 70, none 100. Ties by `claims.created_at` ascending.

Flags: no region; pair `not_comparable`; either current photo in the pair has `people_visible = 1`; photo `near_duplicate_of` set; regex `\b(entire|all|none|every|completely|fully|clean)\b`; long edge < 1280; reviewer id equals collector id; `suggestion_id` set and `suggestions.edited = 0`.

Talks to: `app/(app)/review/page.tsx`, `app/(app)/review/[claimId]/page.tsx`, `review-queue.tsx`, `lib/queue.ts`.

PRD ref: `prd.md > Features and Behavior > Review`.

Verify: pending claims render in the documented order; a `not_comparable` claim sits above a plain one; a people-visible claim sits above a near-duplicate; the reason text is visible without hovering.

### Claim Review and Decisions

What it does: shows before and after crops with the region outlined, the observation, category, comparability, privacy status, preflight results, AI provenance, collector display name, and four actions.

- **Confirm** — optional note; status `confirmed`; locks the claim. Server refuses when the pair is `not_comparable` or either current photo is people-visible.
- **Edit and confirm** — creates a new claim row with `revision + 1`, `supersedes_id` set, status `confirmed`; the old row becomes `superseded`; one transaction, two events.
- **Revise** (on a confirmed claim) — creates a new `draft` revision with `supersedes_id` set. The old claim stays `confirmed` and remains in the export until the revision is confirmed; then the old row becomes `superseded` in the same transaction.
- **Reject** — reason required; status `rejected`.
- **Insufficient evidence** — reason required; status `insufficient`; the collector sees it in the returned strip and can add a replacement photo.

The server re-checks that the claim is still `pending` before deciding; if another tab already decided it, the action returns "This claim was already decided by X." It also re-checks the pair's comparability and the photos' privacy flags; the UI is not the only gate.

Talks to: `claim-review.tsx`, `decideClaim` and `reviseClaim` in `app/(app)/review/actions.ts`, `lib/claims.ts`, `lib/privacy.ts`.

PRD ref: `prd.md > Features and Behavior > Review`.

Verify: confirm locks the form; revise keeps v1 visible in the audit log; a decided claim cannot be decided twice; `not_comparable` blocks confirm; a people-visible photo blocks confirm; a confirmed claim's source photo cannot be replaced.

### Evidence Pack

What it does: renders the export preview and the public page from the same data, in two modes.

- **Export mode:** cover, method, confirmed claims with crops and receipts, excluded-claims appendix (rejected + insufficient, with reasons), AI disclosure, audit log.
- **Public mode:** cover, method (including the detector disclosure), confirmed claims with receipts. No excluded appendix, no internal conditions, no audit log.

Receipt shape:

```ts
type Receipt = {
  claimId: string; revision: number;
  source: {
    photoId: string;
    sha256: string;          // sanitized bytes, the served image
    originalSha256: string;  // uploaded bytes, never retained
    width: number; height: number;
  };
  region: { x: number; y: number; w: number; h: number };
  comparability: { state: 'comparable' | 'partial'; reason: string | null };
  decisionNote: string | null;
  cropDataUri: string;
  collector: { displayName: string };
  reviewer: { displayName: string };
  decidedAt: string;
  decision: 'confirmed';
  checks: { blurScore: number; exposureClipped: number; resolution: [number, number]; dhash: string };
  suggestion: { id: string; model: string; className: string; confidence: number } | null;
};
```

**Blockers (`lib/privacy.ts`):**

- `exportBlockers(cleanupId)` returns a list when a confirmed claim's source photo is missing, superseded, or `people_visible = 1`; when its pair is not `comparable` or `partial`; or when the region, text, or category is missing.
- `publicBlockers(cleanupId)` adds "no confirmed claims" and returns the same list.
- The export route returns `409` with the blockers instead of shipping a broken or private receipt.
- The public page route returns 404 unless `public_enabled = 1` and the slug matches.

**Downloads:** `GET /api/cleanups/[id]/export?format=html` and `?format=json`. HTML is self-contained: inline CSS, system fonts, 640 px crops as base64 JPEG (quality 72). JSON uses `schema: "shoreproof.export.v1"`. Both set `Content-Disposition: attachment; filename="shoreproof-record-<short-id>.<ext>"`. The HTML template escapes every user string with `escapeHtml`.

**Publish:** `publishCleanup` runs `publicBlockers`, generates a new `public_slug` from `crypto.randomBytes(9).toString('base64url')`, sets `public_enabled = 1` and `public_published_at`, and writes `public.published`. `unpublishCleanup` sets `public_enabled = 0`, regenerates the slug, and writes `public.unpublished`. The public page is `noindex, nofollow` and uses `SITE_URL` for absolute links.

Talks to: `components/evidence-pack.tsx`, `components/receipt.tsx`, `lib/export.ts`, `lib/html.ts`, `lib/privacy.ts`, `app/api/cleanups/[id]/export/route.ts`, `app/(app)/cleanups/[id]/export/page.tsx`, `app/p/[slug]/page.tsx`.

PRD ref: `prd.md > Features and Behavior > Evidence pack and public page`.

Verify: a rejected claim is absent from the public page and present in the export appendix; the HTML opens offline with images visible; every receipt hash matches the stored sanitized photo; a claim with a missing source file fails the export loudly; a people-visible photo blocks both export and publish; unpublishing makes the old URL 404.

### Real Record Importer

What it does: creates a real cleanup, pairs, sanitized photos, preflight results, and an import audit row from a JSON manifest and a folder of photos. It never creates claims.

**Manifest schema (`lib/import.ts`, Zod `.strict()` at every level):**

```ts
const Manifest = z.object({
  schema: z.literal('shoreproof.import.v1'),
  cleanup: z.object({
    external_id: z.string().min(1).max(80).regex(/^[a-z0-9][a-z0-9-]*$/),
    site: z.string().min(1).max(120),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    lead: z.string().min(1).max(80),
    conditions: z.string().max(2000).optional(),
    public_note: z.string().max(2000).optional(),
  }).strict(),
  consent: z.object({
    attested: z.literal(true),
    by: z.string().min(1).max(80),
    note: z.string().min(1).max(500),
  }).strict(),
  pairs: z.array(z.object({
    label: z.string().min(1).max(120),
    before: z.string().min(1),
    after: z.string().min(1),
    before_people_visible: z.boolean().default(false),
    after_people_visible: z.boolean().default(false),
  }).strict()).min(1).max(50),
}).strict();
```

**Validation and behavior:**

- Reject unknown keys at every level. A manifest with `claims`, `observations`, `comparability`, or `review` is rejected before any write.
- Require `consent.attested === true`. Resolve or create the consenting person and the lead by display name; a new person gets the `collector` role.
- Resolve each photo path against the manifest directory with `fs.realpath`; reject absolute paths, `..` escapes, symlinks, non-files, files over 20 MB, and extensions outside `.jpg/.jpeg/.png/.webp`.
- Reject a future cleanup date.
- Compute `manifest_sha256` over the raw manifest bytes. If an `import_batches` row already has it, print "Already imported" and exit 0. If `cleanups.external_id` exists with a different manifest, exit non-zero with a clear message.
- Sanitize and ingest each before/after photo through `ingestPhoto` with the lead as the uploader and the manifest's `people_visible` flag.
- Reject a pair whose before and after have the same `sha256` or dHash Hamming distance 0.
- Compute and store the framing signal. Do **not** set comparability; that is a human decision in the app.
- Insert one `import_batches` row (`manifest_sha256`, pair count, photo count, actor) and one `cleanup.imported` event.
- `--dry-run` validates everything and prints the plan without writing.
- The summary prints: cleanup id, pairs, photos, warnings (blur, exposure, low resolution, people-visible), and the next URL (`/cleanups/[id]`).
- `imports/` is gitignored; `docs/import-manifest.example.json` is the committed schema example.

Talks to: `lib/import.ts`, `scripts/import.ts`, `lib/photos.ts`, `lib/privacy.ts`, `lib/validation.ts`, `docs/import-manifest.example.json`.

PRD ref: `prd.md > Features and Behavior > Real records and import`.

Verify: importing a real two-pair manifest creates the cleanup, pairs, and photos with zero claims and zero suggestions; a second run skips; a manifest with a `claims` key is rejected; `../` and symlink paths are rejected; missing consent is rejected; an exact duplicate pair is rejected; a GPS-tagged photo produces a sanitized file with no GPS; `--dry-run` writes nothing.

### Public Site

What it does: renders seven server-rendered pages with a site header, footer, survey grid, tide-line divider, and the receipt component.

- Route group `app/(site)/` with `layout.tsx`, `page.tsx`, `how-it-works/page.tsx`, `evidence/page.tsx`, `for-organizers/page.tsx`, `for-reviewers/page.tsx`, `privacy/page.tsx`, `about/page.tsx`.
- `components/site/site-header.tsx`, `site-footer.tsx`, `tide-divider.tsx`, `field-label.tsx`, `survey-grid.tsx`, `receipt-anatomy.tsx`.
- The home page uses a real receipt **anatomy** card with labelled fields and redacted values, not a fabricated claim. If a real published record exists, link to it; do not embed user data in the static pages.
- `/about` cites the Bittu Tabahi / Ajnar River cleanup with an external link and a note that it is a case study, not app data. No embedded video, no downloaded frames.
- No fake testimonials, invented counts, stock cleanup photo presented as a record, third-party analytics, or runtime font/script calls.
- The mobile nav uses `<details>`; the rest is server-rendered. All pages have metadata, one `<h1>`, semantic landmarks, and visible focus states.
- The site links to `/cleanups` as **Open the app** and to `/privacy` in the footer.

Talks to: `app/(site)/*`, `components/site/*`, `components/receipt.tsx`, `lib/site.ts`.

PRD ref: `prd.md > Features and Behavior > Public site`, `prd.md > Look and Feel`.

Verify: every public route returns 200; every nav link resolves; no page contains "demo", "AI-certified", "100% clean", or an invented count; the layout works at 360 px; the receipt anatomy is readable without color; the case-study link opens the original source in a new tab with `rel="noopener noreferrer"`.

### Privacy and Data Lifecycle

What it does: the shared rules and helpers that keep the app honest.

**Data map:**

| Data | Where | Public? |
|---|---|---|
| Display name, role | `users` | Display name and role appear on the public page for confirmed claims |
| Site label, date, public note | `cleanups` | Yes, when published |
| Conditions | `cleanups.conditions` | No; internal only |
| Sanitized photos, thumbnails | `${DATA_DIR}/uploads` | Only via `/api/photos/[id]`; no original route |
| Original upload bytes | Never stored | No |
| `original_sha256`, `sha256` | `photos` | `sha256` in the public receipt; both in the JSON export |
| Claims, regions, decisions | `claims`, `events` | Confirmed claims only on the public page |
| Rejected/insufficient claims | `claims`, `events` | Export appendix only |
| Import manifest | Outside git; `imports/` ignored | No |
| Workspace passphrase | Environment | No |

**Rules:**

- No email, phone, address, GPS, coordinates, analytics identifiers, or legal names are collected.
- Consent is required at cleanup creation and import; `lib/privacy.ts` exposes `assertConsent(cleanup)`.
- `sanitizeImage` is the only way a photo enters storage. It returns `originalSha256`, `sha256`, width, height, and the sanitized buffer. It verifies metadata is gone.
- `people_visible = 1` blocks confirm, export, and publish. There is no override in the POC.
- `publicBlockers` and `exportBlockers` are the single source of truth for what can ship.
- Public page: `public_enabled = 1`, a matching random slug, display names only, confirmed claims only, `noindex`, no conditions, no audit log.
- Unpublish regenerates the slug. Republish creates a new link.
- The optional passphrase gates the app routes, not the public page. `AUTH_SECRET` signs the session cookie.
- `npm run data:wipe -- --yes` deletes `shoreproof.db`, `uploads/`, and `public/models/`? No: it deletes the database and uploads, not the model. It prints what it removed.
- The `/privacy` page states the limits: not anonymous, no automatic face blur, no per-user auth, hosted operator owns retention.

Talks to: `lib/privacy.ts`, `lib/auth.ts`, `middleware.ts`, `app/(site)/privacy/page.tsx`, `app/(app)/settings/page.tsx`, `scripts/data-wipe.mjs`.

PRD ref: `prd.md > Features and Behavior > Privacy and consent`, `prd.md > States and Boundaries`.

Verify: a JPEG with GPS EXIF produces a stored file with no `exif` or `gps`; the original filename never appears in the database or a response; `publicBlockers` lists a people-visible photo; unpublishing changes the slug; the passphrase gate protects `/cleanups` but not `/p/[slug]`; the data wipe removes the database and uploads.

## Data Model

SQLite file at `${DATA_DIR}/shoreproof.db`. `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`. `db.ts` applies `lib/schema.sql` once inside a transaction and records `PRAGMA user_version = 1`; later starts see the version and skip it. All DDL is written with `IF NOT EXISTS` as a second guard.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('collector','reviewer','both')),
  created_at TEXT NOT NULL
);

CREATE TABLE cleanups (
  id TEXT PRIMARY KEY,
  external_id TEXT UNIQUE,
  public_slug TEXT NOT NULL UNIQUE,
  site TEXT NOT NULL,
  date TEXT NOT NULL,
  lead_id TEXT NOT NULL REFERENCES users(id),
  conditions TEXT,
  public_note TEXT,
  consent_attested_by TEXT NOT NULL REFERENCES users(id),
  consent_attested_at TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  public_enabled INTEGER NOT NULL DEFAULT 0 CHECK (public_enabled IN (0,1)),
  public_published_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE pairs (
  id TEXT PRIMARY KEY,
  cleanup_id TEXT NOT NULL REFERENCES cleanups(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  comparability TEXT CHECK (comparability IN ('comparable','partial','not_comparable')),
  comparability_reason TEXT,
  comparability_by TEXT REFERENCES users(id),
  comparability_at TEXT,
  framing_score INTEGER,
  framing_detail TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  pair_id TEXT NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('before','after')),
  stored_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  original_sha256 TEXT NOT NULL,
  dhash TEXT NOT NULL,
  blur_score REAL NOT NULL,
  exposure_clipped REAL NOT NULL,
  near_duplicate_of TEXT REFERENCES photos(id),
  near_duplicate_distance INTEGER,
  people_visible INTEGER NOT NULL DEFAULT 0 CHECK (people_visible IN (0,1)),
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  superseded_at TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX one_current_photo_per_side
  ON photos(pair_id, side) WHERE superseded_at IS NULL;

CREATE TABLE model_runs (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  model_sha256 TEXT NOT NULL,
  runtime_ms INTEGER NOT NULL,
  box_count INTEGER NOT NULL,
  input_width INTEGER NOT NULL,
  input_height INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE suggestions (
  id TEXT PRIMARY KEY,
  photo_id TEXT NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  run_id TEXT NOT NULL REFERENCES model_runs(id) ON DELETE CASCADE,
  x REAL NOT NULL, y REAL NOT NULL, w REAL NOT NULL, h REAL NOT NULL,
  coco_id INTEGER NOT NULL,
  coco_class TEXT NOT NULL,
  confidence REAL NOT NULL,
  icc_category TEXT,
  mapping_uncertain INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','accepted','rejected')),
  edited INTEGER NOT NULL DEFAULT 0,
  reject_reason TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE claims (
  id TEXT PRIMARY KEY,
  pair_id TEXT NOT NULL REFERENCES pairs(id) ON DELETE CASCADE,
  photo_id TEXT NOT NULL REFERENCES photos(id),
  suggestion_id TEXT REFERENCES suggestions(id),
  x REAL, y REAL, w REAL, h REAL,
  text TEXT NOT NULL DEFAULT '',
  category TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending','confirmed','rejected','insufficient','superseded')),
  revision INTEGER NOT NULL DEFAULT 1,
  supersedes_id TEXT REFERENCES claims(id),
  collector_id TEXT NOT NULL REFERENCES users(id),
  decided_by TEXT REFERENCES users(id),
  decided_at TEXT,
  decision_note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  cleanup_id TEXT NOT NULL REFERENCES cleanups(id) ON DELETE CASCADE,
  actor_id TEXT REFERENCES users(id),
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TRIGGER events_no_update BEFORE UPDATE ON events
BEGIN SELECT RAISE(ABORT, 'events are append-only'); END;
CREATE TRIGGER events_no_delete BEFORE DELETE ON events
BEGIN SELECT RAISE(ABORT, 'events are append-only'); END;

CREATE TABLE exports (
  id TEXT PRIMARY KEY,
  cleanup_id TEXT NOT NULL REFERENCES cleanups(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('html','json')),
  created_at TEXT NOT NULL
);

CREATE TABLE import_batches (
  id TEXT PRIMARY KEY,
  cleanup_id TEXT NOT NULL REFERENCES cleanups(id) ON DELETE CASCADE,
  manifest_sha256 TEXT NOT NULL UNIQUE,
  pair_count INTEGER NOT NULL,
  photo_count INTEGER NOT NULL,
  actor_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE INDEX idx_pairs_cleanup ON pairs(cleanup_id);
CREATE INDEX idx_photos_pair ON photos(pair_id);
CREATE INDEX idx_claims_pair_status ON claims(pair_id, status);
CREATE INDEX idx_claims_decided ON claims(decided_by, decided_at);
CREATE INDEX idx_events_cleanup ON events(cleanup_id, created_at);
CREATE INDEX idx_suggestions_photo ON suggestions(photo_id);
CREATE INDEX idx_cleanups_external ON cleanups(external_id);
CREATE INDEX idx_imports_cleanup ON import_batches(cleanup_id);
```

Timestamps are ISO-8601 UTC strings. IDs are `crypto.randomUUID()`. Coordinates are normalized to 0–1 and clamped on write. `public_slug` is `crypto.randomBytes(9).toString('base64url')` and is regenerated on every publish and unpublish. `display_name` is unique; there is no legal-name column.

Status rules:

- Cleanup status is derived, never stored.
- A claim is editable only in `draft`; a submitted claim is `pending`; decisions are terminal except a revision, which creates a new row.
- A decision writes `status`, `decided_by`, `decided_at`, and `decision_note` together with its event in one transaction. `decision_note` holds the optional confirm note or the required reject/insufficient reason.
- `insufficient` is a return, not a rejection. The collector responds with a new photo and a new claim.
- The export reads `confirmed` claims whose source photo is current (`photos.superseded_at IS NULL`), whose pair is `comparable` or `partial`, and whose source and comparison photos are not `people_visible`.
- The public page reads the same set, plus `cleanups.public_enabled = 1` and a matching `public_slug`. It never reads the excluded appendix or the audit log.
- A photo cannot be replaced while it is the source of a confirmed claim. The server returns a conflict and asks for a revision.
- Claims and AI suggestions attach to the pair's current **before** photo. The after photo is comparison evidence; the server rejects a claim pointing at an after photo.
- `photos.sha256` is the sanitized bytes that are stored and served. `photos.original_sha256` is the uploaded bytes, which are never retained. The receipt uses `sha256`.
- `stored_path` is internal and never appears in HTML, JSON, logs, or an API response.
- Event payloads must not contain original filenames, filesystem paths, EXIF, or GPS.

## File Structure

```
shoreproof/
├── app/
│   ├── layout.tsx                  # root fonts, metadata
│   ├── globals.css                 # Tailwind 4 theme tokens
│   ├── (site)/
│   │   ├── layout.tsx              # public site header/footer
│   │   ├── page.tsx                # home
│   │   ├── how-it-works/page.tsx
│   │   ├── evidence/page.tsx
│   │   ├── for-organizers/page.tsx
│   │   ├── for-reviewers/page.tsx
│   │   ├── privacy/page.tsx
│   │   └── about/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # app shell, identity, local-mode banner
│   │   ├── cleanups/
│   │   │   ├── page.tsx            # cleanup list
│   │   │   ├── new/page.tsx        # create cleanup
│   │   │   ├── actions.ts          # createCleanup, createPair, saveClaim, submitPair,
│   │   │   │                       # setComparability, saveSuggestions, acceptSuggestion,
│   │   │   │                       # rejectSuggestion, submitAllPairs, publishCleanup,
│   │   │   │                       # unpublishCleanup
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # cleanup record
│   │   │       ├── pairs/[pairId]/page.tsx
│   │   │       └── export/page.tsx # export preview + publish panel
│   │   ├── review/
│   │   │   ├── page.tsx            # queue + claim review
│   │   │   ├── [claimId]/page.tsx  # deep link
│   │   │   └── actions.ts          # decideClaim, reviseClaim
│   │   └── settings/page.tsx       # people, privacy, public page, data wipe
│   ├── setup/page.tsx              # first-run profile
│   ├── login/page.tsx              # optional passphrase
│   ├── p/[slug]/page.tsx           # public evidence page
│   ├── actions.ts                  # switchUser, logout
│   └── api/
│       ├── pairs/[pairId]/photos/route.ts     # POST upload
│       ├── photos/[photoId]/route.ts          # GET sanitized original
│       ├── photos/[photoId]/thumb/route.ts    # GET 640 px
│       └── cleanups/[id]/export/route.ts      # GET ?format=html|json
├── components/
│   ├── site/
│   │   ├── site-header.tsx
│   │   ├── site-footer.tsx
│   │   ├── tide-divider.tsx
│   │   ├── field-label.tsx
│   │   ├── survey-grid.tsx
│   │   └── receipt-anatomy.tsx
│   ├── app-shell.tsx
│   ├── user-switcher.tsx
│   ├── status-chip.tsx
│   ├── stepper.tsx
│   ├── compare-canvas.tsx
│   ├── region-editor.tsx
│   ├── photo-rail.tsx
│   ├── preflight-panel.tsx
│   ├── privacy-panel.tsx
│   ├── suggestion-panel.tsx
│   ├── comparability-panel.tsx
│   ├── claim-form.tsx
│   ├── review-queue.tsx
│   ├── claim-review.tsx
│   ├── evidence-pack.tsx
│   └── receipt.tsx
├── lib/
│   ├── db.ts                       # connection, pragmas, schema bootstrap
│   ├── schema.sql
│   ├── types.ts
│   ├── auth.ts                     # optional passphrase + session cookie
│   ├── users.ts
│   ├── cleanups.ts
│   ├── pairs.ts
│   ├── photos.ts                   # ingestPhoto, near-duplicate
│   ├── privacy.ts                  # sanitizeImage, consent, blockers
│   ├── claims.ts
│   ├── suggestions.ts
│   ├── queue.ts                    # flags + priority, pure
│   ├── preflight.ts                # server canonical checks
│   ├── preflight-client.ts         # browser provisional checks
│   ├── framing.ts                  # 8x8 grid signal
│   ├── region.ts                   # clamp + normalize, pure
│   ├── export.ts                   # receipt assembly, pure-ish
│   ├── html.ts                     # escapeHtml + standalone pack template
│   ├── storage.ts                  # paths under DATA_DIR
│   ├── validation.ts               # Zod schemas
│   ├── import.ts                   # manifest validation + import
│   └── site.ts                     # public-site content helpers
├── lib/detector/
│   ├── coco.ts                     # 80 class names
│   ├── icc.ts                      # conservative COCO -> ICC map
│   ├── parse.ts                    # output-shape normalization, pure
│   └── detect.ts                   # worker client wrapper
├── workers/
│   └── detector.worker.ts
├── scripts/
│   ├── fetch-model.mjs             # pinned download + SHA-256 check
│   ├── copy-ort.mjs                # copy ORT wasm to public/ort
│   ├── import.ts                   # CLI importer
│   └── data-wipe.mjs               # destructive local reset
├── docs/
│   ├── import-manifest.example.json
│   └── adr/
│       ├── 0001-real-records-only.md
│       ├── 0002-privacy-baseline.md
│       ├── 0003-multi-page-public-site.md
│       └── 0004-sanitized-image-is-the-source-of-record.md
├── tests/
│   ├── preflight.test.ts
│   ├── privacy.test.ts
│   ├── queue.test.ts
│   ├── claims.test.ts
│   ├── import.test.ts
│   ├── export.test.ts
│   └── detector.test.ts            # output-shape parsing
├── public/
│   ├── models/                     # gitignored, filled by fetch-model
│   └── ort/                        # gitignored, filled by copy-ort
├── data/                           # gitignored local DB + uploads
├── imports/                        # gitignored real manifests + photos
├── devpost/
│   ├── learner-profile.md
│   ├── scope.md
│   ├── prd.md
│   ├── spec.md
│   ├── checklist.md
│   └── research.md
├── middleware.ts
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── eslint.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── package.json
├── .env.example
├── .gitignore
├── Dockerfile
├── .dockerignore
├── fly.toml
├── GLOSSARY.md
├── LICENSE                          # AGPL-3.0
└── README.md
```

## External Services and Dependencies

- **Hugging Face model download** — build-time only.
  `GET https://huggingface.co/onnx-community/yolo26n-ONNX/resolve/main/onnx/model.onnx`
  Expected: 9,890,454 bytes, SHA-256 `cda08d9440217e243e075ee839f40383c59b3f973e493f9f6c7452922a69436e`.
  No key, no rate limit for a single download. Cost: $0.
- **Google Fonts** — `next/font/google` fetches at build time and self-hosts. Fonts: Archivo, Newsreader, IBM Plex Mono. No runtime call.
- **Fly.io** — optional hosting. One `shared-cpu-1x` 256 MB Machine, one 1 GB volume. Current pricing is a few dollars a month; check https://fly.io/docs/about/pricing before deploying. Volume cost is $0.15/GB/month.
- **No runtime API keys.** No analytics, no error reporting, no object storage, no email, no social-media API, no third-party video host.
- **No Instagram/TikTok ingestion.** The `/about` case study is a link, not an embed.

## Important Failure Modes

- **Detector fails to load or returns an unexpected shape** → the suggestion panel disables with "Detector unavailable — mark the litter yourself"; every other path, including review and export, still works.
- **`DATA_DIR` cannot be created or written** → startup fails with one line naming the path and the fix (`mkdir -p ./data` or mount `/data`). It never falls back to an in-memory database silently.
- **Upload is HEIC or a corrupt file** → the server rejects with "Use JPEG, PNG, or WebP. On iPhone, set Camera to Most Compatible." The previous photo, if any, is untouched.
- **Metadata stripping fails** → the upload is rejected. The app never stores an image whose EXIF/GPS check did not pass.
- **A photo file is missing at export time** → the export fails with "Source file missing for claim X" instead of shipping a receipt without pixels.
- **A confirmed claim's source photo is replaced** → the upload route returns 409; create a revision instead.
- **A people-visible photo reaches review** → confirm, export, and publish are blocked with a visible reason; the reviewer can reject or send back, not override.
- **Two tabs decide the same claim** → the second action returns "Already decided by X"; no duplicate decision event.
- **Browser lacks WebAssembly SIMD** → the detector reports the failure; the manual path remains.
- **Export contains a `<script>` in a claim** → `escapeHtml` neutralizes it; the HTML is generated as text, never as raw user HTML.
- **Import manifest escapes the import directory** → the importer rejects the path before reading the file.
- **Import manifest contains claims or review keys** → Zod `.strict()` rejects it before any write.
- **Import repeats** → the manifest hash is skipped; an `external_id` conflict fails with a clear message.
- **Import pair is the same photo** → the exact-duplicate check rejects the pair.
- **Public page is unpublished** → `/p/[slug]` returns 404; the old slug no longer matches.
- **Passphrase is set without `AUTH_SECRET`** → startup fails with one line naming the missing variable.
- **Public slug collides** → regenerate in a short loop; the unique index is the final guard.

## What Was Simplified and Why

- **npm instead of pnpm** — pnpm is not installed; npm avoids a setup step. The Dockerfile uses `npm ci`.
- **No ORM** — `better-sqlite3` with prepared statements. The schema is ten tables; an ORM would add a dependency and a migration story without saving much.
- **No per-user auth** — display names plus an optional workspace passphrase. Real accounts would take longer than the kernel and are explicitly out of scope.
- **No demo seed** — the app starts empty. The importer is the bulk real-data path, and it never creates claims.
- **No separate API layer** — server components read directly; server actions write; four route handlers handle files and downloads.
- **Browser inference instead of a server model** — keeps photos local and avoids a Python service. Tradeoff: a 9.9 MB download and WASM latency, measured in the first detector slice.
- **HTML + JSON instead of PDF or ZIP** — a self-contained HTML file with embedded thumbnails opens anywhere and keeps claims clickable. A PDF would lose the interactions and add a rendering dependency.
- **CSS crops in the UI, `sharp` crops in the export** — no stored crop files. The normalized region is the source of truth.
- **One current photo per side, old photos superseded** — preserves the audit trail without building a version browser.
- **No dark mode** — the salt-and-ink aesthetic is the product. Adding a second theme would double the styling pass for no demo value.
- **No real-time updates** — `revalidatePath` and `router.refresh()` after mutations. A volunteer team is not collaborating in the same second.
- **No automatic face blur** — a wrong blur is worse than an honest block. The POC flags and blocks; face redaction is later.
- **No third-party video ingestion** — permission, privacy, and pairing problems. The case study is a link.

## Decisions and Open Issues

- **Next.js + TypeScript + SQLite + local files** — chosen for one process and one language; accepted tradeoff: no horizontal scaling, and SQLite needs a persistent volume.
- **YOLO26n in the browser** — chosen for privacy and zero GPU cost; accepted tradeoff: a model download and WASM latency.
- **`better-sqlite3` over an ORM** — chosen for direct SQL and a tiny dependency surface; accepted tradeoff: hand-written queries.
- **Server actions for writes, route handlers for files** — chosen to avoid a custom API; accepted tradeoff: the write layer is Next-specific.
- **AGPL-3.0 with a fetched model** — chosen because YOLO26 is AGPL-3.0; accepted tradeoff: the repo license is copyleft.
- **Real records only** — no seed, first-party capture plus manifest import; accepted tradeoff: the demo needs real photos before the video can be recorded.
- **Sanitized image is the source of record** — the receipt hashes the bytes that are stored and served; `original_sha256` preserves provenance without retaining the original. Accepted tradeoff: the receipt does not let a third party re-hash the original upload.
- **Privacy blocks are hard gates** — people-visible photos block confirm/export/publish; accepted tradeoff: a legitimate photo with a bystander needs a replacement before the claim can ship.
- **Multi-page site + app, workspace one page** — accepted tradeoff: more routes and copy, but the evidence work stays in one context.
- **One genuine unknown:** whether the ONNX export expects letterboxed input or a direct 640×640 resize, and whether its output is `[1,300,6]` or transposed. This is not a learner question; it is an artifact-level uncertainty. **Check:** in the first detector slice, run both preprocessing variants on a real photo, render the boxes, and keep the variant whose boxes land on the objects. Record the result here and in the build note before the AI slice is marked done.
- **No open questions carried from the PRD.** The integrity, real-data, privacy, and multi-page calls are settled. The only delivery dependency is two real before/after pairs for the demo video.