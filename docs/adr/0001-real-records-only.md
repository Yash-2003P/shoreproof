# 0001 — Real records only, with first-party capture and a manifest importer

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

ShoreProof's kernel is a claim bound to a region in a specific photo and a named human decision. A seeded demo record would make the product look complete while proving nothing: the photos, the claim, and the review would all be invented.

We checked the public cleanup datasets. None contains paired before/after photos of the same spot:

- TIDES / Clean Swell: item counts and locations.
- Surfrider: cleanup results and a gallery, not matched pairs.
- OpenLitterMap: single geotagged photos under ODbL.
- NOAA Marine Debris and Wikimedia Commons: real photos, but not paired evidence.
- Instagram / TikTok: user-generated, often identifiable people, no license, not paired stills.

## Decision

The app starts empty. A record enters through one of two paths:

1. **First-party capture** — the lead uploads before/after photos of the same spot through the app.
2. **Manifest import** — an organizer runs `npm run import -- ./imports/site/manifest.json` with real photos and a JSON manifest.

The importer creates the cleanup, pairs, sanitized photos, preflight results, framing signal, and an import audit row. It never creates claims, observations, categories, comparability states, suggestions, or review decisions. Unknown manifest keys are rejected, consent is required, paths must stay inside the import directory, and re-runs are idempotent.

The Bittu Tabahi / Ajnar River cleanup is cited on `/about` as an external case study with a link. It is not downloaded, clipped, or imported.

## Consequences

- The demo video needs two real before/after pairs captured with consent. The build can proceed without them; the video cannot honestly show the core loop.
- There is no `db:seed` and no demo badge. The empty state explains capture vs. import.
- The importer is a second path through the same photo-ingestion code, so privacy and preflight cannot drift between upload and import.
- A later CSV import from Clean Swell or Debris Tracker can provide context, not evidence.
