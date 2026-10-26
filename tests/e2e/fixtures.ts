import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 900;
const HORIZON = Math.round(HEIGHT * 0.56);

type Rgb = [number, number, number];

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function put(
  pixels: Buffer,
  x: number,
  y: number,
  color: Rgb,
  alpha = 1,
): void {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const index = (y * WIDTH + x) * 3;
  pixels[index] = Math.round(pixels[index] * (1 - alpha) + color[0] * alpha);
  pixels[index + 1] = Math.round(
    pixels[index + 1] * (1 - alpha) + color[1] * alpha,
  );
  pixels[index + 2] = Math.round(
    pixels[index + 2] * (1 - alpha) + color[2] * alpha,
  );
}

function rect(
  pixels: Buffer,
  x: number,
  y: number,
  w: number,
  h: number,
  color: Rgb,
): void {
  for (let py = y; py < y + h; py += 1) {
    for (let px = x; px < x + w; px += 1) {
      put(pixels, px, py, color);
    }
  }
}

function scene(seed: number): Buffer {
  const random = mulberry32(seed);
  const pixels = Buffer.alloc(WIDTH * HEIGHT * 3);

  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const noise = Math.round((random() - 0.5) * 14);
      let color: Rgb;
      if (y < HORIZON) {
        const depth = y / HORIZON;
        color = [
          38 + Math.round(depth * 22) + noise,
          82 + Math.round(depth * 28) + noise,
          94 + Math.round(depth * 18) + noise,
        ];
      } else {
        const depth = (y - HORIZON) / (HEIGHT - HORIZON);
        color = [
          184 + Math.round(depth * 28) + noise,
          172 + Math.round(depth * 24) + noise,
          142 + Math.round(depth * 18) + noise,
        ];
      }
      put(pixels, x, y, color);
    }
  }

  // Foam line at the tide mark.
  for (let x = 0; x < WIDTH; x += 1) {
    const wobble = Math.round(Math.sin(x / 42) * 5 + Math.sin(x / 13) * 2);
    for (let y = 0; y < 7; y += 1) {
      put(pixels, x, HORIZON + wobble + y, [226, 230, 218], 0.65);
    }
  }

  // The same pebbles and driftwood in both frames make the spot legible.
  for (let index = 0; index < 320; index += 1) {
    const x = Math.floor(random() * WIDTH);
    const y = HORIZON + 18 + Math.floor(random() * (HEIGHT - HORIZON - 24));
    const size = 3 + Math.floor(random() * 14);
    const tone = 96 + Math.floor(random() * 70);
    rect(pixels, x, y, size, Math.max(2, Math.round(size * 0.6)), [
      tone,
      tone - 4,
      tone - 10,
    ]);
  }

  for (let index = 0; index < 7; index += 1) {
    const x = 60 + Math.floor(random() * (WIDTH - 300));
    const y = HORIZON + 70 + Math.floor(random() * (HEIGHT - HORIZON - 150));
    rect(pixels, x, y, 90 + Math.floor(random() * 160), 10, [124, 102, 78]);
  }

  return pixels;
}

function addTrash(pixels: Buffer, seed: number, count: number): void {
  const random = mulberry32(seed);
  const colors: Rgb[] = [
    [228, 87, 46],
    [216, 196, 72],
    [52, 112, 148],
    [238, 238, 228],
    [162, 54, 70],
    [44, 132, 112],
    [92, 84, 148],
  ];

  for (let index = 0; index < count; index += 1) {
    const x = 30 + Math.floor(random() * (WIDTH - 90));
    const y = HORIZON + 30 + Math.floor(random() * (HEIGHT - HORIZON - 80));
    const width = 10 + Math.floor(random() * 42);
    const height = 6 + Math.floor(random() * 20);
    const color = colors[Math.floor(random() * colors.length)];
    rect(pixels, x, y, width, height, color);
    rect(pixels, x + 2, y + 2, Math.max(3, width - 8), 2, [
      Math.min(255, color[0] + 30),
      Math.min(255, color[1] + 30),
      Math.min(255, color[2] + 30),
    ]);
  }
}

export type Fixtures = {
  before: string;
  after: string;
};

export async function makeFixtures(): Promise<Fixtures> {
  const directory = path.join(os.tmpdir(), "shoreproof-e2e-fixtures");
  fs.rmSync(directory, { recursive: true, force: true });
  fs.mkdirSync(directory, { recursive: true });

  const before = path.join(directory, "before.jpg");
  const after = path.join(directory, "after.jpg");

  const beforePixels = scene(20261026);
  addTrash(beforePixels, 771, 110);
  await sharp(beforePixels, {
    raw: { width: WIDTH, height: HEIGHT, channels: 3 },
  })
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toFile(before);

  const afterPixels = scene(20261026);
  addTrash(afterPixels, 772, 9);
  await sharp(afterPixels, {
    raw: { width: WIDTH, height: HEIGHT, channels: 3 },
  })
    .jpeg({ quality: 88, chromaSubsampling: "4:4:4" })
    .toFile(after);

  return { before, after };
}
