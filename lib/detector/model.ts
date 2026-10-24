/**
 * The pinned detector. The file is fetched with `npm run fetch-model`, which
 * verifies the byte count and the SHA-256 before it is written.
 */
export const DETECTOR_MODEL = {
  name: "YOLO26n",
  repo: "onnx-community/yolo26n-ONNX",
  fileName: "yolo26n.onnx",
  publicPath: "/models/yolo26n.onnx",
  bytes: 9_890_454,
  sha256:
    "cda08d9440217e243e075ee839f40383c59b3f973e493f9f6c7452922a69436e",
  inputSize: 640,
  threshold: 0.35,
  maxBoxes: 20,
  license: "AGPL-3.0",
} as const;

export const DETECTOR_DISCLOSURE =
  "YOLO26n · COCO classes only — absence of a box is not evidence of absence.";
