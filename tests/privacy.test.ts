import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { sanitizePhoto, sha256 } from "../lib/privacy";

const GPS_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/4QCqRXhpZgAATU0AKgAAAAgAAgEOAAIAAAAWAAAAJoglAAQAAAABAAAAPAAAAABTaG9yZVByb29mIHRlc3QgaW1hZ2UAAAQAAQACAAAAAk4AAAAAAgAFAAAAAwAAAHIAAwACAAAAAlcAAAAABAAFAAAAAwAAAIoAAAAAAAAALAAAAAEAAAAeAAAAAQAAAAAAAAABAAAASQAAAAEAAAAKAAAAAQAAAAAAAAAB/9sAQwAFAwQEBAMFBAQEBQUFBgcMCAcHBwcPCwsJDBEPEhIRDxERExYcFxMUGhURERghGBodHR8fHxMXIiQiHiQcHh8e/9sAQwEFBQUHBgcOCAgOHhQRFB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4e/8AAEQgAFAAoAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A89ooor5Q+lCiiigAooooAKKKKACiiigAooooA//Z",
  "base64",
);

describe("sanitizePhoto", () => {
  it("re-encodes to JPEG, hashes both sides, and builds a thumbnail", async () => {
    const input = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 3,
        background: { r: 40, g: 90, b: 120 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await sanitizePhoto(input);

    expect(result.width).toBe(1600);
    expect(result.height).toBe(900);
    expect(result.originalSha256).toBe(sha256(input));
    expect(result.sha256).toBe(sha256(result.data));
    expect(result.originalSha256).not.toBe(result.sha256);

    const stored = await sharp(result.data).metadata();
    expect(stored.format).toBe("jpeg");
    expect(stored.exif).toBeUndefined();

    const thumb = await sharp(result.thumb).metadata();
    expect(thumb.width).toBeLessThanOrEqual(640);
    expect(thumb.height).toBeLessThanOrEqual(640);
  });

  it("strips EXIF and GPS from a JPEG that contains both", async () => {
    const before = await sharp(GPS_JPEG).metadata();
    expect(before.exif).toBeDefined();
    expect(before.exif?.toString("latin1")).toContain("ShoreProof test image");

    const result = await sanitizePhoto(GPS_JPEG);
    const after = await sharp(result.data).metadata();

    expect(after.exif).toBeUndefined();
    expect((after as { gps?: Buffer }).gps).toBeUndefined();
    expect(result.data.toString("latin1")).not.toContain("ShoreProof test image");
  });

  it("applies EXIF orientation before hashing", async () => {
    const input = await sharp({
      create: {
        width: 40,
        height: 20,
        channels: 3,
        background: { r: 200, g: 100, b: 50 },
      },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();

    const result = await sanitizePhoto(input);
    expect(result.width).toBe(20);
    expect(result.height).toBe(40);
  });

  it("rejects formats outside JPEG, PNG, and WebP", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>',
    );

    await expect(sanitizePhoto(svg)).rejects.toMatchObject({ status: 415 });
  });

  it("rejects unreadable bytes", async () => {
    await expect(
      sanitizePhoto(Buffer.from("this is not an image")),
    ).rejects.toMatchObject({ status: 415 });
  });
});
