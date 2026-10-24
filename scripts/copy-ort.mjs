import fs from "node:fs";
import path from "node:path";

const sourceDir = path.join(
  process.cwd(),
  "node_modules",
  "onnxruntime-web",
  "dist",
);
const targetDir = path.join(process.cwd(), "public", "ort");

if (!fs.existsSync(sourceDir)) {
  console.warn(
    "onnxruntime-web is not installed yet; skipping the WASM copy. Run npm install, then npm run postinstall.",
  );
  process.exit(0);
}

fs.mkdirSync(targetDir, { recursive: true });

const files = fs
  .readdirSync(sourceDir)
  .filter((name) => /^ort-wasm-simd-threaded.*\.(wasm|mjs)$/.test(name));

if (files.length === 0) {
  console.warn("No ONNX Runtime WASM files were found; skipping the copy.");
  process.exit(0);
}

for (const name of files) {
  fs.copyFileSync(path.join(sourceDir, name), path.join(targetDir, name));
}

console.log(
  `Copied ${files.length} ONNX Runtime WASM files into public/ort/ for offline inference.`,
);
