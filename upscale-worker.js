let upscalerPromise=null;
async function loadEngine(){
 if(upscalerPromise)return upscalerPromise;
 upscalerPromise=(async()=>{
  importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
  importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/tf-backend-wasm.min.js');
  tf.wasm.setWasmPaths('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.22.0/dist/');
  if(self.crossOriginIsolated&&typeof SharedArrayBuffer!=='undefined'&&tf.wasm.setThreadsCount){
   const cores=Math.max(1,Math.min(4,(navigator.hardwareConcurrency||2)-1));
   tf.wasm.setThreadsCount(cores);
  }
  let ready=false;
  try{ready=await tf.setBackend('wasm')}catch(error){console.warn('WASM backend unavailable',error)}
  if(!ready)await tf.setBackend('cpu');
  await tf.ready();
  importScripts('https://cdn.jsdelivr.net/npm/@upscalerjs/esrgan-thick@latest/dist/umd/4x.min.js');
  importScripts('https://cdn.jsdelivr.net/npm/upscaler@latest/dist/browser/umd/upscaler.min.js');
  if(!self.Upscaler||!self.ESRGANThick4x)throw Error('The AI super-resolution model did not initialize.');
  return new Upscaler({model:ESRGANThick4x});
 })();
 try{return await upscalerPromise}catch(error){upscalerPromise=null;throw error}
}
self.onmessage=async event=>{
 const {id,bitmap}=event.data||{};
 if(!bitmap)return;
 let small=null,inputTensor=null,outputTensor=null;
 try{
  const upscaler=await loadEngine();
  small=new OffscreenCanvas(Math.max(1,Math.round(bitmap.width/2)),Math.max(1,Math.round(bitmap.height/2)));
  const ctx=small.getContext('2d',{alpha:false,willReadFrequently:true});
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(bitmap,0,0,small.width,small.height);
  bitmap.close?.();
  const pixels=ctx.getImageData(0,0,small.width,small.height).data;
  const rgb=new Int32Array(small.width*small.height*3);
  for(let src=0,dst=0;dst<rgb.length;src+=4,dst+=3){rgb[dst]=pixels[src];rgb[dst+1]=pixels[src+1];rgb[dst+2]=pixels[src+2]}
  inputTensor=tf.tensor3d(rgb,[small.height,small.width,3],'int32');
  outputTensor=await upscaler.upscale(inputTensor,{output:'tensor',patchSize:32,padding:4});
  const shape=outputTensor.shape.slice(-3);
  const data=await outputTensor.data();
  const transferable=data.slice().buffer;
  self.postMessage({id,data:transferable,shape},[transferable]);
 }catch(error){
  bitmap.close?.();
  self.postMessage({id,error:error?.message||String(error)});
 }finally{
  inputTensor?.dispose();outputTensor?.dispose();
  if(small){small.width=1;small.height=1}
 }
};
