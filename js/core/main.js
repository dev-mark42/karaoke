// Punto de entrada: orquesta módulos y maneja errores de carga del catálogo.
import { cargarCatalogo } from './almacen.js';
import { restaurar } from './pedido.js';
import { iniciarNavegacion } from './nav.js';
import { registrarPWA } from './pwa.js';
import { iniciarHidratacion } from '../avances/hidratacion.js';
import { inicializarAnimaciones } from '../avances/animaciones.js';
import { iniciarReserva } from '../views/reserva.js';
import { iniciarPistas } from '../views/pistas.js';
import { iniciarMenu } from '../views/menu.js';
import { iniciarPago } from '../views/pago.js';
import { iniciarHistorial } from '../views/historial.js';
import { initCloudUI } from '../services/cloud.js';
import { initMusicPlayer } from '../services/music-player.js';
import { hydrateCatalogFromCloud } from '../services/cloud.js';
const $ = window.jQuery;

async function arrancar() {
    iniciarHidratacion(); inicializarAnimaciones(); registrarPWA(); initMusicPlayer();
    initCloudUI().catch(e => console.warn('[Supabase]', e));
    let ok = true;
    try { await cargarCatalogo(); await hydrateCatalogFromCloud(); } catch (e) { ok = false; console.error(e); $('.js-error-carga').removeClass('d-none'); }
    restaurar(); iniciarReserva(); iniciarPago(); iniciarHistorial();
    if (ok) { iniciarPistas(); iniciarMenu(); }
    $(document).off('vista:cambio.fab').on('vista:cambio.fab', (e, v) => $('#fabPedido').toggleClass('d-none', v === 'reserva' || v === 'historial')); // el resumen ya está visible en esas vistas
    iniciarNavegacion();
    document.addEventListener('click', e => {
        if (e.target.closest('#btnImprimirTicket')) window.print();
    });
    $('.js-reintentar').off('click.main').on('click.main', () => location.reload());
}
$(arrancar);
