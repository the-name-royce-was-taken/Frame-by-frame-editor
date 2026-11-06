# FrameForge Studio

A static, browser-based frame-by-frame drawing and video editor.

## Run it

Open [the GitHub Pages site](https://the-name-royce-was-taken.github.io/Frame-by-frame-editor/) after enabling Pages in **Settings → Pages**, or serve this repository with any static web server. No backend is required.

## Project layout

- `index.html` — semantic app structure and UI
- `styles.css` — responsive dark studio theme
- `app.js` — frame editing, import, playback and export logic

## Memory-conscious design

- Imported source frames are encoded as JPEG blobs rather than retaining a full-resolution canvas per frame.
- Only the current drawing layer is held as a full-resolution canvas. It is serialized to a PNG blob when switching frames.
- Source frame bitmaps use a small LRU cache (3 decoded frames); evicted `ImageBitmap` objects are closed where supported.
- Thumbnail canvases are small and drawn on demand.
- Import is capped at 900 frames to reduce the chance of browser tab exhaustion. For a 25 fps source, this corresponds to about 36 seconds.
- FFmpeg is loaded only when a non-WebM export is requested.

## Features

- Import video (MOV/MP4 supported by the browser) and audio files
- Frame extraction, playback, frame stepping and blank-frame insertion
- Pen, eraser, line, rectangle, ellipse and selection tools
- Copy/paste selected drawing regions between frames
- WebM export with browser MediaRecorder
- MP4/MOV export through FFmpeg WebAssembly, including H.264, HEVC and MPEG-4 options

## Known limitations

- Video import relies on browser media decoding and supported input formats vary by browser.
- The import cap is 900 frames. A longer clip is truncated rather than silently allocating unlimited memory.
- HEVC availability depends on the FFmpeg build and the browser/device.
- WebM export currently captures the canvas; imported audio is only muxed in the FFmpeg export path.
- This is a browser prototype, not a professional NLE. Save/export work before closing the tab; project persistence is not implemented.
