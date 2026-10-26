# ShoreProof

A photo-first cleanup record that exports only the claims a named human has reviewed against a specific part of a specific photo.

Every confirmed claim resolves to three things: a **region** on a sanitized before photo, a **named human review decision**, and an **evidence receipt** that carries the crop, hashes, checks, comparability note, and AI provenance. A claim that cannot produce all three does not leave the workspace.

ShoreProof starts empty. There is no demo record, no seed command, and no stock cleanup photography. A record begins with first-party capture or a manifest import of real photos.

## The loop

1. **Capture** a before photo of the spot, with consent for anyone identifiable.
2. **Mark** one region and write one plain sentence about what was removed.
3. **Compare** the before and after photos and record whether they are comparable.
4. **Submit** the pair for review.
5. A reviewer **confirms**, **edits and confirms**, **rejects**, or sends the claim back for **insufficient evidence**.
6. Confirmed claims **export** as a self-contained HTML pack or JSON. A public page can be published separately and is off by default.

The pair workspace stays one page: Capture → Mark → Compare → Submit. The public site and the workspace have separate routes.

## What the AI does

YOLO26n runs in a browser Web Worker through ONNX Runtime Web. It proposes candidate regions and COCO classes; it never accepts a box, sets a category, or makes a review decision. A human accepts, edits, or rejects every proposal. The model is checksum-pinned and fetched by script, never committed. The detector is optional: with the model absent, the manual path still works.

## Privacy

- EXIF and GPS are stripped before storage; the original upload is discarded.
- Only sanitized images are served. `original_sha256` and stored `sha256` are both recorded.
- A photo marked people-visible blocks confirmation, export, and publishing until it is replaced.
- Public pages are off by default, use a random slug that rotates on publish and unpublish, and send `noindex, nofollow`.
- Display names only: no accounts, email addresses, or analytics.
- An optional workspace passphrase protects `/setup`, `/cleanups`, `/review`, `/settings`, and the pair/export APIs. The public site and a published record stay readable.
- `npm run data:wipe` removes the database and sanitized uploads under `DATA_DIR`.

## Run locally

Requires Node 24+ and npm 11+. No API keys and no GPU.

```bash
npm install
npm run fetch-model   # optional: enables browser suggestions
npm run dev
```

Open <http://localhost:3000>. The first run asks for a display name and role, then opens an empty cleanup list. The database and sanitized uploads live under `./data` and are gitignored.

To use a passphrase locally:

```bash
WORKSPACE_PASSPHRASE='choose-a-long-passphrase' \
AUTH_SECRET='a-long-random-signing-secret' \
npm run dev
```

The server refuses to start if `WORKSPACE_PASSPHRASE` is set without `AUTH_SECRET`.

## Import a real cleanup

For photos already on disk, write a manifest and point the importer at it:

```bash
npm run import -- --dry-run ./imports/north-jetty/manifest.json
npm run import -- ./imports/north-jetty/manifest.json
```

The schema is [`docs/import-manifest.example.json`](docs/import-manifest.example.json). Photo paths are relative to the manifest and cannot escape it. The importer sanitizes every photo through the same path as an upload, creates the cleanup, pairs, preflight checks, and framing signal, and writes an import audit row. It creates **zero claims**; marking and review stay human work. Re-running the same manifest prints “Already imported” and writes nothing. `imports/` is gitignored.

## Docker

```bash
docker build -t shoreproof .
docker run --rm -p 3000:3000 -v shoreproof-data:/data shoreproof
```

The entrypoint fixes ownership of the `/data` volume once, then runs the server as the unprivileged `node` user. The container has a health check and writes the SQLite database and sanitized uploads under `/data`.

For a locked deployment:

```bash
docker run --rm -p 3000:3000 -v shoreproof-data:/data \
  -e WORKSPACE_PASSPHRASE='choose-a-long-passphrase' \
  -e AUTH_SECRET='a-long-random-signing-secret' \
  shoreproof
```

[`fly.toml`](fly.toml) is a starting point for one Machine with a `/data` volume. Change the app name, create the volume, and set the two secrets before deploying:

```bash
fly volumes create shoreproof_data --size 1 --region sjc
fly secrets set WORKSPACE_PASSPHRASE='choose-a-long-passphrase' AUTH_SECRET='a-long-random-signing-secret'
fly deploy
```

## Checks

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
npx playwright install chromium   # once
npm run test:e2e
```

The Playwright suite starts its own disposable server and data directory, then drives setup → capture → mark → compare → submit → review → export → publish. A second path verifies insufficient evidence, the returned queue, the export appendix, and the publishing block. Fixture images are generated at test time and are never committed.

## Documentation

- [`scope.md`](scope.md) — what this is and what it refuses to be
- [`prd.md`](prd.md) — the journey, screens, and behavior
- [`spec.md`](spec.md) — stack, data model, components, failure modes
- [`devpost/checklist.md`](devpost/checklist.md) — the build plan and verification log
- [`GLOSSARY.md`](GLOSSARY.md) — the words this project uses
- [`docs/adr/`](docs/adr/) — the four decisions behind the privacy and evidence model
- [`docs/demo-rehearsal.md`](docs/demo-rehearsal.md) — the three-minute recording plan

## License

[AGPL-3.0](LICENSE). The model weights are fetched separately under their own license; no model file is committed.
