'use strict';
const CACHE='evenfall-demo-v1';
const HOME=new URL('./index.html',self.location.href).href;
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.add(HOME)));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('evenfall-demo-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||request.mode!=='navigate'||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response.ok){const cache=await caches.open(CACHE);await cache.put(HOME,response.clone());}
      return response;
    }catch(error){
      const cached=await caches.match(HOME);
      if(cached)return cached;
      return new Response('Please open Evenfall once while online to prepare its offline copy.',{status:503,headers:{'Content-Type':'text/plain'}});
    }
  })());
});
