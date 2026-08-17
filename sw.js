// Service Worker de "O Coralista"
// Faz cache dos arquivos do app para que ele funcione 100% offline
// depois da primeira visita/instalação.

const CACHE_NAME = "o-coralista-v1";
const ARQUIVOS_PARA_CACHE = [
  "./",
  "./index.html",
  "./app.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

// Instala e guarda todos os arquivos essenciais no cache
self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARQUIVOS_PARA_CACHE))
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos de versões anteriores
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      )
    )
  );
  self.clients.claim();
});

// Estratégia: cache primeiro, com fallback para rede.
// Para chamadas às APIs externas (dicionário/tradução), tenta rede primeiro
// e não quebra o app se estiver offline (o app já trata esse erro sozinho).
self.addEventListener("fetch", (evento) => {
  const url = new URL(evento.request.url);
  const ehApiExterna =
    url.hostname.includes("dictionaryapi.dev") ||
    url.hostname.includes("mymemory.translated.net");

  if (ehApiExterna) {
    // Rede primeiro; se falhar, deixa o app usar o fallback local dele.
    evento.respondWith(
      fetch(evento.request).catch(() => new Response(null, { status: 503 }))
    );
    return;
  }

  // Arquivos do próprio app: cache primeiro (funciona 100% offline)
  evento.respondWith(
    caches.match(evento.request).then((respostaCache) => {
      if (respostaCache) return respostaCache;
      return fetch(evento.request)
        .then((respostaRede) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(evento.request, respostaRede.clone());
            return respostaRede;
          });
        })
        .catch(() => caches.match("./app.html"));
    })
  );
});
