import {build} from 'vite';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await build({root:'app',base:'./',build:{outDir:'../dist',emptyOutDir:true}});
async function files(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+entry.name;if(entry.isDirectory())result.push(...await files(path));else result.push(path);}return result;}
const paths=await files('dist');const hash=createHash('sha256');for(const path of paths)hash.update(await readFile(path));
const cache='evenfall-v2-'+hash.digest('hex').slice(0,12);const assets=paths.map(path=>'./'+path.slice(5));
const worker=[
'const CACHE='+JSON.stringify(cache)+';',
'const ASSETS='+JSON.stringify(assets)+';',
"self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(path=>new Request(path,{cache:'reload'}))))));",
"self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('evenfall-v2-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));",
"self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin||url.pathname.includes('/api/'))return;if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match(new URL('./index.html',self.registration.scope).href))));}else{event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request,{ignoreVary:ASSETS.some(path=>new URL(path,self.registration.scope).href===event.request.url)}))||fetch(event.request)));}});"
].join('\n');
await writeFile('dist/sw.js',worker);
console.log('Offline shell built:',assets.length,'files; model cache remains owned by WebLLM.');
