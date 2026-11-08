# Praxilume Studio

Praxilume is a browser-based frame-by-frame editor for making animations and editing video one image at a time. Bring in a clip, work on individual frames, add drawings or text, arrange a soundtrack, then export the result.

It is made to open in a browser, so there is no account or server to configure. Your working project data stays in the browser on the device you are using.

## Open Praxilume

[Launch Praxilume Studio](https://the-name-royce-was-taken.github.io/Praxilume/)

To run it locally, serve the project folder with a simple static web server and open the page in a modern browser. Some features rely on browser media and storage APIs, and video export loads FFmpeg WebAssembly when needed.

## What you can do

- Import a video and work through its frames on the timeline.
- Add, duplicate and remove frames.
- Draw with the pen, eraser, line and shape tools.
- Place text and images on a frame, then move and edit them.
- Select part of a drawing and copy it to another frame.
- Add separate audio tracks and move them along the timeline.
- Preview the edited sequence and export a video.

The formats you can import and export depend on the browser and the codecs available on your device.

## A couple of practical notes

Praxilume keeps frame data compressed in browser storage and loads it as you work. This helps avoid keeping every full-size frame in memory at once, but large or long videos can still take time and use a fair amount of memory.

The first export may be slower because the video encoder has to load. Your working frames are stored locally in the browser; they are not yet packaged as a portable project file. Export your finished video before clearing site data or moving to another browser or device.

## Working on the project

The main files are:

- `index.html` — the editor interface
- `styles.css` — layout and appearance
- `app.js` — drawing, timeline, audio, media and export behaviour
- `frame-store.js` — browser storage for frame data
- `ffmpeg-worker.js` — the video-encoding worker

Praxilume is still being developed, so some edges may be a little rough. If something behaves differently across browsers, media support and codec availability are good places to start checking.
