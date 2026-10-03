const CACHE='pa-practice-2026-10-03-14';
const ASSETS=["./", "index.html", "app.js", "api-config.js", "diff.js", "local-cards.js", "style.css", "cards.json", "manifest.webmanifest", "icon.svg", "media-13.png", "media-10.png", "media-9.png"];
// cache:'reload' skips the browser HTTP cache (GitHub Pages max-age=600), so a new version never stores the previous version's files.
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('pa-practice-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.includes('/api/'))return;
// Question bank: network first so newly pushed questions show up without a version bump; cache is the offline fallback.
if(url.pathname.endsWith('/cards.json'))return event.respondWith(caches.open(CACHE).then(async cache=>{try{const res=await fetch(event.request,{cache:'no-cache'});if(res.ok)await cache.put('cards.json',res.clone());return res}catch(e){const hit=await cache.match('cards.json');if(hit)return hit;throw e}}));
event.respondWith(caches.open(CACHE).then(async cache=>{const hit=await cache.match(event.request);if(hit)return hit;try{return await fetch(event.request)}catch(e){if(event.request.mode==='navigate')return cache.match('index.html');throw e}}))});

// Initial local preview: layout and retry controls verified.

// Review group count and empty state.
