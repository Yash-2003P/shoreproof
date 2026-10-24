# 0002 — Privacy baseline for photos, identity, and public pages

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

Cleanup photos often contain volunteers, bystanders, minors, precise shorelines, and device metadata. The product's public page and sponsor export turn those photos into shared artifacts. A trust tool cannot leak the people it is supposed to protect.

## Decision

Privacy is a hard gate, not a policy page.

- **Collect less:** display name, role, site label, date, internal conditions, public note, sanitized photos, claims, decisions, timestamps, hashes. No email, phone, address, GPS, coordinates, analytics identifiers, or legal names.
- **Consent:** creating a cleanup or importing one requires an attestation stored with actor, timestamp, and version. Uploads are blocked without it.
- **Sanitize on write:** `sharp` applies orientation, re-encodes to JPEG, and drops EXIF/GPS. The original bytes are never written to disk. The receipt hashes the sanitized bytes; `original_sha256` preserves provenance.
- **People-visible:** the uploader flags identifiable people. A flagged photo blocks confirmation, export, and publication until replaced. No automatic face blur in the POC.
- **Display names only:** the public page and export use display names and roles.
- **Public page off by default:** random slug, new slug on every publish and unpublish, `noindex`, confirmed claims only, no coordinates, no internal conditions, no rejected/insufficient claims, no audit log.
- **Sanitized serving only:** no route to the original upload; generic response filenames; no original filenames stored; self-only CSP and security headers; no third-party runtime calls.
- **Hosted gate:** the optional `WORKSPACE_PASSPHRASE` protects the app routes; the public page stays public. A hosted workspace without a passphrase shows a warning and should not be exposed.
- **Retention:** `npm run data:wipe -- --yes` removes the local database and uploads; a hosted operator owns the volume and retention.

## Consequences

- A legitimate photo with a bystander needs a replacement before the claim can ship. That is slower, but honest.
- The receipt resolves to sanitized bytes, not the original upload. A third party cannot re-hash the original from the receipt alone.
- The POC is not anonymous, not a compliance product, and has no per-user auth. Those limits are stated on `/privacy`.
- Face redaction is deferred; a wrong blur would be worse than an honest block.
