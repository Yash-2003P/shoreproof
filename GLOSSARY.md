# ShoreProof Glossary

The words this project uses in code, UI copy, docs, and the demo. If a term is not here, it probably should not be in the product.

## Record terms

**Cleanup** — One real cleanup event at one site on one date. It owns pairs, photos, claims, and the audit log. A cleanup is created by a person who attests they have the right to use the photos.

**Pair** — A before photo and an after photo of the same spot, plus a human comparability decision. A pair is the unit of removal evidence.

**Before photo** — The claim source. Every claim and AI suggestion attaches to the current before photo.

**After photo** — The comparison photo. It shows the spot after the cleanup; it is never the source of a claim.

**Claim** — One observation bound to one region in one before photo. A claim is not a cleanup total and not a category count.

**Region** — A normalized rectangle (`x`, `y`, `w`, `h`, all 0–1) on a photo. The region is the pixel address of the claim.

**Observation** — The 1–280 character sentence a human writes about what was removed and from where. It becomes public if the claim is confirmed.

**Category** — The human-selected ICC category on a claim. AI may pre-select a tentative category; it never sets the official one.

**Draft claim** — A claim that is still editable. It is not evidence yet and can be removed.

**Submitted claim** — A claim in the reviewer queue (`pending`). It is no longer editable by the collector.

**Confirmed claim** — A claim a named reviewer has approved. It is immutable and can appear in the export and the public page.

**Rejected claim** — A claim a reviewer has refused, with a reason. It stays in the audit log and the export appendix; it never appears on the public page.

**Insufficient evidence** — A reviewer decision that returns a claim to the collector because the photos do not prove it. It is a return, not a rejection. The collector owes another photo or a revision.

**Superseded claim** — An older revision that has been replaced by a confirmed revision. It stays in the audit log.

**Revision** — A new claim row that corrects a confirmed claim. The old row stays visible until the revision is confirmed, then becomes `superseded`.

**Audit log** — The append-only `events` table. It records who did what and when. It cannot be updated or deleted.

**Evidence receipt** — The per-claim record that binds a confirmed claim to its sanitized source hash, region, collector, reviewer, timestamp, checks, comparability, and AI provenance. The receipt is the kernel's visible artifact.

**Evidence pack** — The HTML or JSON export of a cleanup: cover, method, confirmed claims with receipts, excluded-claims appendix, AI disclosure, and audit log.

**Excluded claim** — A rejected or insufficient claim. It appears in the export appendix and never on the public page.

**Public page** — The read-only `/p/[slug]` page. It shows confirmed claims only, with display names and receipts. It is off by default.

**Public slug** — The random URL segment for a public page. It is regenerated on every publish and unpublish, so an old link stops working.

**Publish / unpublish** — The explicit action that turns the public page on or off. Publishing requires at least one confirmed claim and a clean privacy check.

## People and privacy terms

**Display name** — The only identity a person has in ShoreProof. It is public on confirmed claims. There is no legal-name, email, or phone field.

**Consent attestation** — The required statement that the uploader took the photos or has permission to use them, and has consent from anyone identifiable. It is stored with actor, timestamp, and version.

**People-visible** — A photo flag set by the uploader when someone is identifiable. A people-visible photo blocks confirmation, export, and publication until it is replaced. The POC does not auto-blur.

**Sanitized image** — The JPEG the server creates after applying orientation and stripping EXIF/GPS. It is the only image stored and served.

**Original hash** (`original_sha256`) — The SHA-256 of the uploaded bytes. It preserves provenance; the original bytes are never retained.

**Stored hash** (`sha256`) — The SHA-256 of the sanitized bytes that are stored and served. The receipt uses this hash.

**Workspace passphrase** — An optional single passphrase that gates the app routes when the app is hosted. It is not a user account and does not protect the public page.

**Data wipe** — The destructive local command that removes the database and sanitized uploads. It is the POC's retention control.

## Capture and AI terms

**Preflight** — The photo checks: resolution, blur, exposure, exact duplicate, near-duplicate, and framing. Preflight warns; it never silently drops an upload.

**Framing signal** — A 0–100 similarity hint from the two photos' luminance grids and aspect ratios. It is a signal, not a verdict; the human sets comparability.

**Comparability** — The human state on a pair: **Comparable**, **Partially comparable**, or **Not comparable**, with a reason for the latter two. `Not comparable` blocks confirmation.

**Suggestion** — A YOLO26n candidate box on a before photo. It has a COCO class, confidence, and tentative ICC category. It is never a claim until a human accepts it.

**Model run** — One inference: model name, model hash, runtime, input size, and box count. It is stored for disclosure.

**COCO** — The 80-class dataset YOLO26n was trained on. It covers bottles, cups, and glass; it misses most bags, straws, butts, and fishing gear. Absence of a box is not evidence of absence.

**ICC** — The International Coastal Cleanup category vocabulary used for the human category picker.

**Self-review** — A reviewer deciding a claim they collected. It is allowed in a small team and disclosed in the queue and export.

## Data-feed terms

**First-party capture** — Photos taken by the cleanup lead or a person with permission, uploaded through the app. The default and preferred source.

**Import manifest** — A JSON file (`shoreproof.import.v1`) that describes one cleanup, its consent attestation, and relative paths to before/after photos. It never contains claims.

**Import batch** — The audit row for one manifest import: manifest hash, pair count, photo count, actor, timestamp. It makes re-runs idempotent.

**External ID** — The organizer's stable identifier for a cleanup in a manifest. It prevents importing the same cleanup twice with a different manifest.

## Visual terms

**Stamped receipt** — The recurring visual component: salt-white card, perforated edge, punched hole, mono fields, rotated **CONFIRMED** stamp, short hash strip.

**Tide-line divider** — The thin SVG wave rule between public-site sections. It draws once on the home page.

**Survey grid** — The 12-column hairline grid on the home page and receipt anatomy section. It is a background, not a border around every card.

**Field label** — The small uppercase mono label above a value in a receipt or form.

## Terms we do not use

- **"Verified beach" / "verified clean"** — ShoreProof records evidence; it does not certify a place.
- **"AI-certified"** — The model proposes; a named human decides.
- **"100% clean"** — Not measurable from two photos.
- **"Demo data"** — There is no seeded demo record. The app starts empty.
- **"Trust score"** — The product does not reduce evidence to a number.
- **"User"** in UI copy — Prefer **collector**, **reviewer**, or **person**. "User" is fine in code and technical docs.
