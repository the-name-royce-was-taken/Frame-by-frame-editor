// Same-origin entry point for FFmpeg.wasm's module worker.
// Its imports resolve against jsDelivr, which serves the package modules with CORS enabled.
import 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js';
