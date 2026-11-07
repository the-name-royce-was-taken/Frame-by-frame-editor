const $=id=>document.getElementById(id),canvas=$('c'),ctx=canvas.getContext('2d',{alpha:false}),video=$('preview-video');
let sourceVideo=null,stitchedPreviewUrl=null,shapePreviewEnd=null;
let activeDrawDirty=false,frames=[],index=0,tool='pen',drawing=false,start,last,selection=null,textItems=[],textSelectionIndex=-1,textDrag=null,imageItems=[],imageSelectionIndex=-1,imageDrag=null,clipboard=null,clipboardPosition=null,paste=null,audioFile=null,videoFile=null,audioTrackSource=null,audioDuration=0,audioOffsetFrame=0,audioDrag=null,undoStack=[],playTimer=null,activeDraw=document.createElement('canvas'),activeBase=null,frameSeq=0,loadToken=0,previewCallback=0,previewPlaying=false,frameDuration=1/30;
activeDraw.width=canvas.width;activeDraw.height=canvas.height;
const key=(kind)=>kind+'-'+Date.now().toString(36)+'-'+(++frameSeq).toString(36);
function blankFrame(time=0){return {baseKey:null,drawKey:null,textKey:null,images:[],time};}
function imageMetadata(){return imageItems.map(({key,x,y,w,h})=>({key,x,y,w,h}))}
function syncFrameImages(){if(frames[index])frames[index].images=imageMetadata()}
function drawImageItems(target,handles=false){imageItems.forEach((o,i)=>{if(!o.bitmap)return;target.drawImage(o.bitmap,o.x,o.y,o.w,o.h);if(handles&&i===imageSelectionIndex){target.save();target.strokeStyle='#ad5b3d';target.lineWidth=2;target.setLineDash([5,3]);target.strokeRect(o.x,o.y,o.w,o.h);target.setLineDash([]);target.fillStyle='#ad5b3d';target.fillRect(o.x+o.w-7,o.y+o.h-7,14,14);target.restore()}})}
async function saveTextItems(){if(!frames.length)return;const f=frames[index],blob=new Blob([JSON.stringify(textItems)],{type:'application/json'});const k=key('text');await FrameStore.put(k,blob);if(f.textKey)await FrameStore.del(f.textKey);f.textKey=k}
function fitTextBounds(o){const target=ctx;target.save();target.font=`${o.bold?'bold ':''}${o.size}px ${o.font||'Arial'}`;const lines=String(o.text||'').split(/\r?\n/);o.w=Math.max(20,...lines.map(line=>target.measureText(line).width));o.h=Math.max(o.size,lines.length*o.size*1.2);target.restore()}
function drawTextItems(target,items=textItems,handles=false){items.forEach((o,i)=>{target.save();target.font=`${o.bold?'bold ':''}${o.size}px ${o.font||'Arial'}`;target.fillStyle=o.color;target.textBaseline='top';const lines=String(o.text).split(/\r?\n/);lines.forEach((line,j)=>{const y=o.y+j*o.size*1.2;target.fillText(line,o.x,y);if(o.underline){const w=target.measureText(line).width;target.beginPath();target.lineWidth=Math.max(1,o.size/16);target.strokeStyle=o.color;target.moveTo(o.x,y+o.size*1.05);target.lineTo(o.x+w,y+o.size*1.05);target.stroke()}});if(handles&&i===textSelectionIndex){target.strokeStyle='#8878ff';target.lineWidth=2;target.setLineDash([5,3]);target.strokeRect(o.x-3,o.y-3,o.w+6,o.h+6);target.setLineDash([]);target.fillStyle='#8878ff';target.fillRect(o.x+o.w-6,o.y+o.h-6,12,12)}target.restore()})}
let textEditor=null,textEditorIndex=-1,textFontControl=null,textFontSelect=null;
const textFontOptions=['Arial','Arial Black','Arial Narrow','Brush Script MT','Comic Sans MS','Courier New','Georgia','Impact','Lucida Console','Lucida Sans Unicode','Palatino Linotype','Tahoma','Times New Roman','Trebuchet MS','Verdana','Garamond','Bookman Old Style','Century Gothic','Franklin Gothic Medium','Gill Sans','Helvetica','Monaco','Copperplate','Papyrus','system-ui'];
function updateTextFontControl(){
 if(!textFontControl||!textFontSelect)return;
 const visible=tool==='cursor'&&!textEditor&&textSelectionIndex>=0&&!!textItems[textSelectionIndex]?.text;
 textFontControl.hidden=!visible;
 if(!visible)textFontSelect.hidden=true;
 if(!visible)return;
 const o=textItems[textSelectionIndex],cr=canvas.getBoundingClientRect(),sr=$('stage').getBoundingClientRect();
 textFontControl.style.left=(cr.left-sr.left+(o.x+o.w)*cr.width/canvas.width-8)+'px';
 textFontControl.style.top=(cr.top-sr.top+o.y*cr.height/canvas.height-8)+'px';
 textFontSelect.style.left=(cr.left-sr.left+(o.x+o.w)*cr.width/canvas.width-150)+'px';
 textFontSelect.style.top=(cr.top-sr.top+o.y*cr.height/canvas.height+4)+'px';
 [...textFontSelect.children].forEach(item=>item.classList.toggle('selected',item.dataset.font===(o.font||'Arial')));
}
function initTextFontControl(){
 const stage=$('stage');
 textFontControl=document.createElement('button');textFontControl.type='button';textFontControl.className='text-font-toggle';textFontControl.textContent='T';textFontControl.title='Change font';textFontControl.setAttribute('aria-label','Change font');textFontControl.hidden=true;
 textFontSelect=document.createElement('div');textFontSelect.className='text-font-select';textFontSelect.setAttribute('role','listbox');textFontSelect.setAttribute('aria-label','Font family');textFontSelect.hidden=true;
 textFontOptions.forEach(name=>{const option=document.createElement('button');option.type='button';option.className='text-font-option';option.dataset.font=name;option.textContent=name;option.style.fontFamily=name;option.setAttribute('role','option');option.addEventListener('pointerdown',e=>e.stopPropagation());option.addEventListener('click',async e=>{e.stopPropagation();const o=textItems[textSelectionIndex];if(!o)return;o.font=name;fitTextBounds(o);textFontSelect.hidden=true;await saveTextItems();render();timeline()});textFontSelect.append(option)});
 textFontControl.addEventListener('pointerdown',e=>e.stopPropagation());
 textFontControl.addEventListener('click',e=>{e.stopPropagation();textFontSelect.hidden=!textFontSelect.hidden;if(!textFontSelect.hidden)updateTextFontControl()});
 textFontSelect.addEventListener('pointerdown',e=>e.stopPropagation());
 stage.append(textFontControl,textFontSelect);
}
function openTextEditor(i,x,y){
 if(textEditor)finishTextEditor();
 const existing=i>=0?textItems[i]:null;
 if(!existing){const size=Math.max(16,+$('size').value*2),p={x,y,w:160,h:size*1.4,size,color:$('color').value,font:'Arial',bold:false,underline:false,text:''};textItems.push(p);i=textItems.length-1}textSelectionIndex=i;
 textEditorIndex=i;const o=textItems[i],stage=$('stage'),cr=canvas.getBoundingClientRect(),sr=stage.getBoundingClientRect();
 textEditor=document.createElement('textarea');textEditor.className='canvas-text-editor';textEditor.value=existing?o.text:'';textEditor.placeholder='Type here…';textEditor.spellcheck=false;textEditor.style.pointerEvents='auto';
 textEditor.style.left=(cr.left-sr.left+o.x*cr.width/canvas.width)+'px';textEditor.style.top=(cr.top-sr.top+o.y*cr.height/canvas.height)+'px';
 textEditor.style.width=Math.max(130,o.w*cr.width/canvas.width)+'px';textEditor.style.minHeight=Math.max(35,o.h*cr.height/canvas.height)+'px';
 textEditor.style.fontSize=(o.size*cr.width/canvas.width)+'px';textEditor.style.color=o.color;textEditor.style.fontFamily=o.font||'Arial';
 textEditor.style.fontWeight=o.bold?'bold':'normal';textEditor.style.textDecoration=o.underline?'underline':'none';stage.appendChild(textEditor);

 textEditor.addEventListener('keydown',e=>{const mod=e.ctrlKey||e.metaKey;if(mod&&e.key.toLowerCase()==='b'){e.preventDefault();o.bold=!o.bold;textEditor.style.fontWeight=o.bold?'bold':'normal';return}if(mod&&e.key.toLowerCase()==='u'){e.preventDefault();o.underline=!o.underline;textEditor.style.textDecoration=o.underline?'underline':'none';return}if(e.key==='Escape'){e.preventDefault();cancelTextEditor()}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();finishTextEditor()}})
 textEditor.addEventListener('blur',()=>{setTimeout(()=>{if(textEditor)finishTextEditor()},0)});textEditor.focus();
}
async function finishTextEditor(){if(!textEditor)return;const editor=textEditor,i=textEditorIndex; textEditor=null;textEditorIndex=-1;const value=editor.value.trimEnd();editor.toolbar?.remove();editor.remove();if(i<0)return;if(!value.trim()){textItems.splice(i,1)}else{const o=textItems[i];o.text=value;const tc=ctx;tc.font=`${o.bold?'bold ':''}${o.size}px ${o.font}`;const lines=value.split(/\r?\n/);o.w=Math.max(30,...lines.map(line=>tc.measureText(line).width));o.h=Math.max(o.size,lines.length*o.size*1.2)}await saveTextItems();render();timeline()}
function cancelTextEditor(){if(!textEditor)return;const i=textEditorIndex;textEditor.toolbar?.remove();textEditor.remove();textEditor=null;textEditorIndex=-1;if(i>=0&&!textItems[i]?.text)textItems.splice(i,1);render()}
function dctx(){return activeDraw.getContext('2d');}
function resize(w,h){canvas.width=w;canvas.height=h;activeDraw.width=w;activeDraw.height=h;activeBase=null;}
async function storeBlob(kind,blob,frame){if(!blob)return;const k=key(kind);await FrameStore.put(k,blob);const old=frame[kind+'Key'];frame[kind+'Key']=k;if(old)await FrameStore.del(old)}
async function saveActive(){if(!frames.length||!activeDrawDirty)return;const blob=await new Promise(r=>activeDraw.toBlob(r,'image/webp',.72));await storeBlob('draw',blob,frames[index]);activeDrawDirty=false}
async function bitmapFromKey(k){const blob=await FrameStore.get(k);return blob?await createImageBitmap(blob):null}
async function loadFrame(i){if(!frames.length)return;await saveActive();index=Math.max(0,Math.min(frames.length-1,i));const token=++loadToken,frame=frames[index];activeDraw.width=canvas.width;activeDraw.height=canvas.height;activeBase=null;activeDrawDirty=false;textItems=[];imageItems.forEach(o=>o.bitmap?.close?.());imageItems=[];imageSelectionIndex=-1;try{if(frame.textKey){const tb=await FrameStore.get(frame.textKey);if(tb)textItems=JSON.parse(await tb.text())}for(const item of (frame.images||[])){const blob=await FrameStore.get(item.key);if(blob)imageItems.push({...item,bitmap:await createImageBitmap(blob)})}activeBase=await bitmapFromKey(frame.baseKey);if(token!==loadToken){activeBase?.close?.();return}const draw=await bitmapFromKey(frame.drawKey);if(draw){dctx().drawImage(draw,0,0);draw.close?.()}}catch(err){$('status').textContent='Could not load frame from local storage: '+err.message}selection=null;paste=null;textSelectionIndex=-1;await render();timeline()}
async function render(){ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);if(activeBase)ctx.drawImage(activeBase,0,0,canvas.width,canvas.height);ctx.drawImage(activeDraw,0,0);drawImageItems(ctx,tool==='cursor');drawTextItems(ctx,textItems,tool==='text'||tool==='cursor');if(shapePreviewEnd&&['line','rect','ellipse'].includes(tool))drawShape(ctx,start,shapePreviewEnd);if(selection){ctx.save();ctx.setLineDash([7,4]);ctx.strokeStyle='#7665ef';ctx.lineWidth=2;ctx.strokeRect(selection.x,selection.y,selection.w,selection.h);ctx.restore()}if(paste)ctx.drawImage(paste.img,paste.x,paste.y);updateTextFontControl();$('count').textContent='Frame '+(index+1)+' / '+frames.length;$('scrub').max=Math.max(0,frames.length-1);$('scrub').value=index;$('timeline-count').textContent=frames.length+' frame'+(frames.length===1?'':'s');$('canvas-label').textContent=canvas.width+' × '+canvas.height;$('empty-state').hidden=frames.length>0;$('media-placeholder').hidden=!!videoFile||!!audioFile}
async function deleteTimelineFrame(i){if(i<0||i>=frames.length||frames.length<=1)return;await saveActive();const removed=frames.splice(i,1)[0];pushUndo({type:'delete-frame',frame:removed,index:i,wasCurrent:i===index,selectedIndex:index});if(i<index)index--;else if(i===index)index=Math.min(i,frames.length-1);await loadFrame(index)}
function timeline(){const wrap=$('timeline');wrap.innerHTML='';const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){const item=entry.target;observer.unobserve(item);drawThumb(frames[+item.dataset.frame],item.querySelector('canvas'))}}},{root:wrap,rootMargin:'100px'});frames.forEach((f,i)=>{const item=document.createElement('div');item.className='thumb'+(i===index?' active':'');item.dataset.frame=i;item.title='Frame '+(i+1);const thumb=document.createElement('canvas');thumb.width=152;thumb.height=76;const t=thumb.getContext('2d');t.fillStyle='#fff';t.fillRect(0,0,152,76);item.append(thumb);const remove=document.createElement('button');remove.className='thumb-delete';remove.type='button';remove.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4h10M6 4V2.8h4V4M5 4l.5 9h5L11 4M6.5 6v5m3-5v5"/></svg>';remove.title='Delete frame '+(i+1);remove.setAttribute('aria-label','Delete frame '+(i+1));remove.disabled=frames.length<=1;remove.onclick=e=>{e.stopPropagation();deleteTimelineFrame(i)};item.append(remove);const label=document.createElement('small');label.textContent=i+1;item.append(label);item.onclick=()=>loadFrame(i);wrap.append(item);observer.observe(item)});updateAudioTrack()}
async function drawThumb(f,thumb){const t=thumb.getContext('2d');try{const b=await bitmapFromKey(f.baseKey);if(b){t.drawImage(b,0,0,thumb.width,thumb.height);b.close?.()}const d=await bitmapFromKey(f.drawKey);if(d){t.drawImage(d,0,0,thumb.width,thumb.height);d.close?.()}for(const item of (f.images||[])){const blob=await FrameStore.get(item.key);if(blob){const bitmap=await createImageBitmap(blob);t.drawImage(bitmap,item.x*thumb.width/canvas.width,item.y*thumb.height/canvas.height,item.w*thumb.width/canvas.width,item.h*thumb.height/canvas.height);bitmap.close?.()}}}catch(e){console.warn('Thumbnail load failed',e)}}
function updateAudioTrack(){
 const row=$('audio-track-row'),lane=$('audio-track-lane'),clip=$('audio-track-clip'),empty=$('audio-track-empty');
 if(!row||!lane||!clip)return;
 row.hidden=false;
 const framePx=83;
 const hasAudio=!!audioTrackSource;
 const clipFrames=hasAudio?Math.max(1,Math.ceil((audioDuration||frames.length*frameDuration)/Math.max(.001,frameDuration))):0;
 const laneFrames=Math.max(frames.length,hasAudio?frames.length+clipFrames-1:1);
 lane.style.width=Math.max(76,laneFrames*framePx-7)+'px';
 clip.hidden=!hasAudio;
 if(empty){empty.hidden=hasAudio;empty.textContent=frames.length?'No audio yet — use “Add soundtrack”':'Import audio or video to add a soundtrack';}
 if(!hasAudio)return;
 clip.style.width=Math.max(24,Math.min(laneFrames*framePx-7,clipFrames*framePx-7))+'px';
 const maxOffset=Math.max(0,laneFrames-clipFrames);
 audioOffsetFrame=Math.max(0,Math.min(maxOffset,audioOffsetFrame));
 clip.style.left=(audioOffsetFrame*framePx)+'px';
 $('audio-track-label').textContent=(audioTrackSource==='video'?'Video audio':'Imported audio')+' · starts at frame '+(audioOffsetFrame+1);
}
$('audio-track-clip').onpointerdown=e=>{if(!audioTrackSource)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);audioDrag={x:e.clientX,offset:audioOffsetFrame}};
$('audio-track-clip').onpointermove=e=>{if(!audioDrag)return;audioOffsetFrame=Math.max(0,audioDrag.offset+Math.round((e.clientX-audioDrag.x)/83));updateAudioTrack()};
$('audio-track-clip').onpointerup=()=>{audioDrag=null;updateAudioTrack()};
$('audio-track-clip').onpointercancel=()=>{audioDrag=null;updateAudioTrack()};
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
function pushUndo(action){undoStack.push(action);if(undoStack.length>8)undoStack.shift()}function snapshot(){pushUndo({type:'draw',data:activeDraw.toDataURL()})}
function rect(a,b){return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(b.x-a.x),h:Math.abs(b.y-a.y)}}
function drawShape(target,startPoint,endPoint){
 const d=target;d.save();d.lineWidth=+$('size').value;d.strokeStyle=$('color').value;d.lineCap='round';d.lineJoin='round';d.globalCompositeOperation='source-over';d.beginPath();
 if(tool==='line'){d.moveTo(startPoint.x,startPoint.y);d.lineTo(endPoint.x,endPoint.y)}
 else if(tool==='rect'){d.rect(startPoint.x,startPoint.y,endPoint.x-startPoint.x,endPoint.y-startPoint.y)}
 else if(tool==='ellipse'){d.ellipse((startPoint.x+endPoint.x)/2,(startPoint.y+endPoint.y)/2,Math.max(1,Math.abs(endPoint.x-startPoint.x)/2),Math.max(1,Math.abs(endPoint.y-startPoint.y)/2),0,0,Math.PI*2)}
 d.stroke();d.restore();
}
function paint(p){const d=dctx();d.lineWidth=+$('size').value;d.strokeStyle=$('color').value;d.lineCap='round';d.lineJoin='round';d.globalCompositeOperation=tool==='eraser'?'destination-out':'source-over';if(tool==='eraser')d.lineWidth*=3;d.beginPath();if(tool==='pen'||tool==='eraser'){d.moveTo(last.x,last.y);d.lineTo(p.x,p.y)}d.stroke();d.globalCompositeOperation='source-over'}

let textClipboard=null;
async function copySelectedText(cut=false){
 if(textSelectionIndex<0||!textItems[textSelectionIndex]){ $('status').textContent='Select a text object first'; return; }
 textClipboard=JSON.parse(JSON.stringify(textItems[textSelectionIndex]));
 if(cut){textItems.splice(textSelectionIndex,1);textSelectionIndex=-1;await saveTextItems();render();timeline();$('status').textContent='Text cut — paste keeps its original position'}
 else $('status').textContent='Text copied — paste keeps its original position';
}
async function pasteSelectedText(){
 if(!textClipboard){$('status').textContent='Copy or cut a text object first';return}
 const copy=JSON.parse(JSON.stringify(textClipboard));
 textItems.push(copy);textSelectionIndex=textItems.length-1;
 await saveTextItems();render();timeline();$('status').textContent='Text pasted at its original position';
}
async function deleteSelectedText(){
 if(textSelectionIndex<0||!textItems[textSelectionIndex]){$('status').textContent='Select a text object first';return}
 textItems.splice(textSelectionIndex,1);textSelectionIndex=-1;
 await saveTextItems();render();timeline();$('status').textContent='Text deleted';
}

function updateToolCursor(){const cursor=tool==='cursor'?'default':tool==='eraser'?'cell':'crosshair';canvas.style.cursor=cursor;$('stage').style.cursor=cursor;$('empty-state').style.pointerEvents='none';$('stage').classList.toggle('text-tool-active',tool==='text');}
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>{tool=b.dataset.tool;document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('active',x===b));updateToolCursor();render();}));
updateToolCursor();
initTextFontControl();
$('image-upload-button').onclick=()=>$('image-file').click();
$('image-file').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(!frames.length){frames=[blankFrame()];await loadFrame(0)}const bitmap=await createImageBitmap(file);if(!bitmap.width||!bitmap.height)throw Error('This image has no usable dimensions.');const imageKey=key('image');await FrameStore.put(imageKey,file);const item={key:imageKey,x:(canvas.width-bitmap.width)/2,y:(canvas.height-bitmap.height)/2,w:bitmap.width,h:bitmap.height,bitmap};imageItems.push(item);syncFrameImages();imageSelectionIndex=imageItems.length-1;textSelectionIndex=-1;tool='cursor';document.querySelectorAll('[data-tool]').forEach(x=>x.classList.toggle('active',x.dataset.tool==='cursor'));updateToolCursor();await render();timeline();$('status').textContent=file.name+' · '+bitmap.width+' × '+bitmap.height+' px';}catch(err){$('status').textContent='Could not load image: '+err.message;alert('Could not load this image: '+err.message)}};
$('size').oninput=e=>$('size-value').textContent=e.target.value+' px';
canvas.onpointerdown=e=>{
 if(!frames.length)return;
 drawing=true;start=last=point(e);
 if(tool==='cursor'){
  let hit=-1;for(let i=imageItems.length-1;i>=0;i--){const o=imageItems[i];if(start.x>=o.x&&start.x<=o.x+o.w&&start.y>=o.y&&start.y<=o.y+o.h){hit=i;break}}
  if(hit>=0){imageSelectionIndex=hit;textSelectionIndex=-1;textDrag=null;const o=imageItems[hit],resizeHit=start.x>=o.x+o.w-16&&start.y>=o.y+o.h-16;imageDrag={index:hit,mode:resizeHit?'resize':'move',x:start.x,y:start.y,ox:o.x,oy:o.y,ow:o.w,oh:o.h};canvas.setPointerCapture(e.pointerId);render();return}
  imageSelectionIndex=-1;
  const hit=textItems.findIndex(o=>start.x>=o.x-5&&start.x<=o.x+o.w+5&&start.y>=o.y-5&&start.y<=o.y+o.h+5);
  textSelectionIndex=hit;
  if(hit>=0){const o=textItems[hit],resizeHit=start.x>=o.x+o.w-14&&start.y>=o.y+o.h-14;textDrag={index:hit,mode:resizeHit?'resize':'move',x:start.x,y:start.y,ox:o.x,oy:o.y,ow:o.w,oh:o.h,os:o.size};canvas.setPointerCapture(e.pointerId)}
  else textDrag=null;
  drawing=hit>=0;render();return;
 }
 if(tool==='text'){
  const hit=textItems.findIndex(o=>start.x>=o.x-5&&start.x<=o.x+o.w+5&&start.y>=o.y-5&&start.y<=o.y+o.h+5);
  if(hit<0){drawing=false;return}
  canvas.setPointerCapture(e.pointerId);
  const o=textItems[hit],resizeHit=start.x>=o.x+o.w-14&&start.y>=o.y+o.h-14;
  textDrag={index:hit,mode:resizeHit?'resize':'move',x:start.x,y:start.y,ox:o.x,oy:o.y,ow:o.w,oh:o.h,os:o.size};
  render();return;
 }
 canvas.setPointerCapture(e.pointerId);
 if(tool==='select'){selection={...start,w:0,h:0};render()}
 else if(paste){paste.dragOffset={x:start.x-paste.x,y:start.y-paste.y}}
 else{snapshot();if(['line','rect','ellipse'].includes(tool))shapePreviewEnd={...start}}
};
canvas.addEventListener('dblclick',e=>{if(tool!=='cursor'||textEditor)return;const p=point(e),hit=textItems.findIndex(o=>p.x>=o.x-5&&p.x<=o.x+o.w+5&&p.y>=o.y-5&&p.y<=o.y+o.h+5);if(hit>=0)openTextEditor(hit,p.x,p.y)});
canvas.addEventListener('click',e=>{
 if(tool!=='text'||!frames.length||e.target!==canvas||textEditor)return;
 const p=point(e);
 const hit=textItems.findIndex(o=>p.x>=o.x-5&&p.x<=o.x+o.w+5&&p.y>=o.y-5&&p.y<=o.y+o.h+5);
 if(hit<0)openTextEditor(-1,p.x,p.y);
});
canvas.onpointermove=e=>{
 if(!drawing)return;
 const p=point(e);
 if(tool==='cursor'&&imageDrag){const o=imageItems[imageDrag.index],dx=p.x-imageDrag.x,dy=p.y-imageDrag.y;if(imageDrag.mode==='resize'){const scale=Math.max(.03,(imageDrag.ow+dx)/imageDrag.ow,(imageDrag.oh+dy)/imageDrag.oh);o.w=imageDrag.ow*scale;o.h=imageDrag.oh*scale}else{o.x=imageDrag.ox+dx;o.y=imageDrag.oy+dy}render();return}
 if((tool==='text'||tool==='cursor')&&textDrag){const o=textItems[textDrag.index],dx=p.x-textDrag.x,dy=p.y-textDrag.y;if(textDrag.mode==='resize'){o.size=Math.max(8,Math.min(300,textDrag.os+dx*.35));fitTextBounds(o)}else{o.x=textDrag.ox+dx;o.y=textDrag.oy+dy}render();return}
 if(tool==='select'){selection=rect(start,p);render();return}
 if(paste){paste.x=p.x-(paste.dragOffset?.x||0);paste.y=p.y-(paste.dragOffset?.y||0);render();return}
 if(['line','rect','ellipse'].includes(tool)){shapePreviewEnd=p}
 else if(tool==='pen'||tool==='eraser'){paint(p);activeDrawDirty=true;}
 last=p;render();
};
canvas.onpointerup=async e=>{
 if(!drawing)return;
 const p=point(e);drawing=false;
 if(tool==='cursor'&&imageDrag){imageDrag=null;syncFrameImages();render();timeline();return}
 if((tool==='text'||tool==='cursor')&&textDrag){const t=textDrag,dx=p.x-t.x,dy=p.y-t.y;textDrag=null;if(Math.abs(dx)+Math.abs(dy)<4){if(tool==='text')openTextEditor(t.index,p.x,p.y);else render();return}await saveTextItems();render();timeline();return}
 if(['line','rect','ellipse'].includes(tool)){
  // Commit exactly one final shape to the drawing layer. The live preview
  // was drawn only on the display canvas, never into activeDraw.
  drawShape(dctx(),start,p);activeDrawDirty=true;shapePreviewEnd=null;
 }
 if(paste){dctx().drawImage(paste.img,paste.x,paste.y);activeDrawDirty=true;paste=null}
 if(selection)selection=rect(start,{x:start.x+selection.w,y:start.y+selection.h});
 await saveActive();render();timeline();
};
canvas.onpointercancel=async()=>{
 if(!drawing)return;
 drawing=false;shapePreviewEnd=null;
 if(imageDrag){imageDrag=null;syncFrameImages()}
 textDrag=null;
 await saveActive();render();
};
async function createFFmpegInstance(){
 const {FFmpeg}=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
 const {toBlobURL}=await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js');
 const ff=new FFmpeg();
 const packageBase='https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm';
 const coreBase='https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
 // classWorkerURL is the FFmpeg API worker (not workerURL, which is only
 // for the multithreaded core). It must be hosted on this GitHub Pages origin.
 const classWorkerURL=new URL('ffmpeg-worker.js',window.location.href).href;
 await ff.load({
  classWorkerURL,
  coreURL:await toBlobURL(coreBase+'/ffmpeg-core.js','text/javascript'),
  wasmURL:await toBlobURL(coreBase+'/ffmpeg-core.wasm','application/wasm')
 });
 return ff;
}
async function buildStitchedPreview(){
 if(!frames.length)throw Error('There are no frames to play.');
 $('status').textContent='Preparing edited frames for playback…';
 const ff=await createFFmpegInstance();
 ff.on('log',({message})=>{if(message)$('status').textContent='Building playback: '+message.slice(-90)});
 const fps=Math.max(1,Math.min(60,Math.round(1/Math.max(.001,frameDuration))));
 for(let i=0;i<frames.length;i++){
  const blob=await exportFrame(frames[i]);
  if(!blob)throw Error('Could not render frame '+(i+1));
  await ff.writeFile('preview'+String(i).padStart(5,'0')+'.png',new Uint8Array(await blob.arrayBuffer()));
  if(i%10===0)$('status').textContent='Preparing playback frame '+(i+1)+' / '+frames.length;
 }
 const args=['-framerate',String(fps),'-i','preview%05d.png'];
 let audioInput=false;
 if(audioTrackSource==='file'&&audioFile){
  const ext=(audioFile.name.split('.').pop()||'mp3').toLowerCase();
  await ff.writeFile('preview-audio.'+ext,new Uint8Array(await audioFile.arrayBuffer()));
  args.push('-itsoffset',String(audioOffsetFrame*frameDuration),'-i','preview-audio.'+ext);audioInput=true;
 }else if(audioTrackSource==='video'&&videoFile){
  const ext=(videoFile.name.split('.').pop()||'mp4').toLowerCase();
  await ff.writeFile('preview-source.'+ext,new Uint8Array(await videoFile.arrayBuffer()));
  args.push('-itsoffset',String(audioOffsetFrame*frameDuration),'-i','preview-source.'+ext);audioInput=true;
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
async function loadAudioTrack(f){
 audioFile=f;audioTrackSource='file';audioOffsetFrame=0;
 const url=URL.createObjectURL(f);$('aud').src=url;$('aud').hidden=false;
 audioDuration=await new Promise(resolve=>{const probe=new Audio();probe.preload='metadata';probe.onloadedmetadata=()=>resolve(Number.isFinite(probe.duration)?probe.duration:0);probe.onerror=()=>resolve(0);probe.src=url});
 if(!frames.length){frames=[blankFrame()];await loadFrame(0)}
 $('info').textContent=f.name+' · separate audio track';$('status').textContent='Soundtrack loaded';updateAudioTrack();
}
$('audio-upload').onclick=()=>$('audio-file').click();
$('audio-file').onchange=async e=>{const f=e.target.files?.[0];if(f)await loadAudioTrack(f);e.target.value=''};
$('open').onclick=$('empty-import').onclick=()=>$('file').click();
$('file').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;if(f.type.startsWith('audio')){await loadAudioTrack(f);return}
videoFile=f;audioFile=null;audioTrackSource='video';audioOffsetFrame=0;sourceVideo=document.createElement('video');sourceVideo.src=URL.createObjectURL(f);sourceVideo.preload='auto';sourceVideo.playsInline=true;sourceVideo.muted=true;$('info').textContent='Reading every decoded frame…';$('status').textContent='Extracting original frames…';await new Promise((resolve,reject)=>{sourceVideo.onloadedmetadata=resolve;sourceVideo.onerror=reject});audioDuration=Number.isFinite(sourceVideo.duration)?sourceVideo.duration:0;resize(sourceVideo.videoWidth,sourceVideo.videoHeight);frames=[];const temp=document.createElement('canvas');temp.width=canvas.width;temp.height=canvas.height;const tc=temp.getContext('2d',{alpha:false});let chain=Promise.resolve(),captured=0,lastTime=-1;frameDuration=1/30;await new Promise((resolve,reject)=>{let ended=false;const finish=()=>{if(ended)return;ended=true;sourceVideo.pause();resolve()};sourceVideo.onended=finish;sourceVideo.onerror=()=>reject(Error('Video decoding failed'));const capture=(now,meta)=>{if(ended)return;const stamp=meta.mediaTime;if(stamp>lastTime+0.000001){lastTime=stamp;tc.drawImage(sourceVideo,0,0,temp.width,temp.height);chain=chain.then(()=>new Promise(done=>temp.toBlob(async blob=>{try{if(blob){const frame=blankFrame(stamp);frame.baseKey=key('base');await FrameStore.put(frame.baseKey,blob);frames.push(frame);captured++;if(captured%30===0){$('status').textContent='Saved '+captured+' original frames…';await new Promise(r=>setTimeout(r,0))}}}finally{done()}},'image/webp',.72)))}if(sourceVideo.requestVideoFrameCallback)sourceVideo.requestVideoFrameCallback(capture);else finish()};if(sourceVideo.requestVideoFrameCallback)sourceVideo.requestVideoFrameCallback(capture);sourceVideo.play().catch(reject);setTimeout(finish,Math.ceil(sourceVideo.duration*1000)+5000)});await chain;sourceVideo.muted=false;frameDuration=frames.length>1?(frames[frames.length-1].time-frames[0].time)/(frames.length-1):1/30;await loadFrame(0);sourceVideo.currentTime=0;$('info').textContent=f.name+' · '+canvas.width+'×'+canvas.height+' · '+captured+' decoded frames · audio shown on separate timeline track';updateAudioTrack();$('status').textContent='Stitching smooth preview…';$('status').textContent='Frames imported · use Preview edited video to build playback';};
$('prev').onclick=()=>loadFrame(index-1);$('next').onclick=()=>loadFrame(index+1);$('scrub').oninput=e=>loadFrame(+e.target.value);
$('add').onclick=async()=>{await saveActive();frames.splice(index+1,0,blankFrame());await loadFrame(index+1)};
$('undo').onclick=async()=>{const action=undoStack.pop();if(!action)return;if(action.type==='delete-frame'){frames.splice(action.index,0,action.frame);if(action.wasCurrent)index=action.index;else if(action.index<=action.selectedIndex)index=action.selectedIndex+1;await loadFrame(index);return}const data=action.type==='draw'?action.data:action;const im=new Image();im.onload=async()=>{activeDraw.width=canvas.width;activeDraw.height=canvas.height;dctx().drawImage(im,0,0);activeDrawDirty=true;await saveActive();render()};im.src=data};
$('clear').onclick=async()=>{snapshot();dctx().clearRect(0,0,canvas.width,canvas.height);activeDrawDirty=true;await saveActive();render();timeline()};
$('copy').onclick=()=>{if(!selection)return alert('Select an area first');const x=Math.round(selection.x),y=Math.round(selection.y),w=Math.max(1,Math.round(selection.w)),h=Math.max(1,Math.round(selection.h));clipboard=document.createElement('canvas');clipboard.width=w;clipboard.height=h;clipboard.getContext('2d').drawImage(activeDraw,x,y,w,h,0,0,w,h);clipboardPosition={x,y};selection=null;render()};
$('paste').onclick=async()=>{if(!clipboard)return;paste=null;dctx().drawImage(clipboard,clipboardPosition?.x??0,clipboardPosition?.y??0);activeDrawDirty=true;selection=null;await saveActive();render();timeline()};
function stopPreview(){previewPlaying=false;video.pause();$('play').textContent='▶ Play'}video.addEventListener('ended',stopPreview);$('play').onclick=async()=>{if(previewPlaying){stopPreview();return}const playButton=$('play');playButton.disabled=true;$('status').textContent='Preparing edited playback…';try{await saveActive();$('preview-dialog').showModal();await buildStitchedPreview();video.currentTime=0;previewPlaying=true;playButton.textContent='Ⅱ Pause';try{await video.play();$('status').textContent='Playing stitched edited frames'}catch(playError){previewPlaying=false;playButton.textContent='▶ Play';$('status').textContent='Preview ready — press Play in the video controls to start.'}}catch(err){console.error(err);$('status').textContent='Preview failed: '+err.message;alert('Could not create the edited video preview: '+err.message)}finally{playButton.disabled=false}};$('preview-close').onclick=()=>{stopPreview();$('preview-dialog').close()};$('preview-dialog').addEventListener('click',e=>{if(e.target===$('preview-dialog')){$('preview-close').click()}});$('preview-speed').onchange=e=>{video.playbackRate=Number(e.target.value)};
async function exportFrame(frame){const out=document.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const x=out.getContext('2d',{alpha:false});x.fillStyle='#fff';x.fillRect(0,0,out.width,out.height);const base=await bitmapFromKey(frame.baseKey);if(base){x.drawImage(base,0,0,out.width,out.height);base.close?.()}const draw=await bitmapFromKey(frame.drawKey);if(draw){x.drawImage(draw,0,0);draw.close?.()}for(const item of (frame.images||[])){const blob=await FrameStore.get(item.key);if(blob){const bitmap=await createImageBitmap(blob);x.drawImage(bitmap,item.x,item.y,item.w,item.h);bitmap.close?.()}}if(frame.textKey){const tb=await FrameStore.get(frame.textKey);if(tb){try{drawTextItems(x,JSON.parse(await tb.text()))}catch{} }}return new Promise(resolve=>out.toBlob(resolve,'image/png'))}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
$('export').onclick=async()=>{if(!frames.length)return alert('Add or import frames before exporting.');const fmt=$('format').value;try{if(fmt==='webm'){const stream=canvas.captureStream(Math.max(1,Math.round(1/frameDuration))),rec=new MediaRecorder(stream),chunks=[];rec.ondataavailable=e=>chunks.push(e.data);rec.start();for(let i=0;i<frames.length;i++){await loadFrame(i);await new Promise(r=>setTimeout(r,frameDuration*1000))}rec.stop();await new Promise(r=>rec.onstop=r);download(new Blob(chunks,{type:'video/webm'}),'frameforge.webm');return}
$('status').textContent='Loading FFmpeg…';const ff=await createFFmpegInstance();for(let i=0;i<frames.length;i++){const blob=await exportFrame(frames[i]);await ff.writeFile('frame'+String(i).padStart(5,'0')+'.png',new Uint8Array(await blob.arrayBuffer()));if(i%8===0)$('status').textContent='Export prep '+(i+1)+' / '+frames.length}
const mov=['mov','movhevc','mpeg4'].includes(fmt),hevc=['hevc','movhevc'].includes(fmt),codec=hevc?'libx265':fmt==='mpeg4'?'mpeg4':'libx264',ext=mov?'mov':'mp4',args=['-framerate',String(Math.max(1,Math.round(1/frameDuration))),'-i','frame%05d.png'];if(audioTrackSource==='file'&&audioFile){const audioExt=(audioFile.name.split('.').pop()||'mp3').toLowerCase();await ff.writeFile('soundtrack.'+audioExt,new Uint8Array(await audioFile.arrayBuffer()));args.push('-itsoffset',String(audioOffsetFrame*frameDuration),'-i','soundtrack.'+audioExt,'-map','0:v:0','-map','1:a:0?','-shortest')}else if(audioTrackSource==='video'&&videoFile){const sourceExt=(videoFile.name.split('.').pop()||'mp4').toLowerCase();await ff.writeFile('source-audio.'+sourceExt,new Uint8Array(await videoFile.arrayBuffer()));args.push('-itsoffset',String(audioOffsetFrame*frameDuration),'-i','source-audio.'+sourceExt,'-map','0:v:0','-map','1:a:0?','-shortest')}else{args.push('-map','0:v:0')};args.push('-c:v',codec,'-pix_fmt','yuv420p');if(codec==='libx264')args.push('-preset','ultrafast');args.push('out.'+ext);$('status').textContent='Encoding export…';const exitCode=await ff.exec(args);if(exitCode!==0)throw Error('FFmpeg encoder exited with code '+exitCode);const output=await ff.readFile('out.'+ext);if(!output||!output.length)throw Error('FFmpeg created an empty export');download(new Blob([output],{type:ext==='mov'?'video/quicktime':'video/mp4'}),'frameforge.'+ext);$('status').textContent='Export finished'}catch(err){$('status').textContent='Export failed: '+err.message+' (try WebM)';console.error(err)}};
$('text-copy').onclick=()=>copySelectedText(false);
$('text-cut').onclick=()=>copySelectedText(true);
$('text-delete').onclick=deleteSelectedText;
$('text-paste').onclick=pasteSelectedText;
window.addEventListener('keydown',e=>{
 if(textEditor)return;
 const mod=e.ctrlKey||e.metaKey;
 if(mod&&(e.key.toLowerCase()==='b'||e.key.toLowerCase()==='u')&&tool==='cursor'&&textSelectionIndex>=0&&textItems[textSelectionIndex]){e.preventDefault();const o=textItems[textSelectionIndex];if(e.key.toLowerCase()==='b'){o.bold=!o.bold;fitTextBounds(o)}else o.underline=!o.underline;saveTextItems().then(()=>{render();timeline()});return}
 if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();$('undo').click();return}
 if(mod&&e.key.toLowerCase()==='c'){e.preventDefault();if(tool==='cursor'&&textSelectionIndex>=0)copySelectedText(false);else $('copy').click();return}
 if(mod&&e.key.toLowerCase()==='x'){if(tool==='cursor'&&textSelectionIndex>=0){e.preventDefault();copySelectedText(true)}return}
 if(mod&&e.key.toLowerCase()==='v'){e.preventDefault();if(tool==='cursor'||textClipboard)pasteSelectedText();else $('paste').click();return}
 if(e.key==='Delete'||e.key==='Backspace'){if(tool==='cursor'&&textSelectionIndex>=0){e.preventDefault();deleteSelectedText()}return}
 if(e.key==='ArrowLeft')loadFrame(index-1);if(e.key==='ArrowRight')loadFrame(index+1)
});
const themeToggle=$('theme-toggle');
if(themeToggle)themeToggle.addEventListener('click',()=>{
 const dark=document.body.classList.toggle('dark-mode');
 themeToggle.innerHTML='<span aria-hidden="true">'+(dark?'☾':'☼')+'</span>';
 themeToggle.setAttribute('aria-label',dark?'Switch to light mode':'Switch to dark mode');
 themeToggle.title=dark?'Switch to light mode':'Switch to dark mode';
});
frames=[blankFrame(0)];loadFrame(0);