import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const MODEL = {
  url: "https://huggingface.co/onnx-community/yolo26n-ONNX/resolve/main/onnx/model.onnx",
  bytes: 9_890_454,
  sha256:
    "cda08d9440217e243e075ee839f40383c59b3f973e493f9f6c7452922a69436e",
  destination: path.join(process.cwd(), "public", "models", "yolo26n.onnx"),
};

const force = process.argv.includes("--force");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function verify(buffer) {
  if (buffer.byteLength !== MODEL.bytes) {
    return `expected ${MODEL.bytes} bytes, got ${buffer.byteLength}`;
  }
  const digest = sha256(buffer);
  if (digest !== MODEL.sha256) {
    return `expected SHA-256 ${MODEL.sha256}, got ${digest}`;
  }
  return null;
}

if (!force && fs.existsSync(MODEL.destination)) {
  const existing = fs.readFileSync(MODEL.destination);
  const problem = verify(existing);

  if (!problem) {
    console.log(
      `Model already present: public/models/yolo26n.onnx (${MODEL.bytes} bytes, SHA-256 verified).`,
    );
    process.exit(0);
  }

  console.warn(`Existing model failed verification (${problem}); downloading again.`);
}

fs.mkdirSync(path.dirname(MODEL.destination), { recursive: true });

console.log("Downloading YOLO26n ONNX (9.9 MB) from Hugging Face…");

const response = await fetch(MODEL.url, { redirect: "follow" });
if (!response.ok || !response.body) {
  console.error(
    `Download failed: HTTP ${response.status} ${response.statusText}. The manual marking path still works without the model.`,
  );
  process.exit(1);
}

const chunks = [];
let received = 0;
const total = Number(response.headers.get("content-length") ?? 0) || MODEL.bytes;

for await (const chunk of response.body) {
  chunks.push(Buffer.from(chunk));
  received += chunk.byteLength;

  if (process.stdout.isTTY) {
    const percent = Math.min(100, Math.round((received / total) * 100));
    process.stdout.write(`\r${percent}% (${received.toLocaleString()} bytes)`);
  }
}

if (process.stdout.isTTY) process.stdout.write("\n");

const buffer = Buffer.concat(chunks);
const problem = verify(buffer);

if (problem) {
  console.error(`Model verification failed: ${problem}`);
  console.error("Nothing was written. Check the URL and try again.");
  process.exit(1);
}

const temporary = `${MODEL.destination}.download`;
fs.writeFileSync(temporary, buffer);
fs.renameSync(temporary, MODEL.destination);

console.log(
  `Verified public/models/yolo26n.onnx: ${MODEL.bytes} bytes, SHA-256 ${MODEL.sha256}.`,
);
console.log("The file is gitignored. It runs in the browser and is never uploaded.");
