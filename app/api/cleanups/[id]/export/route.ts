import { getCleanup } from "@/lib/cleanups";
import {
  ExportError,
  buildExportBundle,
  exportBlockers,
  recordExport,
} from "@/lib/export";
import { renderExportHtml } from "@/lib/html";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return Response.json(
      { error: "No workspace user is set up." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const cleanup = getCleanup(id);
  if (!cleanup) {
    return Response.json(
      { error: "Cleanup not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const format = new URL(request.url).searchParams.get("format") ?? "html";
  if (format !== "html" && format !== "json") {
    return Response.json(
      { error: "Choose format=html or format=json." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const blockers = exportBlockers(id);
  if (blockers.length > 0) {
    return Response.json(
      {
        error: "The export is blocked.",
        blockers,
      },
      {
        status: 409,
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    );
  }

  let body: string;
  try {
    const bundle = await buildExportBundle(id, "export");
    body = format === "html" ? renderExportHtml(bundle) : JSON.stringify(bundle, null, 2);

    recordExport({
      cleanupId: id,
      actorId: user.id,
      kind: format,
      claimCount: bundle.claims.length,
    });
  } catch (error) {
    if (error instanceof ExportError) {
      return Response.json(
        { error: error.message, blockers: [] },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    throw error;
  }

  const extension = format === "html" ? "html" : "json";
  const contentType =
    format === "html"
      ? "text/html; charset=utf-8"
      : "application/json; charset=utf-8";

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="shoreproof-record-${id.slice(0, 8)}.${extension}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
