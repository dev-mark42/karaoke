// Service Worker: precache del shell + estrategia network-first con respaldo en caché (funciona sin conexión).
// Rutas relativas: compatible con GitHub Pages en subcarpetas (proyecto-grupal/fase-ui-pwa/).
const CACHE = 'karaoke-upds-v20';
const SHELL = [
 "./",
 "assets/data/canciones.json",
 "assets/data/productos.json",
 "assets/img/472c015c2501fb992270625f50b32ae7.jpg",
 "assets/img/logo.png",
 "css/main.css",
 "index.html",
 "js/avances/alertas.js",
 "js/avances/animaciones.js",
 "js/avances/delegacion-eventos.js",
 "js/avances/dropbox.js",
 "js/avances/hidratacion.js",
 "js/avances/lazy-loading.js",
 "js/avances/mic.js",
 "js/avances/pdf.js",
 "js/avances/qr.js",
 "js/avances/seguridad-xss.js",
 "js/avances/validaciones.js",
 "js/core/almacen.js",
 "js/core/config.js",
 "js/core/main.js",
 "js/core/nav.js",
 "js/core/pedido.js",
 "js/core/pwa.js",
 "js/core/reservas.js",
 "js/core/utils.js",
 "js/vendor/qrcode.js",
 "js/views/historial.js",
 "js/views/menu.js",
 "js/views/pago.js",
 "js/views/pistas.js",
 "js/views/reserva.js",
 "manifest.json"
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))));
    self.skipWaiting();
});
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET' || !e.request.url.startsWith('http')) return;
    e.respondWith(
        fetch(e.request).then(r => {
            if (r && (r.ok || r.type === 'opaque')) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
            return r;
        }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())))
    );
});
