// Service Worker Splitio — permette di aprire l'app anche senza connessione,
// mostrando l'ultima versione salvata. Salvataggio/sincronizzazione nuove
// spese richiedono comunque la rete (dati condivisi via JSONBin).
var CACHE_NAME = 'splitio-cache-v1';
var APP_SHELL = [
  './',
  './index.html'
];

self.addEventListener('install', function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(k){ return k!==CACHE_NAME; })
            .map(function(k){ return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Strategia: prova la rete (per avere sempre l'ultima versione dell'app),
// se non c'è connessione usa la copia salvata in cache.
self.addEventListener('fetch', function(event){
  if(event.request.method!=='GET') return;
  // Le chiamate API (JSONBin, Cloudflare Worker) non vanno mai in cache:
  // devono fallire normalmente se manca la rete, non restituire dati vecchi.
  if(event.request.url.indexOf('jsonbin.io')!==-1 ||
     event.request.url.indexOf('workers.dev')!==-1) return;

  event.respondWith(
    fetch(event.request)
      .then(function(response){
        var copy=response.clone();
        caches.open(CACHE_NAME).then(function(cache){ cache.put(event.request, copy); });
        return response;
      })
      .catch(function(){
        return caches.match(event.request).then(function(cached){
          return cached || caches.match('./index.html');
        });
      })
  );
});
