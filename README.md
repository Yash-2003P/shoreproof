# ShoreProof

A photo-first cleanup record that exports only the claims a named human has reviewed against a specific part of a specific photo.

ShoreProof starts empty. There is no demo record and no seed command. A cleanup comes from first-party capture or from a manifest import of real photos.

## Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The first run asks for a display name and role, then opens an empty cleanup list. The database and sanitized uploads live under `./data` and are gitignored.

Requires Node 24+ and npm 11+. No API keys. No GPU.

## Documentation

- [`devpost/scope.md`](devpost/scope.md) — what this is and what it refuses to be
- [`devpost/prd.md`](devpost/prd.md) — the journey, screens, and behavior
- [`devpost/spec.md`](devpost/spec.md) — stack, data model, components, failure modes
- [`devpost/checklist.md`](devpost/checklist.md) — the build plan
- [`GLOSSARY.md`](GLOSSARY.md) — the words this project uses
- [`docs/adr/`](docs/adr/) — the four decisions behind the privacy and evidence model

## Status

In progress. The public site, photo upload, AI suggestions, review, export, and importer arrive in the build slices. The planning documents above are the source of truth.

## License

AGPL-3.0. The license file is added with the release slice.
