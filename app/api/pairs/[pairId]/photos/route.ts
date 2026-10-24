import { getCurrentUser } from "@/lib/session";
import { ingestPhoto, toPhotoSummary } from "@/lib/photos";
import { PhotoError } from "@/lib/privacy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pairId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { error: "Open the workspace before uploading a photo." },
      { status: 401 },
    );
  }

  const { pairId } = await params;
  const formData = await request.formData();
  const file = formData.get("file");
  const side = formData.get("side");
  const peopleVisible =
    formData.get("peopleVisible") === "1" ||
    formData.get("peopleVisible") === "on";

  if (!(file instanceof File)) {
    return Response.json({ error: "Choose a photo to upload." }, { status: 400 });
  }

  if (side !== "before" && side !== "after") {
    return Response.json(
      { error: "A photo must be uploaded as before or after." },
      { status: 400 },
    );
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: "That photo is larger than 20 MB. Export a smaller copy." },
      { status: 413 },
    );
  }

  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  ) {
    return Response.json(
      {
        error:
          "HEIC is not accepted. On an iPhone, export the photo as JPEG first.",
      },
      { status: 415 },
    );
  }

  if (
    type &&
    !["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(type)
  ) {
    return Response.json(
      { error: "Only JPEG, PNG, and WebP images are accepted." },
      { status: 415 },
    );
  }

  try {
    const photo = await ingestPhoto({
      pairId,
      side,
      buffer: Buffer.from(await file.arrayBuffer()),
      peopleVisible,
      actorId: user.id,
    });

    return Response.json({ photo: toPhotoSummary(photo) }, { status: 201 });
  } catch (error) {
    if (error instanceof PhotoError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("photo upload failed", error);
    return Response.json(
      { error: "The photo could not be stored. Try again." },
      { status: 500 },
    );
  }
}
