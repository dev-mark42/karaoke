// Vistas Snacks y Bebidas: búsqueda, categorías, orden, alta rápida y modal de producto con cantidad.
import { LIMITES } from '../core/config.js';
import { el, icono, fmtBs, norm, debounce, portadaSVG } from '../core/utils.js';
import { getCatalogo } from '../core/almacen.js';
import { agregarItem } from '../core/pedido.js';
import { imgLazy, inicializarLazyLoading } from '../avances/lazy-loading.js';
import { delegar, delegarActivar } from '../avances/delegacion-eventos.js';
import { toast } from '../avances/alertas.js';
import { observarReveal } from '../avances/animaciones.js';
const $ = window.jQuery;

const VISTAS = {
    Snack:  { clave: 'snacks',  grid: '#catalogoSnacks',  chips: '#filtrosSnacks',  buscar: '#buscadorSnacks',  orden: '#ordenSnacks',  cont: '#contSnacks',  vacio: '#vacioSnacks' },
    Bebida: { clave: 'bebidas', grid: '#catalogoBebidas', chips: '#filtrosBebidas', buscar: '#buscadorBebidas', orden: '#ordenBebidas', cont: '#contBebidas', vacio: '#vacioBebidas' }
};
const estado = { Snack: { q: '', cat: 'todos', orden: 'catalogo' }, Bebida: { q: '', cat: 'todos', orden: 'catalogo' } };
let prodActual = null, qty = 1;
const fallback = p => portadaSVG(p.titulo, 'comida');

function tarjeta(p, tipo) {
    return el('article', { class: 'tarjeta-prod prod-card reveal', role: 'button', tabindex: 0, 'aria-label': `${p.titulo}, ${fmtBs(p.precio)}. Ver detalle`, data: { id: p.id, tipo } },
        imgLazy({ src: p.portada, alt: '', fallback: fallback(p), w: 52, h: 52 }),
        el('div', { class: 'info-prod' }, el('h4', { text: p.titulo }, p.alcohol && el('span', { class: 'badge-18', text: '18+' })), el('p', { text: p.desc })),
        el('span', { class: 'precio', text: fmtBs(p.precio) }),
        el('button', { type: 'button', class: 'btn-ic js-add-rapido', 'aria-label': `Agregar ${p.titulo} al pedido` }, icono('plus')));
}
function render(tipo) {
    const v = VISTAS[tipo], s = estado[tipo], q = norm(s.q);
    const l = getCatalogo()[v.clave].filter(p => (s.cat === 'todos' || p.categoria === s.cat) && (!q || norm(`${p.titulo} ${p.desc} ${p.categoria}`).includes(q)));
    if (s.orden === 'precio-asc') l.sort((a, b) => a.precio - b.precio); else if (s.orden === 'precio-desc') l.sort((a, b) => b.precio - a.precio); else if (s.orden === 'az') l.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
    const $g = $(v.grid).empty().append(l.map(p => tarjeta(p, tipo)));
    $(v.cont).text(`${l.length} ${l.length === 1 ? 'producto' : 'productos'}`); $(v.vacio).toggleClass('d-none', l.length > 0);
    inicializarLazyLoading($g); observarReveal($g);
}
function chips(tipo) {
    const v = VISTAS[tipo], cats = [...new Set(getCatalogo()[v.clave].map(p => p.categoria))];
    $(v.chips).empty().append(['todos', ...cats].map(c => el('button', { type: 'button', class: `chip ${c === estado[tipo].cat ? 'active' : ''}`, 'aria-pressed': c === estado[tipo].cat, data: { cat: c }, text: c === 'todos' ? 'Todos' : c })));
}

// ---- Modal de producto ----
function pintarQty() { $('#prodQty').text(qty); $('#prodSubtotal').text(fmtBs(prodActual.precio * qty)); $('#btnQtyMenos').prop('disabled', qty <= 1); $('#btnQtyMas').prop('disabled', qty >= LIMITES.cantidadItem); }
function abrirProducto(id, tipo) {
    const p = getCatalogo().porId.get(id); if (!p) return; prodActual = { ...p, tipo }; qty = 1;
    $('#prodImg').off('error.m').one('error.m', function () { this.src = fallback(p); }).attr({ src: p.portada || fallback(p), alt: p.titulo });
    $('#prodTitulo').text(p.titulo); $('#prodPrecio').text(fmtBs(p.precio)); $('#prodDesc').text(p.desc); $('#prodCategoria').text(p.categoria);
    $('#prodIncluye').toggleClass('d-none', !p.incluye).text(p.incluye ? `Incluye: ${p.incluye}` : ''); $('#prodAlcohol').toggleClass('d-none', !p.alcohol);
    pintarQty(); bootstrap.Modal.getOrCreateInstance($('#modalProducto')[0]).show();
}
function agregar(p, tipo, n) {
    const r = agregarItem(p, tipo, n);
    if (r === 'max-item') toast(`Máximo ${LIMITES.cantidadItem} unidades por producto.`, 'warn'); else if (r === 'max-total') toast(`Máximo ${LIMITES.itemsTotales} productos por reserva.`, 'warn');
    else toast(`${n} × ${p.titulo} agregado${n > 1 ? 's' : ''} al pedido.`, 'ok'); return r === 'ok';
}

export function iniciarMenu() {
    Object.entries(VISTAS).forEach(([tipo, v]) => {
        chips(tipo); render(tipo);
        delegar(v.chips, '.chip', 'click', (e, $t) => { estado[tipo].cat = $t.data('cat'); chips(tipo); render(tipo); });
        $(v.buscar).off('input.m').on('input.m', debounce(function () { estado[tipo].q = this.value.slice(0, 60); render(tipo); }, 250));
        $(v.orden).off('change.m').on('change.m', function () { estado[tipo].orden = this.value; render(tipo); });
        delegarActivar(v.grid, '.prod-card', (e, $t) => abrirProducto($t.data('id'), tipo));
        delegar(v.grid, '.js-add-rapido', 'click', (e, $t) => { e.stopPropagation(); agregar(getCatalogo().porId.get($t.closest('.prod-card').data('id')), tipo, 1); });
    });
    $('#btnQtyMenos').off('click.m').on('click.m', () => { if (qty > 1) { qty--; pintarQty(); } });
    $('#btnQtyMas').off('click.m').on('click.m', () => { if (qty < LIMITES.cantidadItem) { qty++; pintarQty(); } });
    $('#btnAgregarProd').off('click.m').on('click.m', () => { if (agregar(prodActual, prodActual.tipo, qty)) bootstrap.Modal.getInstance($('#modalProducto')[0]).hide(); });
}
