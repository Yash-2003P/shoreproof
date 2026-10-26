import { formatDate } from "../lib/format";
import {
  ImportError,
  runImport,
  type ImportPairSummary,
  type ImportPhotoSummary,
  type ImportSummary,
} from "../lib/import";

function usage(): string {
  return [
    "Usage:",
    "  npm run import -- ./imports/north-jetty/manifest.json",
    "  npm run import -- --dry-run ./imports/north-jetty/manifest.json",
    "",
    "The manifest and its photos stay outside git. The importer creates the",
    "cleanup, pairs, sanitized photos, checks, and framing signal. It never",
    "creates claims, suggestions, comparability, or review decisions.",
  ].join("\n");
}

function parseArgs(argv: string[]): { manifestPath: string; dryRun: boolean } {
  let dryRun = false;
  const positional: string[] = [];

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    } else if (arg.startsWith("-")) {
      throw new ImportError("manifest_read", `Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 1) {
    throw new ImportError(
      "manifest_read",
      `Pass exactly one manifest path.\n\n${usage()}`,
    );
  }

  return { manifestPath: positional[0], dryRun };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.round(bytes / 1024)} KB`;
}

function photoLine(photo: ImportPhotoSummary): string {
  const side = photo.side === "before" ? "Before" : "After ";
  const people = photo.peopleVisible ? " · people visible" : "";
  return `    ${side}  ${photo.width} × ${photo.height} px · ${formatBytes(photo.bytes)} · blur ${Math.round(photo.blurScore)} · clipped ${(photo.exposureClipped * 100).toFixed(1)}%${people}`;
}

function pairLines(pair: ImportPairSummary, index: number): string[] {
  return [
    `${String(index + 1).padStart(2, "0")}  ${pair.label}`,
    photoLine(pair.before),
    photoLine(pair.after),
    `    Framing  ${pair.framing.score}/100 · ${pair.framing.word}`,
  ];
}

function printSummary(summary: ImportSummary): void {
  const lines: string[] = [""];

  lines.push(`ShoreProof import — ${summary.site}`);
  lines.push(
    `${formatDate(summary.date)} · lead ${summary.lead} · consent ${summary.consentBy}`,
  );
  lines.push(`Manifest sha256 ${summary.manifestSha256}`);
  lines.push("");

  if (summary.status === "already_imported") {
    lines.push("Already imported. Nothing was written.");
    lines.push(
      `Cleanup ${summary.cleanupId} · ${summary.pairCount} ${
        summary.pairCount === 1 ? "pair" : "pairs"
      } · ${summary.photoCount} photos`,
    );
    if (summary.nextPath) {
      lines.push(`Open ${summary.nextPath}`);
    }
    console.log(lines.join("\n"));
    return;
  }

  lines.push(
    `${summary.pairCount} ${summary.pairCount === 1 ? "pair" : "pairs"} · ${summary.photoCount} photos · 0 claims`,
  );
  lines.push("");

  summary.pairs.forEach((pair, index) => {
    lines.push(...pairLines(pair, index));
    lines.push("");
  });

  if (summary.warnings.length > 0) {
    lines.push(`Warnings (${summary.warnings.length})`);
    for (const warning of summary.warnings) {
      lines.push(`  ! ${warning}`);
    }
    lines.push("");
  }

  if (summary.status === "dry_run") {
    lines.push("Dry run: nothing was written.");
    console.log(lines.join("\n"));
    return;
  }

  lines.push("Imported. No claims were created.");
  lines.push(`Cleanup ${summary.cleanupId}`);
  if (summary.nextPath) {
    lines.push(`Open ${summary.nextPath}`);
  }
  lines.push(
    "Next: add a reviewer in Settings, then mark the before photos in the workspace.",
  );

  console.log(lines.join("\n"));
}

async function main(): Promise<void> {
  const { manifestPath, dryRun } = parseArgs(process.argv.slice(2));
  const summary = await runImport({ manifestPath, dryRun });
  printSummary(summary);
}

main().catch((error: unknown) => {
  if (error instanceof ImportError) {
    console.error(`Import failed: ${error.message}`);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
