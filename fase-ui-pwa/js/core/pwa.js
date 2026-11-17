// PWA: Service Worker (con actualización segura), estado de red e instalación.
import { toast } from '../avances/alertas.js';
import { icono } from './utils.js';
const $ = window.jQuery;
let evtInstalar = null;

function estadoRed() {
    const on = navigator.onLine;
    $('.js-estado-red').toggleClass('online', on).toggleClass('offline', !on).attr('title', on ? 'En línea' : 'Sin conexión (modo offline)').empty().append(icono(on ? 'wifi-high' : 'wifi-slash'), $('<span class="d-none d-sm-inline ms-1">').text(on ? 'En línea' : 'Sin conexión'));
}
export function registrarPWA() {
    estadoRed();
    $(window).off('online.pwa offline.pwa').on('online.pwa', () => { estadoRed(); toast('Conexión recuperada.', 'ok'); }).on('offline.pwa', () => { estadoRed(); toast('Sin conexión: la app sigue funcionando con datos guardados.', 'warn'); });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            reg.addEventListener('updatefound', () => { const w = reg.installing; w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Hay una nueva versión. Se aplicará al recargar.', 'info', 'Actualización'); }); });
        }).catch(() => {});
    }
    $(window).off('beforeinstallprompt.pwa').on('beforeinstallprompt.pwa', e => { e.originalEvent.preventDefault(); evtInstalar = e.originalEvent; $('.js-instalar').removeClass('d-none'); });
    $(document).off('click.inst').on('click.inst', '.js-instalar', async () => { if (!evtInstalar) return; evtInstalar.prompt(); await evtInstalar.userChoice; evtInstalar = null; $('.js-instalar').addClass('d-none'); });

    // Avance C3-A2: registro explícito del SW también en 'load' (compatibilidad)
    // y log del scope para verificar en DevTools que está activo.
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('[SW] activo en alcance:', reg.scope))
                .catch(err => console.error('[SW] Error de registro:', err));
        });
    }
}
