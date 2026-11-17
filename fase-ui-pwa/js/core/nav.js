// Navegación SPA: vistas, hash (#reserva, #pistas...), historial del navegador, accesibilidad (foco y aria-current).
import { delegar } from '../avances/delegacion-eventos.js';
import { observarReveal } from '../avances/animaciones.js';
const $ = window.jQuery;
const VISTAS = ['reserva', 'pistas', 'snacks', 'bebidas', 'historial'];
const TITULOS = { reserva: 'Reserva', pistas: 'Pistas', snacks: 'Snacks', bebidas: 'Bebidas', historial: 'Mis reservas' };

export function irAVista(nombre, { empujar = true } = {}) {
    if (!VISTAS.includes(nombre)) nombre = 'reserva';
    $('.app-view').removeClass('active'); $('#view-' + nombre).addClass('active');
    $('.nav-item,.nav-link-web').removeClass('active').removeAttr('aria-current').filter(`[data-target="view-${nombre}"]`).addClass('active').attr('aria-current', 'page');
    document.title = `${TITULOS[nombre]} | Karaoke UPDS`;
    if (empujar && location.hash !== '#' + nombre) history.pushState(null, '', '#' + nombre);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    $(`#view-${nombre} .view-titulo`).attr('tabindex', -1).trigger('focus', { preventScroll: true });
    observarReveal($('#view-' + nombre)); $(document).trigger('vista:cambio', [nombre]);
}
export function iniciarNavegacion() {
    delegar(document, '.nav-item,.nav-link-web,.js-ir', 'click', function (e, $t) { e.preventDefault(); irAVista(String($t.data('target')).replace('view-', '')); });
    $(window).off('popstate.nav hashchange.nav').on('popstate.nav hashchange.nav', () => irAVista(location.hash.slice(1), { empujar: false }));
    irAVista(location.hash.slice(1) || 'reserva', { empujar: false });
}
