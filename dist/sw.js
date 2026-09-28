// Retires the old /dist/ service worker so cached pages give way to the redirect.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.registration.unregister().then(()=>self.clients.matchAll({type:'window'})).then(clients=>clients.forEach(client=>client.navigate('../')))));
