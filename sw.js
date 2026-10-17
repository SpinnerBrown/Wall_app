/* Wall app service worker: network-first (3s timeout), cache fallback so it opens offline. */
const CACHE='wall-v1';
const FILES=['./','index.html','manifest.json','icon.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  e.respondWith((async()=>{
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),3000);
    try{
      const res=await fetch(r,{signal:ctrl.signal,cache:'no-cache'});
      clearTimeout(timer);
      if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy)).catch(()=>{});}
      return res;
    }catch(err){
      clearTimeout(timer);
      const hit=await caches.match(r,{ignoreSearch:true})||(r.mode==='navigate'?await caches.match('index.html'):null);
      return hit||new Response('Offline',{status:503,statusText:'Offline'});
    }
  })());
});
