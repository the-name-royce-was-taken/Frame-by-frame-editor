# FrameForge Studio

FrameForge is a small frame-by-frame animation and video editor that runs in your browser. It’s built for drawing over video, working through a sequence one frame at a time, and putting the finished result back together.

There’s no account or backend to set up. Open the page, import some media, and get started.

## Open the editor

Once GitHub Pages is enabled for this repository, the editor is available at:

[Open FrameForge Studio](https://the-name-royce-was-taken.github.io/Praxilume/)

You can also run it locally with any simple static web server. The project uses browser APIs and loads FFmpeg WebAssembly when it needs to encode a video.

## What you can do

- Import a video and work with its frames individually.
- Add blank frames, move through the timeline, and preview your sequence.
- Draw with the pen, eraser, line and shape tools.
- Add and work with text and images on the canvas.
- Select, copy and paste parts of a drawing between frames.
- Add a separate soundtrack and line it up on the audio track.
- Export a finished video in supported formats, including MP4, MOV and WebM.

Supported video and audio formats depend on the browser and the codecs available on the device.

## A note on performance

Video editing can use a lot of memory, especially when a clip contains hundreds of frames. To keep things manageable, frames are compressed and stored individually in the browser using the Origin Private File System where available, with IndexedDB as a fallback. The editor loads frame data as it is needed rather than keeping every decoded frame in memory.

The first export can take a little while because the video encoder has to load.

## Project files

The main files are:

- `index.html` — the editor interface
- `styles.css` — layout and visual styling
- `app.js` — drawing, timeline, media and export behaviour
- `frame-store.js` — local storage for compressed frame data
- `ffmpeg-worker.js` — worker used by the video encoder

## Things to keep in mind

This is an actively developed browser project, so a few rough edges are to be expected. Import support varies between browsers, and some export codecs may not be available on every device. Very long or high-resolution videos can also take time and use significant storage.

The frame cache lives in the browser, not in a portable project file. Export your finished video before clearing browser site data or moving to another browser or device.
