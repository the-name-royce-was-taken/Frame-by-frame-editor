# Praxilume Studio

Praxilume is a frame-by-frame drawing and video editor that runs right in your browser. You can bring in a clip, work on it one frame at a time, add drawings, text or images, and put the edited sequence back together with a soundtrack.

It’s designed to be straightforward to open and use: no account, installer or server-side setup is needed.

## Open Praxilume

When GitHub Pages is enabled for this repository, you can use the editor here:

[Open Praxilume Studio](https://the-name-royce-was-taken.github.io/Praxilume/)

For local development, serve the repository with any static web server and open the page in a modern browser.

## What’s inside

- **Frame-by-frame editing:** import a video, step through its frames, add new ones and preview your changes.
- **Drawing tools:** sketch with the pen and eraser, or use lines, shapes and text.
- **Images and selections:** add images, move and resize elements, and copy or paste selected areas between frames.
- **Soundtrack timeline:** add an audio file on its own track and move it along the timeline.
- **Video export:** assemble your edited frames and audio into a finished file. Available formats include MP4, MOV and WebM, with codec support depending on the browser and encoder build.
- **Light and dark themes:** switch the workspace appearance to suit how you like to work.

## Keeping larger projects manageable

A frame sequence can get big quickly. Praxilume compresses frame data and stores it locally in your browser, using the Origin Private File System where supported and IndexedDB as a fallback. It decodes frames as they are needed for editing and previewing, rather than holding every full-size frame in memory all the time.

Video encoding is handled with FFmpeg WebAssembly. It is loaded when you start an export or build an edited preview, so the first run may take a little longer.

## Project files

- `index.html` contains the editor interface.
- `styles.css` controls the layout and appearance.
- `app.js` handles editing, media import, playback and export.
- `frame-store.js` manages compressed frame data in browser storage.
- `ffmpeg-worker.js` provides the worker used by FFmpeg.

## A few limitations

Praxilume is still a work in progress. The video and audio formats you can import depend on your browser, and not every device supports every export codec. Large or long videos may take a while to import and export.

Your working frame data is stored in the browser on the device you’re using. It is not currently a portable project file, so export your finished work before clearing browser data or switching devices.
