const CACHE='karaoke-upds-shell-v6';
const SHELL=[
  "./README_SETUP.md",
  "./assets/data/canciones.json",
  "./assets/data/productos.json",
  "./assets/img/472c015c2501fb992270625f50b32ae7.jpg",
  "./assets/img/logo.png",
  "./assets/vendor/purify.min.js",
  "./avances/semana-3/Accesibilidad/css/accesibilidad.css",
  "./avances/semana-3/Accesibilidad/index.html",
  "./avances/semana-3/Accesibilidad/js/accesibilidad.js",
  "./avances/semana-3/Componentes-Encapsulamiento/css/layout.css",
  "./avances/semana-3/Componentes-Encapsulamiento/index.html",
  "./avances/semana-3/Componentes-Encapsulamiento/js/layout.js",
  "./avances/semana-3/MVP/css/smoke-test.css",
  "./avances/semana-3/MVP/index.html",
  "./avances/semana-3/MVP/js/smoke-test.js",
  "./avances/semana-3/Mobile-First/css/tarjeta.css",
  "./avances/semana-3/Mobile-First/index.html",
  "./avances/semana-3/Mobile-First/js/tarjeta.js",
  "./css/main.css",
  "./index.html",
  "./js/avances/alertas.js",
  "./js/avances/animaciones.js",
  "./js/avances/delegacion-eventos.js",
  "./js/avances/dropbox.js",
  "./js/avances/hidratacion.js",
  "./js/avances/lazy-loading.js",
  "./js/avances/mic.js",
  "./js/avances/pdf.js",
  "./js/avances/qr.js",
  "./js/avances/seguridad-xss.js",
  "./js/avances/validaciones.js",
  "./js/core/almacen.js",
  "./js/core/config.js",
  "./js/core/main.js",
  "./js/core/nav.js",
  "./js/core/pedido.js",
  "./js/core/pwa.js",
  "./js/core/reservas.js",
  "./js/core/supabase-config.js",
  "./js/core/utils.js",
  "./js/services/cloud.js",
  "./js/services/music-player.js",
  "./js/vendor/qrcode.js",
  "./js/views/historial.js",
  "./js/views/menu.js",
  "./js/views/pago.js",
  "./js/views/pistas.js",
  "./js/views/reserva.js",
  "./manifest.json",
  "./supabase/schema.sql"
];
self.addEventListener('install',e=>e.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.allSettled(SHELL.map(async path=>{try{const response=await fetch(path,{cache:'reload'});if(response.ok)await cache.put(path,response);}catch(error){console.warn('[SW] No se pudo precargar',path);}}));await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const req=e.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==location.origin)return;
 if(req.mode==='navigate'){
  e.respondWith(fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}return response;}).catch(()=>caches.match(req).then(hit=>hit||caches.match('./index.html'))));
  return;
 }
 e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}return response;})));
});
