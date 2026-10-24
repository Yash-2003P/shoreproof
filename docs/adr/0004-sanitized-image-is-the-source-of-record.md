# 0004 — The sanitized image is the source of record

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

The evidence receipt needs a hash that resolves to the pixels a reviewer actually saw. Privacy needs EXIF/GPS removed before storage. Those two requirements conflict if the receipt hashes the original upload while the app serves a sanitized copy.

Keeping the original upload would preserve a stronger chain of custody, but it would also keep the GPS coordinates, device identifiers, and timestamps that the privacy baseline promises to remove. Hashing the original and serving a different file would make the receipt unverifiable against the served image.

## Decision

The server sanitizes on write:

1. Apply EXIF orientation.
2. Re-encode to JPEG.
3. Drop EXIF/GPS and all other metadata.
4. Verify the output has no `exif` or `gps`; if it does, reject the upload.
5. Store only the sanitized JPEG and a thumbnail.
6. Record `original_sha256` for provenance and `sha256` for the sanitized bytes.
7. The receipt uses `sha256`; the JSON export includes both hashes with labels.

The original upload bytes are never written to disk. The only copy is the sanitized image that the app serves.

## Consequences

- The receipt resolves exactly to the bytes a reviewer can download and hash.
- A third party cannot re-hash the original upload from the receipt alone; `original_sha256` proves the upload existed but not its metadata.
- The app cannot later re-run a check against the original bytes. It re-runs against the sanitized bytes, which is the image of record.
- A metadata-stripping failure rejects the upload rather than storing an unsafe file.
- This decision is the technical form of ADR 0002; changing it requires revisiting the privacy baseline.
