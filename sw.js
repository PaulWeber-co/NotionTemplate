/**
 * Service Worker — macht die App offline nutzbar.
 *
 * Eigene Dateien: erst Cache, dann Netz im Hintergrund (stale-while-revalidate).
 * Fremde Adressen (Wetter, Ortssuche): nie cachen, immer direkt ans Netz.
 */

const VERSION = 'ap-v2.0.0';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/store.js',
  'js/grades.js',
  'js/ui.js',
  'js/page.js',
  'js/ics.js',
  'js/focus.js',
  'js/weather.js',
  'js/data/curriculum.js',
  'js/data/school.js',
  'js/data/quotes.js',
  'js/views/today.js',
  'js/views/tasks.js',
  'js/views/calendar.js',
  'js/views/grades.js',
  'js/views/more.js',
  'js/views/onboarding.js',
  'assets/icon.svg',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Einzeln laden: eine fehlende Datei soll nicht die ganze Installation kippen.
    await Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Seitenaufrufe: Netz zuerst, damit Aktualisierungen sofort ankommen.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(VERSION);
        cache.put('index.html', fresh.clone());
        return fresh;
      } catch {
        return (await caches.match('index.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(request);
    const network = fetch(request)
      .then((res) => {
        if (res && res.ok) cache.put(request, res.clone());
        return res;
      })
      .catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
