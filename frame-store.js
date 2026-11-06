// IndexedDB-backed frame storage. Large frame blobs are persisted rather than retained in JS arrays.
const FrameStore=(()=>{
  const DB_NAME='frameforge-frame-cache-v2',STORE='blobs';let dbPromise;
  function open(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});return dbPromise}
  async function put(key,blob){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(blob,key);tx.oncomplete=()=>resolve(key);tx.onerror=()=>reject(tx.error)})}
  async function get(key){if(!key)return null;const db=await open();return new Promise((resolve,reject)=>{const req=db.transaction(STORE).objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)})}
  async function del(key){if(!key)return;const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
  return {put,get,del};
})();