---
doc: scope
status: approved
---

# ShoreProof

A photo-first cleanup record that exports only the claims a named human has reviewed against a specific part of a specific photo.

## The Unique Kernel

Every exported claim is bound to two things: **a region in a specific photo** and **a named human review decision**. Around both sits an **evidence receipt** — source hash, region coordinates, reviewer, timestamp, and the check results — so the claim can be resolved back to bytes and time. AI suggestions live in a separate layer and can never overwrite, approve, or silently become confirmed observations.

Delete that binding and ShoreProof is another cleanup log with prettier photos.

## Who It's For

A volunteer cleanup lead — think a Surfrider chapter organizer or a park friends group coordinator — who has to show a sponsor, grant officer, or land manager what was actually removed.

Today they have a shared phone album, a spreadsheet of totals, and a paragraph in a report. Nobody can tell which "after" photo matches which "before" spot, whether the light changed, or who checked the claim. The second user is the **reviewer**: the coordinator who signs off before the record goes out.

Privacy is part of the job. The lead is usually handling photos of volunteers, a precise shoreline, and a sponsor's report. ShoreProof treats those photos as sensitive by default, not as marketing content.

## Where Real Data Comes From

**The app starts empty.** There is no seeded demo cleanup, no sample claim, and no fabricated before/after pair. A record exists only because a person created it from photos they have the right to use.

There are two real paths into the app:

1. **First-party capture (default).** The lead takes a before photo and an after photo of the same spot, then uploads them through the pair workspace. The app strips metadata, runs the checks, and asks the lead to mark each claim. This is the path the demo video uses.
2. **Manifest import (bulk).** An organizer points the importer at a folder of real photos and a JSON manifest:

   ```bash
   npm run import -- ./imports/north-jetty/manifest.json
   ```

   The importer creates the cleanup, pairs, sanitized photos, preflight results, and an import audit row. It **never creates claims, observations, categories, comparability states, or review decisions**. Those remain human work in the app.

The manifest is a delivery format, not a dataset. It contains cleanup metadata, a consent attestation, and relative paths to before/after photos. Unknown keys are rejected, so a manifest cannot smuggle in claims.

### What public cleanup data can and cannot do

We checked the obvious sources. None of them is a source of paired before/after evidence:

| Source | What it actually contains | Why it is not the kernel's data |
|---|---|---|
| **TIDES / Clean Swell** (Ocean Conservancy) | Item counts, locations, cleanup totals; the world's largest ocean-trash dataset | No paired before/after photos per spot |
| **Surfrider cleanup database** | Cleanup results, counts, a photo gallery | No matched before/after pair per spot; photos need permission |
| **OpenLitterMap** | Single geotagged litter photos, ODbL | Single photos, not removal pairs; geodata is sensitive |
| **NOAA Marine Debris** | Public-domain debris and cleanup photos | Real, but not paired evidence of the same spot |
| **Wikimedia Commons** | Real cleanup photos under varied licenses | Matched pairs are unreliable; licenses vary |
| **Instagram / TikTok** | Viral cleanup videos and posts | User-generated, often identifiable people, no license, not paired stills |

So the honest feed path is **first-party capture plus a manifest importer**, not a third-party API. A later version can add CSV context from Clean Swell or Debris Tracker, or a consented connector to an organizer's own archive. It cannot manufacture the pair.

### The Instagram case study

The Bittu Tabahi cleanup of the Ajnar River in Biaora, Madhya Pradesh is a real and inspiring cleanup. It is **not** app data:

- We do not have written permission to re-host the video.
- The video shows identifiable people, which conflicts with the privacy baseline.
- A video is not a matched before/after still pair, and frames may not share framing.
- Re-hosting it in a public repo or submission would undermine the product's own evidence claim.

If we cite it, we cite it as an external case study on `/about` with a link to the original post or news coverage. We do not download, clip, or import it. The demo record uses first-party photos captured with consent.

**Why no demo seed:** a trust product that fakes its own evidence is not credible. The empty state is part of the story: every pixel in a ShoreProof record was put there by a person who attested they had the right to use it.

## The Core Loop

1. **Set up the workspace.** On first run, create a display name and role. No email, no password. A second person can be added for review.
2. **Create a cleanup.** Site label (a public place name, not an address), date, internal conditions, optional public note, and a consent attestation.
3. **Add a before photo.** The app strips EXIF/GPS, re-encodes a sanitized image, hashes it, and runs preflight: resolution, blur, exposure, exact duplicate, near-duplicate. The uploader flags whether anyone is identifiable.
4. **Mark the claim.** Draw the region and write the observation in plain language. Pick an ICC category. AI can propose candidate boxes, but nothing is accepted by default.
5. **Add the after photo.** Preflight runs again. The pair gets a framing signal and a human comparability state — **comparable**, **partially comparable**, or **not comparable** — with a reason.
6. **Submit for review.** The record moves to **In review**; every claim enters the queue with deterministic flags.
7. **Review.** A named reviewer confirms, edits and confirms, rejects, or sends back as **insufficient evidence** — each with a reason. Confirmed claims lock; corrections create revisions.
8. **Export and publish.** The evidence pack contains only confirmed claims with receipts, plus an excluded-claims appendix. The public page is off by default; when published, it shows only confirmed claims, display names, and no coordinates or internal notes.

They come back because each cleanup adds to a record that survives staff turnover, and because the reviewer queue is the fastest way to get a sponsor-ready report out.

## Where the AI Actually Is

AI is not a chat panel bolted onto a form. It is the **preflight layer**: it looks at every photo before a human does, and it is visibly wrong sometimes.

| Job | What runs | What it produces | What it can never do |
|---|---|---|---|
| **Propose** | YOLO26n ONNX in the browser, CPU/WASM, inside a Web Worker | Dashed boxes, COCO class, confidence, tentative ICC category | Become a confirmed observation; count litter; set the official category |
| **Check** | Canvas + plain TypeScript | Resolution, Laplacian blur score, exposure clipping, SHA-256 duplicate, dHash near-duplicate, framing signal | Grade a photo as "good"; silently drop an upload |
| **Flag** | Readable rules | Queue reasons and ordering | Decide the outcome; auto-approve anything |

Four rules make this safe:

- **Separate store.** Suggestions live in their own table. A confirmed observation is a *copy* with a `source_suggestion_id`, so deleting or editing the suggestion cannot rewrite history.
- **No auto-accept.** There is no confidence threshold that grants authority. AgentVQA's best model scores 58.5% on agentic visual understanding and fails most on grounding, so a high score is not permission.
- **Evidence receipt, or no claim.** Each exported claim resolves to a source hash, a region, a reviewer, a timestamp, and the checks that ran. If the reviewer cannot verify it, the claim is marked **insufficient evidence** and sent back — it is not guessed, and it does not ship.
- **Disclosed in the export.** The evidence pack says which model ran, its hash, how many boxes it proposed, and how many a human accepted or rejected.

The detector is deliberately small. YOLO26n has 2.4 M parameters and runs in tens of milliseconds on a CPU. It knows 80 COCO classes, which means it can catch bottles, cups and glass, and will miss bags, straws, cigarette butts and fishing gear. That gap is shown in the UI, not hidden: the suggestion panel says **"COCO classes only — absence of a box is not evidence of absence."** The human region tool is the primary way to mark litter. The model is a second pair of eyes, not the record.

**Why not a VLM verdict.** October 2026 work documents inverse scaling, representational misalignment, and grounding failures in vision-language models. A wrong "this beach is clean" sentence would destroy the only thing ShoreProof sells. The POC uses no local VLM and no LLM-written decisions.

## Privacy Baseline

Privacy is a product requirement, not a footer.

**Collect less.**
- No email, phone number, postal address, GPS coordinates, or device metadata.
- A cleanup stores a public place label, a date, internal conditions, and an optional public note.
- Users have a **display name** only. There is no legal-name field.
- The import folder and manifest live outside git; `imports/` is ignored.

**Consent.**
- Creating a cleanup or importing one requires an attestation: "I took these photos or have permission to use them, and I have consent from anyone identifiable."
- The attestation is stored with the actor and timestamp. Uploads are blocked without it.
- A photo with an identifiable person is marked **people visible**. It can be stored, but it cannot be exported or published until it is replaced with a people-free photo or the claim is sent back. The POC does not auto-blur faces.

**Strip metadata.**
- On upload, `sharp` applies orientation, re-encodes the image, and drops EXIF, GPS, device, and timestamp metadata.
- The original upload bytes are not persisted. The app records `original_sha256` for provenance and `sha256` for the exact sanitized bytes it stores and serves.
- The receipt resolves to the sanitized bytes, not to an untracked original.

**Show less.**
- The public page uses display names and roles, never full names, emails, or addresses.
- The public page has no coordinates, no internal conditions, no rejected/insufficient claims, and no audit log.
- The public page is **off by default**, uses a random slug, and gets a new slug every time it is published. Unpublishing invalidates the old link.
- Public pages are `noindex` by default; share the link with the sponsor rather than publishing to search.

**Serve safely.**
- Only sanitized images are served. There is no route to the original upload.
- Filenames in responses are generic; original filenames are not stored.
- Security headers block third-party scripts, frames, and geolocation. No analytics, no error reporting, no runtime CDN.
- The detector runs in the browser; the photo is not sent anywhere for inference.

**Keep the boundary honest.**
- The POC is not anonymous and is not a compliance product. A local instance is the default.
- A hosted workspace should sit behind the optional workspace passphrase; the public page stays public.
- `npm run data:wipe -- --yes` removes the local database and uploads. A hosted operator controls the volume and retention.
- These limits are stated on `/privacy`, not hidden in a policy.

## Public Site and App Routes

The frontend is genuinely multi-page. The public site and the app have separate shells and separate jobs.

**Public site** (`app/(site)/`):

- `/` — what ShoreProof is, the kernel, the loop, the privacy promise.
- `/how-it-works` — Capture → Mark → Compare → Submit → Review → Export.
- `/evidence` — receipt anatomy, what "confirmed" means, what the AI can and cannot see.
- `/for-organizers` — running a cleanup, bulk import, sponsor-ready export, privacy controls.
- `/for-reviewers` — the queue, flags, four decisions, revisions, self-review.
- `/privacy` — the baseline above, in plain language.
- `/about` — why it exists, the real-data stance, the case-study citation, license, model.

**App** (`app/(app)/`):

- `/setup` — first-run display name and role.
- `/cleanups` — cleanup list, empty by default.
- `/cleanups/new` — create a cleanup with consent.
- `/cleanups/[id]` — cleanup record and pair cards.
- `/cleanups/[id]/pairs/[pairId]` — the pair workspace, one page with a **Capture → Mark → Compare → Submit** stepper.
- `/review` and `/review/[claimId]` — queue and claim detail.
- `/cleanups/[id]/export` — export preview, blockers, downloads.
- `/settings` — people, privacy status, public page.
- `/p/[slug]` — the public evidence page, outside the app shell.

The workspace stays one page on purpose: marking a region needs the photo, the claim, and the checks in view at once. The stepper communicates progress; it is not a wizard.

## Deployment

The same build runs in three places, in increasing order of effort.

| Mode | Command | Storage | Use |
|---|---|---|---|
| **Local** (default) | `npm install && npm run fetch-model && npm run dev` | `./data/shoreproof.db` + `./data/uploads` | Build, demo recording, offline work |
| **Container** | `docker run -p 3000:3000 -v shoreproof-data:/data shoreproof` | Named volume at `/data` | Reproducible run on any machine |
| **Hosted** | `fly deploy` with one Machine, a 1 GB volume at `/data`, and `WORKSPACE_PASSPHRASE` set | Fly volume | Optional live URL for judges |

- **One image, one process.** Next.js production build, Node runtime, SQLite file, sanitized uploads. No separate Python service, no model server, no GPU.
- **Persistent volume is mandatory.** Sanitized photos and the database both live under `/data`. Without a volume the app forgets every cleanup on redeploy.
- **One Machine only.** SQLite is a single-writer database; the app is not built for horizontal scaling. That is fine for a chapter-sized workspace and honest about the POC boundary.
- **Model at build time.** `scripts/fetch-model.mjs` downloads the pinned ONNX file into `public/models/` and verifies its SHA-256. The Docker build runs it, so the deployed image serves the model locally; no third-party CDN at runtime.
- **Hosted means gated.** The POC has no per-user accounts, so a hosted workspace must set `WORKSPACE_PASSPHRASE` and `AUTH_SECRET`. Without the passphrase, the app is a localhost tool. The public page stays public by design and has its own publish controls.
- **Why not Vercel:** a 4.5 MB request body limit and no persistent disk. SQLite and photo uploads do not fit without swapping in Postgres and object storage.
- **Why not Render free:** no persistent disks on the free plan, and the service spins down after 15 minutes. Photos would disappear. A paid Render instance with a disk works; Fly is cheaper for one small Machine.
- **Cost:** a few dollars a month for the hosted option. Exact prices change; the local and container paths cost nothing and are what the demo video uses.
- **Later:** a `Storage` interface with local, S3, and Supabase adapters, plus real auth and row-level security. The POC ships only the local adapter so there is one path to debug.

## Inspiration & Identity

A coastal survey sheet crossed with a chain-of-custody tag — not a gamified eco app, and not the cream-and-terracotta field notebook cliché.

- **References:** International Coastal Cleanup data cards, OSPAR's fixed 100 m survey unit, NOAA marine debris monitoring, 4ocean's internal before/during/after photo review, C2PA Content Credentials, chain-of-custody tags.
- **Palette:** salt-white `#F3F5F1`, ink navy `#0E2433`, tide-chart teal `#1C6B70`, safety orange `#E4572E` only for flags and the insufficient-evidence action, cool hairline `#C6D1D2`, muted `#5A6A6D`.
- **Type:** **Archivo** for UI, **Newsreader** for record titles, **IBM Plex Mono** for receipts, IDs, hashes, and timestamps.
- **Motifs:** a stamped receipt with a perforated edge and a punched hole; a tide-line divider; thin survey rules; photo corner ticks; mono field labels. The receipt is the memorable element.
- **Tone:** plain, specific, verifiable. "Confirmed by", "checked at", "not included", "needs another photo". Never "AI-certified", "100% clean", or "verified beach".

## Why This Matters to the Learner

They asked for research-backed, real-world functionality rather than a toy, and specifically want it to run with little or no GPU. ShoreProof turns that constraint into the design argument: the human is the reviewer, not the model. The real-data rule adds a second argument: a trust product cannot demo itself with invented evidence. The privacy baseline makes the third: the people in cleanup photos are not content.

## What "Working" Looks Like

A three-minute screen demo with **real first-party photos**:

1. Fresh install → `/setup` → create "Maya C." (collector/reviewer).
2. `/cleanups` is empty. Create "North Jetty" with a public note and the consent attestation.
3. Upload a real before photo. Preflight warns on blur; the privacy panel confirms metadata was stripped and no people are visible.
4. **Suggest candidates** returns a few dashed boxes. Accept one bottle, reject one false positive, then draw a region around a bag the model missed and write the observation.
5. Upload the after photo. The compare wipe shows the spot. The framing signal says "shifted framing"; Maya sets **partially comparable** and types "tide came in, camera shifted left."
6. Submit. Add/switch to reviewer "Ravi P." Confirm the bottle claim, reject "entire beach cleaned" as an overclaim, send a third claim back as **insufficient evidence**.
7. Export the HTML pack. Open it offline. Click a claim to see its crop, source hash, reviewer, timestamp, and checks. The rejected claim is in the appendix, not the public record.
8. Publish the public page. Open it in a private window: only confirmed claims, display names, no coordinates, no rejected claims. Unpublish; the old link 404s.
9. Optional: import a second real cleanup from a manifest. The summary shows pairs and photos; the record has **zero claims** until a human marks them.

The "oh, that's cool" beat: every sentence in the export can be clicked back to the exact pixels, the AI proposal it came from (if any), and the person who approved it.

**Demo dependency:** the video needs two real before/after pairs captured with consent. The Instagram case study is cited on `/about`, not ingested. If the pairs are not available, the build still works, but the video cannot honestly show the core loop.

## The POC Boundary

In:

- First-run setup with display names and roles; a user switcher; optional workspace passphrase for hosted use.
- Cleanup create/list/record, consent attestation, public note, public-page publish/unpublish.
- Before/after upload with EXIF/GPS stripping, sanitized storage, original/stored hashes, preflight, people-visible flag.
- Browser YOLO26n suggestions with per-box accept/reject/edit; no auto-accept.
- Rectangle region annotation, observation text, ICC category.
- Framing signal plus human comparability state and reason.
- Rule-based reviewer queue; confirm, edit-and-confirm, reject, insufficient evidence; revisions; append-only log.
- Evidence receipt per confirmed claim; HTML/JSON export with excluded appendix; public page with display names and privacy controls.
- Manifest importer with consent, path validation, idempotency, import audit; never creates claims.
- Seven-page public site and the app routes above.
- One-command local run, Dockerfile, optional Fly config, data wipe.

Out:

- Real accounts, organizations, roles, or per-user permissions. The POC has a single workspace and an optional passphrase gate.
- Third-party video ingestion, social-media scraping, or re-hosting someone else's cleanup footage.
- Automatic face detection or blurring.
- Video upload or clip processing.
- Automatic before/after alignment or homography.
- Maps, GPS polygons, or transect geometry.
- Native mobile app.
- Payments, notifications, integrations.
- Model training or fine-tuning.
- C2PA signing.
- Litter weight, volume, or category estimation.
- CSV import from Clean Swell or Debris Tracker (later).
- Any certification or "verified clean" claim.

## Later

- C2PA Content Credentials signing once there is a real signing identity (the July 2026 deployment guidance and free-tier certificates make this practical).
- Video clip → best-frame extraction using focus, exposure, and perceptual-distinctness scores; OpenCV 5 is the reference implementation.
- GPS-tagged OSPAR-style 100 m survey units and ICC category picker.
- Real auth, reviewer roles, and Supabase row-level security for multi-org use.
- CSV import from Clean Swell or Debris Tracker as **context**, not evidence.
- A consented connector to an organizer's own archive, with per-photo permission records.
- Face redaction with a human check, for organizers who must show people in the frame.
- Fine-tuned beach-litter detector; YOLOE-26 open-vocabulary detection (docs currently recommend a GPU with 4–8 GB VRAM).
- Offline PWA and a public read API.

## Explicitly Cut

- **Automatic litter counting or an AI "clean" verdict.** No CPU model is reliable enough on beach litter, and October 2026 VLM work documents task-level failures and inverse scaling. A wrong automated verdict would destroy the kernel.
- **LLM-written review decisions or auto-approval.** The reviewer must be a named human; the audit trail is the product.
- **A local VLM (Qwen2-VL-class) in the POC.** CPU latency and energy are still impractical for an interactive demo; edge-VLM papers rely on NPUs or GPUs for throughput.
- **Full video understanding or uploading whole clips.** Heavy, privacy-sensitive, and unnecessary to prove the kernel. Best-frame extraction is a later stretch, not part of the POC finish line.
- **Re-hosting social video without permission.** The Bittu Tabahi case study is cited and linked, not ingested.
- **A demo seed or fabricated claims.** The app starts empty; real records come from capture or the manifest importer.
- **Blockchain anchoring.** Hashes and an append-only log give the demo's trust story without the theatre.
- **Greenwashing scores or brand ratings.** Out of scope and reputationally risky.
- **A native app.** A responsive web app is enough for the demo video.
- **Training a custom detector.** No labeled data, no GPU budget, no time.
- **Automatic face blurring.** A wrong blur is worse than an honest block; the POC asks the uploader and blocks publication.

## Research Notes That Shaped This Scope

Full paper-by-paper triage in `devpost/research.md`. The summary:

- **Judging:** Design, Potential Impact, Innovation/Idea, and Presentation are equally weighted; Stage One is a pass/fail check that the planning docs exist. The demo must carry the product, because reviewers will not run it.
- **Gap:** Clean Swell, Debris Tracker, and OpenLitterMap collect counts and photos. 4ocean's internal TrashTracker reviews before/during/after photos, which validates the need. None of the public tools expose a reviewed, claim-level evidence record.
- **Real data:** no public API of paired before/after cleanup photos exists. TIDES/Clean Swell is counts and locations; Surfrider is results and a gallery; OpenLitterMap is single geotagged photos; NOAA and Wikimedia are unpaired photos. The kernel needs first-party capture or a manifest import of first-party files.
- **Standards:** ICC data cards, OSPAR's exact 100 m repeat survey unit, UNEP/GESAMP monitoring guidance, and Surfrider's 2025 report (34,000 volunteers, 1,058 cleanups, ~340,000 lb) define the vocabulary and the comparability problem.
- **AI caution:** AgentVQA (Oct 22, 2026) reports **58.5%** best accuracy across 22 models, with failures concentrated in visual grounding and state tracking. "On the Limits of Scale: Inverse Scaling in Vision-Language Models" (Oct 19, 2026) and "Persistent Representational Misalignment Induces Vision-Language Model Failures" (Oct 18, 2026) argue for task-specific evaluation and human authority. OpenCV 5's VLM module is not in the 5.0 release. Together these justify a proposal-only detector and a named human reviewer.
- **AI shape:** "Is Complex Agentic Memory Always Needed?" (Oct 22, 2026) supports raw evidence over transformed memory; "Good Judgment, Bad Advice" supports rule-based review control; "More Memory, Worse Agents" supports no cross-record memory; "Same Simulation, Different Evidence" supports hash-keyed re-checks; "VerifierBench" supports executable checks. Those five map directly onto storage, queue, and export decisions.
- **Closest benchmark:** RealityBench (Oct 9, 2026, Relantic) evaluates 26 VLMs on 1,378 frames of photo-as-proof-of-work. Top models read text in frame but are weak at measurements, small parts, and spatial relations. That is precisely the detail a cleanup claim depends on, so the human marks the region and writes the observation.
- **Evidence receipts:** "Evidence-First Agentic Verification" (2610.17724, Scale AI, `github.com/rsanayei/sauron`) resolves every verdict against its source, attaches an auditable receipt, and marks unresolved criteria `evidence_missing` instead of guessing. ShoreProof borrows the receipt and the fourth reviewer action ("insufficient evidence — send back"), not the LLM verifier.
- **Why not Manga2Animate:** the paper and repo are real (`github.com/annchenn/Manga2Animate`), but the pipeline needs Gemini creator/reviewer calls plus paid video APIs, or a ~97 GB GPU for the open FLUX.2 path, and its demo manga is copyrighted. Its useful idea — a creator proposes, a separate reviewer checks against the source, the best parts are assembled — is the loop ShoreProof already runs with a human as the reviewer.
- **CPU evidence:** YOLO26n is 2.4 M params and **38.9 ms** ONNX on Ultralytics' Xeon CPU benchmark; OpenCV 5's DNN benchmark reports **9.9–55.6 ms** across i9/i7/M1/M5. MM-IQA (Sept 2026) shows interpretable blur/exposure/noise cues at ~1.97 s per image. dHash is effectively instant. These are published numbers, not measurements on this machine.
- **Deployment:** Vercel Functions cap request bodies at 4.5 MB and have no persistent disk; Render's free plan cannot attach a disk and spins down after 15 minutes; Fly.io has no free tier but a 256 MB Machine plus a 1 GB volume costs a few dollars a month. One SQLite writer means one Machine.
- **License:** YOLO26 is AGPL-3.0. The repo ships **AGPL-3.0** and fetches the ONNX file with a checksum-pinned script instead of committing it. This is a spec decision; it is settled, not reopened.
