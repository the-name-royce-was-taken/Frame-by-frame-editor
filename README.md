# Praxilume Studio

Praxilume is a frame-by-frame drawing and video editor that runs in your browser. Bring in a clip, work on the frames one at a time, add drawings, text or images, then put everything together with a soundtrack.

There’s no installer or account to set up. Open the editor in a modern browser and you’re ready to go.

## Open Praxilume

[Launch Praxilume Studio](https://the-name-royce-was-taken.github.io/Praxilume/)

If you want to work on the code, run the repository through a simple static web server and open it locally.

## What you can do

- Import a video and step through its frames.
- Add, duplicate and delete frames as you work.
- Draw with the pen, eraser, line and shape tools.
- Place text and images on the canvas and adjust their position or size.
- Copy a selected part of a drawing and paste it onto another frame.
- Add audio on its own timeline track, move it into place and trim its length.
- Preview your edits and export the finished video.

Available video and audio formats depend on the browser and the codecs supported by your device.

## Working with larger videos

A long clip can contain a lot of image data. Praxilume compresses frames and stores them locally in your browser, using the Origin Private File System when it is available and IndexedDB as a fallback. Frames are loaded as needed instead of keeping every full-size image in memory.

Video encoding is handled by FFmpeg WebAssembly. The first preview or export can take a little longer while it loads.

## Project files

- `index.html` holds the editor interface.
- `styles.css` controls the layout and appearance.
- `app.js` handles editing, audio, playback and export.
- `frame-store.js` manages frame data in browser storage.
- `ffmpeg-worker.js` supports the video encoder.

## A few things to keep in mind

Praxilume is a work in progress. Browser support for video formats and export codecs varies, and longer or higher-resolution projects may take a while to import or export.

Your working frames are saved in the browser on the device you’re using. They are not currently packaged into a portable project file, so export your finished video before clearing browser data or switching devices.
