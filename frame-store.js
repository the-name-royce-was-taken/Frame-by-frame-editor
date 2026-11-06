// Compressed frame files in the browser's Origin Private File System.
// Falls back to IndexedDB where OPFS is unavailable.
const FrameStore=(()=>{
 const DB='frameforge-frame-cache-v3',STORE='blobs';let dbPromise,dirPromise;
 function openDB(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const q=indexedDB.open(DB,1);q.onupgradeneeded=()=>q.result.createObjectStore(STORE);q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});return dbPromise}
 async function directory(){if(!dirPromise)dirPromise=(async()=>{if(!navigator.storage?.getDirectory)throw Error('OPFS unavailable');const root=await navigator.storage.getDirectory(),project=await root.getDirectoryHandle('FrameForgeProject',{create:true});return project.getDirectoryHandle('frames',{create:true})})();return dirPromise}
 async function put(key,blob){try{const d=await directory(),f=await d.getFileHandle(key+'.webp',{create:true}),w=await f.createWritable();await w.write(blob);await w.close();return key}catch(e){const db=await openDB();return new Promise((ok,no)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,key);tx.oncomplete=()=>ok(key);tx.onerror=()=>no(tx.error)})}}
 async function get(key){if(!key)return null;try{const d=await directory(),f=await d.getFileHandle(key+'.webp');return await f.getFile()}catch(e){try{const db=await openDB();return await new Promise((ok,no)=>{const q=db.transaction(STORE).objectStore(STORE).get(key);q.onsuccess=()=>ok(q.result||null);q.onerror=()=>no(q.error)})}catch{return null}}}
 async function del(key){if(!key)return;try{const d=await directory();await d.removeEntry(key+'.webp')}catch(e){const db=await openDB();return new Promise((ok,no)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=ok;tx.onerror=()=>no(tx.error)})}}
 return {put,get,del};
})();