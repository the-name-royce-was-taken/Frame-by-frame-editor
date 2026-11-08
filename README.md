# Praxilume Studio

A static, browser-based frame-by-frame drawing and video editor.

## Run it

Open [the GitHub Pages site](https://the-name-royce-was-taken.github.io/Frame-by-frame-editor/) after enabling Pages in **Settings → Pages**, or serve this repository with any static web server. No backend is required.

## Project layout

- `index.html` — semantic app structure and UI
- `styles.css` — responsive dark studio theme
- `app.js` — frame editing, import, playback and export logic

## Memory-conscious design

- Video import captures every decoded source frame instead of sampling at a selected FPS.
- Frames are compressed as WebP and stored individually in the browser's Origin Private File System at `FrameForgeProject/frames`, with IndexedDB fallback.
- The active frame and visible timeline thumbnails are decoded only when needed.
- The original video stays attached to the preview so source audio plays in sync with frame playback.
- FFmpeg is loaded only when a non-WebM export is requested.

## Features

- Import video (MOV/MP4 supported by the browser) and audio files
- Native-frame extraction, audio-synced playback, frame stepping and blank-frame insertion
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
