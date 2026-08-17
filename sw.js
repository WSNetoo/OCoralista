// Service Worker de "O Coralista"
// Faz cache dos arquivos do app para funcionamento offline.
// Quando uma nova versão é publicada, o cache antigo é removido.

const CACHE_NAME = "o-coralista-v2";

const ARQUIVOS_PARA_CACHE = [
  "./",
  "./index.html",
  "./app.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

// =========================================================
// INSTALAÇÃO
// =========================================================

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ARQUIVOS_PARA_CACHE);
    })
  );

  // Ativa a nova versão imediatamente
  self.skipWaiting();
});


// =========================================================
// ATIVAÇÃO
// Remove caches antigos
// =========================================================

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) => {
      return Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      );
    })
  );

  // Faz a nova versão controlar as páginas abertas
  self.clients.claim();
});


// =========================================================
// FETCH
// Internet primeiro + cache como fallback
// =========================================================

self.addEventListener("fetch", (evento) => {
  const url = new URL(evento.request.url);

  // APIs externas não entram no cache
  const ehApiExterna =
    url.hostname.includes("dictionaryapi.dev") ||
    url.hostname.includes("mymemory.translated.net");

  if (ehApiExterna) {
    evento.respondWith(
      fetch(evento.request).catch(() => {
        return new Response(null, {
          status: 503
        });
      })
    );

    return;
  }

  // Para arquivos do aplicativo:
  // 1. Tenta pegar a versão mais recente da internet
  // 2. Atualiza o cache
  // 3. Se estiver offline, usa o cache
  evento.respondWith(
    fetch(evento.request)
      .then((respostaRede) => {

        // Só salva respostas válidas
        if (respostaRede && respostaRede.status === 200) {
          const copia = respostaRede.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(evento.request, copia);
          });
        }

        return respostaRede;
      })
      .catch(() => {
        return caches.match(evento.request).then((respostaCache) => {

          if (respostaCache) {
            return respostaCache;
          }

          // Fallback para o app principal
          return caches.match("./app.html");
        });
      })
  );
});
