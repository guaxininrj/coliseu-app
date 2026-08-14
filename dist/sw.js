/* Service worker do Coliseu.

   A versao anterior servia SEMPRE do cache primeiro, inclusive a propria
   pagina. Isso deixou gente presa numa versao velha do app -- e como a
   versao velha conferia a senha DENTRO do navegador, com as senhas antigas
   escritas no codigo, a senha nova era recusada sem nem chegar ao servidor.
   Parecia "senha errada"; era pagina velha.

   Agora a pagina vai pela REDE primeiro e so cai no cache se estiver sem
   internet. Assim uma correcao publicada chega no mesmo dia, e o app
   continua abrindo offline.

   Subir CACHE_NAME e o que faz o navegador jogar fora o que guardou antes:
   o activate apaga todo cache com nome diferente deste. */
const CACHE_NAME = 'coliseu-v7';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;

  /* Chamada de API nunca passa por aqui: resposta de login e de dado de
     aluno guardada em cache seria erro grave -- mostraria dado velho, ou
     pior, dado de outro aparelho. */
  if (req.method !== 'GET' || /\/api\//.test(req.url)) return;

  /* A pagina e o codigo do app: rede primeiro. Se a rede falhar, cai no
     que estiver guardado -- e por isso que continua abrindo sem internet. */
  const ehCasca = req.mode === 'navigate' ||
                  /\.(html|js)(\?|$)/.test(new URL(req.url).pathname);

  if (ehCasca) {
    event.respondWith(
      fetch(req)
        .then(res => {
          /* guarda a versao nova pra proxima vez que faltar internet */
          if (res && res.ok && res.type === 'basic') {
            const copia = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copia));
          }
          return res;
        })
        .catch(() => caches.match(req).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  /* Resto (icone, fonte, biblioteca em /vendor/): cache primeiro mesmo,
     porque nao muda e economiza dados no celular. */
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
