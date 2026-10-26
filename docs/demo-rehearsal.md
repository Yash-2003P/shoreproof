# Demo rehearsal

The submission video is under three minutes and shows the core loop end to end. Reviewers will not clone the repository, so the video has to carry the product.

## Before you record

- [ ] Two real before/after pairs are captured with consent. One pair can be the main demo; the second proves the record is not a one-off.
- [ ] No identifiable people appear in either photo. If someone does appear, replace the photo or flag it people-visible and do not use that pair in the demo.
- [ ] The cleanup site is a public place name, not a street address.
- [ ] `npm run fetch-model` has verified the pinned model, or you have decided to demo the manual path only.
- [ ] `npm run dev` opens on a workspace with the two real pairs and no fabricated records.
- [ ] The public page is unpublished at the start so publishing is visible on camera.
- [ ] Browser zoom is 100%, the window is 1440 × 900 or larger, and notifications are off.
- [ ] The workspace passphrase is either off for the local recording or known and ready. Do not show the passphrase or `AUTH_SECRET` on screen.
- [ ] A dry run has been completed once without recording.

If the two real pairs do not exist yet, stop. Do not substitute stock photos, a seeded record, or an invented cleanup.

## Three-minute shot list

### 0:00–0:20 — The problem

Open on the public site. Say what ShoreProof refuses to do: a cleanup photo is not proof by itself, and a count with no receipt is not evidence.

### 0:20–0:45 — The evidence model

Scroll the home page or open `/evidence`. Point at the receipt anatomy and the three anchors: photo region, named review decision, evidence receipt. Mention that the public page shows confirmed claims only.

### 0:45–1:35 — Capture, mark, compare

Open the first real pair in the workspace.

1. Show the before photo and its sanitized upload receipt.
2. Draw one region around the litter that was removed.
3. Write one plain sentence and choose the ICC category.
4. Save the draft.
5. Show the after photo and the before/after wipe.
6. Set **Comparable** (or **Partially comparable** with the real reason).
7. Submit the pair.

Keep the pointer slow enough that the region and the claim text are readable. Do not run the detector unless it has already been rehearsed; the manual path is the story.

### 1:35–2:10 — A named human decides

Open **Review**. Show the queue flags, the before/after crops, and the AI provenance disclosure. Confirm the claim with a short note. Point out that confirmation locks the claim and that the reviewer's name and time are part of the record.

### 2:10–2:40 — Export and publish

Open **Export and publish**. Show the confirmed claim count, download the JSON or HTML pack, then publish the record. Open the live `/p/[slug]` page in a new tab. Show the receipt and the `noindex` privacy line. Point out that the excluded-claims appendix is in the export but not on the public page.

### 2:40–3:00 — Privacy and close

Return to the workspace. Show the privacy panel or `/privacy`: EXIF/GPS stripped, original discarded, people-visible blocks confirmation and export, public page off by default. Close on the line that every public claim resolves to a region, a person, and a receipt.

## Recording notes

- Record at 1440 × 900 or 1920 × 1080. Keep the browser chrome out of the frame if possible.
- Use a clean microphone. Record narration separately if the room is noisy, then align it.
- Do not speed up the review decision or the publish step; the pauses are what make the actions legible.
- Cut dead time, not evidence. The video must show the same claim from capture through publication.
- Keep the final file under three minutes. Check the duration before uploading.
- Upload as unlisted or public, confirm the link works in a private window, and put the link in the Devpost submission.

## After recording

- [ ] The video shows both real pairs or clearly identifies the one pair used.
- [ ] The confirmed claim in the video is the same claim that appears on the public page.
- [ ] No passphrase, secret, local file path, email address, or identifiable person is visible.
- [ ] The export download and the public page both appear on screen.
- [ ] The duration is under 3:00.
- [ ] The Devpost description links the public repository and the video.
