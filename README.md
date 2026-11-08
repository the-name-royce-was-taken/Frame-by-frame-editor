# FrameForge Studio

FrameForge is a browser-based editor for working through video one frame at a time. Bring in a clip, draw or add elements to individual frames, arrange the soundtrack, and export the result as a video.

There’s nothing to install and no account to create. Open the editor in a modern browser and start a project.

## Open the editor

[Launch FrameForge Studio](https://the-name-royce-was-taken.github.io/Praxilume/)

To work on the project locally, serve the repository with a simple static web server and open the page in your browser.

## What you can do

- Import a video and work on its frames individually.
- Add, duplicate, remove and rearrange frames.
- Draw with the pen, eraser, line and shape tools.
- Add text and images, then move or resize them on the canvas.
- Copy a selected area from one frame and paste it into another.
- Add a separate audio track, move it along the timeline and trim its length.
- Preview the edited sequence and export it in a supported video format.

The formats you can import and export depend on your browser and the codecs available on your device.

## A quick note about performance

Video projects can use a fair bit of memory, especially when they contain lots of high-resolution frames. FrameForge stores compressed frame data in your browser and loads it when it is needed. It uses the Origin Private File System where available, with IndexedDB as a fallback.

The first preview or export may take a little longer while the video encoder loads.

## Project files

- `index.html` — the editor interface
- `styles.css` — layout and visual styling
- `app.js` — drawing, timeline, audio and export behaviour
- `frame-store.js` — local storage for frame data
- `ffmpeg-worker.js` — worker used by the video encoder

## Things worth knowing

FrameForge is still being worked on, so some parts may change and a few rough edges are possible. Import and export support varies by browser, and large projects can take time to process.

Your working frames are stored in the browser on the device you’re using. They are not yet saved as a portable project file, so export your finished video before clearing browser data or moving to another device.
