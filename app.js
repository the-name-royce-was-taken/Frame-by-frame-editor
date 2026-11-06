const $=id=>document.getElementById(id),canvas=$('c'),ctx=canvas.getContext('2d',{alpha:false}),video=$('preview-video');
let sourceVideo=null,stitchedPreviewUrl=null;
let frames=[],index=0,tool='pen',drawing=false,start,last,selection=null,clipboard=null,paste=null,audioFile=null,videoFile=null,undoStack=[],playTimer=null,activeDraw=document.createElement('canvas'),activeBase=null,frameSeq=0,loadToken=0,previewCallback=0,previewPlaying=false,frameDuration=1/30;
activeDraw.width=canvas.width;activeDraw.height=canvas.height;
const key=(kind)=>kind+'-'+Date.now().toString(36)+'-'+(++frameSeq).toString(36);
function blankFrame(time=0){return {baseKey:null,drawKey:null,time};}
function dctx(){return activeDraw.getContext('2d');}
function resize(w,h){canvas.width=w;canvas.height=h;activeDraw.width=w;activeDraw.height=h;activeBase=null;}
async function storeBlob(kind,blob,frame){if(!blob)return;const k=key(kind);await FrameStore.put(k,blob);const old=frame[kind+'Key'];frame[kind+'Key']=k;if(old)await FrameStore.del(old)}
async function saveActive(){if(!frames.length)return;const blob=await new Promise(r=>activeDraw.toBlob(r,'image/webp',.72));await storeBlob('draw',blob,frames[index])}
async function bitmapFromKey(k){const blob=await FrameStore.get(k);return blob?await createImageBitmap(blob):null}
async function loadFrame(i){if(!frames.length)return;await saveActive();index=Math.max(0,Math.min(frames.length-1,i));const token=++loadToken,frame=frames[index];activeDraw.width=canvas.width;activeDraw.height=canvas.height;activeBase=null;try{activeBase=await bitmapFromKey(frame.baseKey);if(token!==loadToken){activeBase?.close?.();return}const draw=await bitmapFromKey(frame.drawKey);if(draw){dctx().drawImage(draw,0,0);draw.close?.()}}catch(err){$('status').textContent='Could not load frame from local storage: '+err.message}selection=null;paste=null;await render();timeline()}
async function render(){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);if(activeBase)ctx.drawImage(activeBase,0,0,canvas.width,canvas.height);ctx.drawImage(activeDraw,0,0);if(selection){ctx.save();ctx.setLineDash([7,4]);ctx.strokeStyle='#7665ef';ctx.lineWidth=2;ctx.strokeRect(selection.x,selection.y,selection.w,selection.h);ctx.restore()}if(paste)ctx.drawImage(paste.img,paste.x,paste.y);$('count').textContent='Frame '+(index+1)+' / '+frames.length;$('scrub').max=Math.max(0,frames.length-1);$('scrub').value=index;$('timeline-count').textContent=frames.length+' frame'+(frames.length===1?'':'s');$('canvas-label').textContent=canvas.width+' × '+canvas.height;$('empty-state').hidden=frames.length>0;$('media-placeholder').hidden=!!videoFile||!!audioFile}
function timeline(){const wrap=$('timeline');wrap.innerHTML='';const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){const item=entry.target;observer.unobserve(item);drawThumb(frames[+item.dataset.frame],item.querySelector('canvas'))}}},{root:wrap,rootMargin:'100px'});frames.forEach((f,i)=>{const item=document.createElement('div');item.className='thumb'+(i===index?' active':'');item.dataset.frame=i;item.title='Frame '+(i+1);const thumb=document.createElement('canvas');thumb.width=152;thumb.height=76;const t=thumb.getContext('2d');t.fillStyle='#fff';t.fillRect(0,0,152,76);item.append(thumb);const label=document.createElement('small');label.textContent=i+1;item.append(label);item.onclick=()=>loadFrame(i);wrap.append(item);observer.observe(item)})}
async function drawThumb(f,thumb){const t=thumb.getContext('2d');try{const b=await bitmapFromKey(f.baseKey);if(b){t.drawImage(b,0,0,thumb.width,thumb.height);b.close?.()}const d=await bitmapFromKey(f.drawKey);if(d){t.drawImage(d,0,0,thumb.width,thumb.height);d.close?.()}}catch(e){console.warn('Thumbnail load failed',e)}}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
function snapshot(){undoStack.push(activeDraw.toDataURL());if(undoStack.length>8)undoStack.shift()}
function rect(a,b){return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)}}
function paint(p){const d=dctx();d.lineWidth=+$('size').value;d.strokeStyle=$('color').value;d.lineCap='round';d.lineJoin='round';d.globalCompositeOperation=tool==='eraser'?'destination-out':'source-over';if(tool==='eraser')d.lineWidth*=3;d.beginPath();if(tool==='pen'||tool==='eraser'){d.moveTo(last.x,last.y);d.lineTo(p.x,p.y)}else{d.moveTo(start.x,start.y);if(tool==='line')d.lineTo(p.x,p.y);else if(tool==='rect')d.rect(start.x,start.y,p.x-start.x,p.y-start.y);else if(tool==='ellipse')d.ellipse((start.x+p.x)/2,(start.y+p.y)/2,Math.max(1,Math.abs(p.x-start.x)/2),Math.max(1,Math.abs(p.y-start.y)/2),0,0,Math.PI*2)}d.stroke();d.globalCompositeOperation='source-over'}
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('active',x===b))});
$('size').oninput=e=>$('size-value').textContent=e.target.value+' px';
canvas.onpointerdown=e=>{if(!frames.length)return;canvas.setPointerCapture(e.pointerId);drawing=true;start=last=point(e);if(tool==='select'){selection={...start,w:0,h:0};render()}else if(paste){paste.x=start.x;paste.y=start.y}else snapshot()};
canvas.onpointermove=e=>{if(!drawing)return;const p=point(e);if(tool==='select'){selection=rect(start,p);render();return}if(paste){paste.x=p.x;paste.y=p.y;render();return}if(tool==='pen'||tool==='eraser')paint(p);else{render();paint(p)}last=p;render()};
canvas.onpointerup=async()=>{drawing=false;if(paste){dctx().drawImage(paste.img,paste.x,paste.y);paste=null}if(selection)selection=rect(start,{x:start.x+selection.w,y:start.y+selection.h});await saveActive();render();timeline()};
async function buildStitchedPreview(){
 if(!frames.length)throw Error('There are no frames to play.');
 $('status').textContent='Preparing edited frames for playback…';
 const {FFmpeg}=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
 const {toBlobURL}=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js');
 const ff=new FFmpeg();
 ff.on('log',({message})=>{if(message)$('status').textContent='Building playback: '+message.slice(-90)});
 const ffmpegBase='https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm';
 const coreBase='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
 await ff.load({
  // The FFmpeg API worker must start from this site's origin. This tiny
  // same-origin module shim imports FFmpeg's worker and its sibling modules.
  classWorkerURL:new URL('./ffmpeg-worker.js',document.baseURI).href,
  coreURL:await toBlobURL(coreBase+'/ffmpeg-core.js','text/javascript'),
  wasmURL:await toBlobURL(coreBase+'/ffmpeg-core.wasm','application/wasm')
 });
 const fps=Math.max(1,Math.min(60,Math.round(1/Math.max(.001,frameDuration))));
 for(let i=0;i<frames.length;i++){
  const blob=await exportFrame(frames[i]);
  if(!blob)throw Error('Could not render frame '+(i+1));
  await ff.writeFile('preview'+String(i).padStart(5,'0')+'.png',new Uint8Array(await blob.arrayBuffer()));
  if(i%10===0)$('status').textContent='Preparing playback frame '+(i+1)+' / '+frames.length;
 }
 const args=['-framerate',String(fps),'-i','preview%05d.png'];
 let audioInput=false;
 if(audioFile){
  const ext=(audioFile.name.split('.').pop()||'mp3').toLowerCase();
  await ff.writeFile('preview-audio.'+ext,new Uint8Array(await audioFile.arrayBuffer()));
  args.push('-i','preview-audio.'+ext);audioInput=true;
 }else if(videoFile){
  const ext=(videoFile.name.split('.').pop()||'mp4').toLowerCase();
  await ff.writeFile('preview-source.'+ext,new Uint8Array(await videoFile.arrayBuffer()));
  args.push('-i','preview-source.'+ext);audioInput=true;
 }
 args.push('-map','0:v:0');
 if(audioInput)args.push('-map','1:a:0?');
 args.push('-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-movflags','+faststart');
 if(audioInput)args.push('-c:a','aac','-b:a','128k','-shortest');
 args.push('edited-preview.mp4');
 $('status').textContent='Encoding stitched playback video…';
 const exitCode=await ff.exec(args);
 if(exitCode!==0)throw Error('The video encoder returned code '+exitCode);
 const output=await ff.readFile('edited-preview.mp4');
 if(!output||!output.length)throw Error('The video encoder produced an empty MP4.');
 const blob=new Blob([output],{type:'video/mp4'});
 if(stitchedPreviewUrl)URL.revokeObjectURL(stitchedPreviewUrl);
 stitchedPreviewUrl=URL.createObjectURL(blob);
 video.pause();video.src=stitchedPreviewUrl;video.controls=true;video.muted=false;
 video.playbackRate=Number($('preview-speed').value)||1;video.load();
 await new Promise((resolve,reject)=>{
  if(video.readyState>=1){resolve();return}
  video.addEventListener('loadedmetadata',resolve,{once:true});
  video.addEventListener('error',()=>reject(Error('Chrome could not open the encoded preview video.')),{once:true});
 });
}
$('open').onclick=$('empty-import').onclick=()=>$('file').click();
$('file').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(f.type.startsWith('audio')){audioFile=f;$('aud').src=URL.createObjectURL(f);$('aud').hidden=false;$('info').textContent=f.name+' · audio soundtrack';if(!frames.length){frames=[blankFrame()];await loadFrame(0)}return}
videoFile=f;sourceVideo=document.createElement('video');sourceVideo.src=URL.createObjectURL(f);sourceVideo.preload='auto';sourceVideo.playsInline=true;sourceVideo.muted=true;$('info').textContent='Reading every decoded frame…';$('status').textContent='Extracting original frames…';await new Promise((resolve,reject)=>{sourceVideo.onloadedmetadata=resolve;sourceVideo.onerror=reject});resize(sourceVideo.videoWidth,sourceVideo.videoHeight);frames=[];const temp=document.createElement('canvas');temp.width=canvas.width;temp.height=canvas.height;const tc=temp.getContext('2d',{alpha:false});let chain=Promise.resolve(),captured=0,lastTime=-1;frameDuration=1/30;await new Promise((resolve,reject)=>{let ended=false;const finish=()=>{if(ended)return;ended=true;sourceVideo.pause();resolve()};sourceVideo.onended=finish;sourceVideo.onerror=()=>reject(Error('Video decoding failed'));const capture=(now,meta)=>{if(ended)return;const stamp=meta.mediaTime;if(stamp>lastTime+0.000001){lastTime=stamp;tc.drawImage(sourceVideo,0,0,temp.width,temp.height);chain=chain.then(()=>new Promise(done=>temp.toBlob(async blob=>{try{if(blob){const frame=blankFrame(stamp);frame.baseKey=key('base');await FrameStore.put(frame.baseKey,blob);frames.push(frame);captured++;if(captured%30===0){$('status').textContent='Saved '+captured+' original frames…';await new Promise(r=>setTimeout(r,0))}}}finally{done()}},'image/webp',.72)))}if(sourceVideo.requestVideoFrameCallback)sourceVideo.requestVideoFrameCallback(capture);else finish()};if(sourceVideo.requestVideoFrameCallback)sourceVideo.requestVideoFrameCallback(capture);sourceVideo.play().catch(reject);setTimeout(finish,Math.ceil(sourceVideo.duration*1000)+5000)});await chain;sourceVideo.muted=false;frameDuration=frames.length>1?(frames[frames.length-1].time-frames[0].time)/(frames.length-1):1/30;await loadFrame(0);sourceVideo.currentTime=0;$('info').textContent=f.name+' · '+canvas.width+'×'+canvas.height+' · '+captured+' decoded frames · source audio retained';$('status').textContent='Stitching smooth preview…';$('status').textContent='Frames imported · use Preview edited video to build playback';};
$('prev').onclick=()=>loadFrame(index-1);$('next').onclick=()=>loadFrame(index+1);$('scrub').oninput=e=>loadFrame(+e.target.value);
$('add').onclick=async()=>{await saveActive();frames.splice(index+1,0,blankFrame());await loadFrame(index+1)};
$('undo').onclick=async()=>{const data=undoStack.pop();if(data){const im=new Image();im.onload=async()=>{activeDraw.width=canvas.width;activeDraw.height=canvas.height;dctx().drawImage(im,0,0);await saveActive();render()};im.src=data}};
$('clear').onclick=async()=>{snapshot();dctx().clearRect(0,0,canvas.width,canvas.height);await saveActive();render();timeline()};
$('copy').onclick=()=>{if(!selection)return alert('Select an area first');clipboard=document.createElement('canvas');clipboard.width=Math.max(1,Math.round(selection.w));clipboard.height=Math.max(1,Math.round(selection.h));clipboard.getContext('2d').drawImage(activeDraw,selection.x,selection.y,selection.w,selection.h,0,0,clipboard.width,clipboard.height)};
$('paste').onclick=()=>{if(clipboard){paste={img:clipboard,x:40,y:40};render()}};
function stopPreview(){previewPlaying=false;video.pause();$('play').textContent='▶ Play'}video.addEventListener('ended',stopPreview);$('play').onclick=async()=>{if(previewPlaying){stopPreview();return}const playButton=$('play');playButton.disabled=true;$('status').textContent='Preparing edited playback…';try{await saveActive();$('preview-dialog').showModal();await buildStitchedPreview();video.currentTime=0;previewPlaying=true;playButton.textContent='Ⅱ Pause';try{await video.play();$('status').textContent='Playing stitched edited frames'}catch(playError){previewPlaying=false;playButton.textContent='▶ Play';$('status').textContent='Preview ready — press Play in the video controls to start.'}}catch(err){console.error(err);$('status').textContent='Preview failed: '+err.message;alert('Could not create the edited video preview: '+err.message)}finally{playButton.disabled=false}};$('preview-close').onclick=()=>{stopPreview();$('preview-dialog').close()};$('preview-dialog').addEventListener('click',e=>{if(e.target===$('preview-dialog')){$('preview-close').click()}});$('preview-speed').onchange=e=>{video.playbackRate=Number(e.target.value)};
async function exportFrame(frame){const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const x=out.getContext('2d',{alpha:false});x.fillStyle='#fff';x.fillRect(0,0,out.width,out.height);const base=await bitmapFromKey(frame.baseKey);if(base){x.drawImage(base,0,0,out.width,out.height);base.close?.()}const draw=await bitmapFromKey(frame.drawKey);if(draw){x.drawImage(draw,0,0);draw.close?.()}return new Promise(resolve=>out.toBlob(resolve,'image/png'))}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$('export').onclick=async()=>{if(!frames.length)return alert('Add or import frames before exporting.');const fmt=$('format').value;try{if(fmt==='webm'){const stream=canvas.captureStream(Math.max(1,Math.round(1/frameDuration))),rec=new MediaRecorder(stream),chunks=[];rec.ondataavailable=e=>chunks.push(e.data);rec.start();for(let i=0;i<frames.length;i++){await loadFrame(i);await new Promise(r=>setTimeout(r,frameDuration*1000))}rec.stop();await new Promise(r=>rec.onstop=r);download(new Blob(chunks,{type:'video/webm'}),'frameforge.webm');return}
$('status').textContent='Loading FFmpeg…';const {FFmpeg}=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js'),{toBlobURL}=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js'),ff=new FFmpeg();await ff.load({coreURL:await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js','text/javascript'),wasmURL:await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm','application/wasm')});for(let i=0;i<frames.length;i++){const blob=await exportFrame(frames[i]);await ff.writeFile('frame'+String(i).padStart(5,'0')+'.png',new Uint8Array(await blob.arrayBuffer()));if(i%8===0)$('status').textContent='Export prep '+(i+1)+' / '+frames.length}
const mov=['mov','movhevc','mpeg4'].includes(fmt),hevc=['hevc','movhevc'].includes(fmt),codec=hevc?'libx265':fmt==='mpeg4'?'mpeg4':'libx264',ext=mov?'mov':'mp4',args=['-framerate',String(Math.max(1,Math.round(1/frameDuration))),'-i','frame%05d.png'];if(audioFile){await ff.writeFile('soundtrack.mp3',new Uint8Array(await audioFile.arrayBuffer()));args.push('-i','soundtrack.mp3','-shortest')}args.push('-c:v',codec,'-pix_fmt','yuv420p');if(codec==='libx264')args.push('-preset','ultrafast');args.push('out.'+ext);$('status').textContent='Encoding export…';await ff.exec(args);const output=await ff.readFile('out.'+ext);download(new Blob([output.buffer],{type:ext==='mov'?'video/quicktime':'video/mp4'}),'frameforge.'+ext);$('status').textContent='Export finished'}catch(err){$('status').textContent='Export failed: '+err.message+' (try WebM)';console.error(err)}};
window.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z')$('undo').click();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c')$('copy').click();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v')$('paste').click();if(e.key==='ArrowLeft')loadFrame(index-1);if(e.key==='ArrowRight')loadFrame(index+1)});
frames=[blankFrame(0)];loadFrame(0);