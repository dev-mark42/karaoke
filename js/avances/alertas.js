// Avance: Alertas (toasts accesibles) y diálogos de confirmación / PIN construidos con DOM seguro (.text()).
import { el, icono } from '../core/utils.js';
const $ = window.jQuery;
const ICONOS = { ok: 'check-circle', error: 'x-circle', warn: 'warning', info: 'info' };

export function toast(mensaje, tipo = 'ok', titulo = '') {
    let $c = $('#toasts');
    if (!$c.length) $c = el('div', { id: 'toasts', role: 'status', 'aria-live': 'polite' }).appendTo('body');
    const $t = el('div', { class: `toast-k ${tipo}` }, icono(ICONOS[tipo] || ICONOS.ok, 'fs-4'),
        el('div', { class: 'flex-grow-1 min-w-0' }, titulo && el('strong', { class: 'd-block', text: titulo }), el('span', { class: 'small', text: mensaje })), el('span', { class: 'barra-t' }));
    $c.append($t);
    if (tipo === 'error' && navigator.vibrate) navigator.vibrate(100);
    const quitar = () => { $t.addClass('out'); setTimeout(() => $t.remove(), 300); };
    setTimeout(quitar, 3800); $t.on('click', quitar);
}

function dialogo(contenido) {
    const $o = el('div', { class: 'dlg', role: 'dialog', 'aria-modal': 'true' }, el('div', { class: 'dlg-box' }, contenido));
    $('body').append($o).addClass('no-scroll'); return $o;
}
const cerrar = $o => { $o.remove(); $('body').removeClass('no-scroll'); };

export function confirmar(mensaje, { titulo = '¿Estás seguro?', ok = 'Confirmar', cancelar = 'Volver', peligro = false } = {}) {
    return new Promise(res => {
        const $ok = el('button', { type: 'button', class: `btn ${peligro ? 'btn-danger' : 'btn-gradient'} w-100`, text: ok });
        const $no = el('button', { type: 'button', class: 'btn btn-outline-light w-100', text: cancelar });
        const $o = dialogo([icono(peligro ? 'warning' : 'question', 'dlg-ic'), el('h5', { class: 'fw-bold', text: titulo }), el('p', { class: 'text-muted-k', text: mensaje }), el('div', { class: 'd-flex gap-2' }, $no, $ok)]);
        const fin = v => { $(document).off('keydown.dlg'); cerrar($o); res(v); };
        $ok.on('click', () => fin(true)); $no.on('click', () => fin(false)); $o.on('click', e => { if (e.target === $o[0]) fin(false); });
        $(document).on('keydown.dlg', e => { if (e.key === 'Escape') fin(false); }); $ok.trigger('focus');
    });
}

export function pedirPin(titulo = 'PIN de caja') {
    return new Promise(res => {
        const $in = el('input', { type: 'password', inputmode: 'numeric', maxlength: 6, class: 'form-control campo text-center fs-4 mb-2', autocomplete: 'off', 'aria-label': 'PIN' });
        const $ok = el('button', { type: 'button', class: 'btn btn-gradient w-100', text: 'Validar' }), $no = el('button', { type: 'button', class: 'btn btn-outline-light w-100', text: 'Cancelar' });
        const $o = dialogo([icono('lock', 'dlg-ic'), el('h5', { class: 'fw-bold', text: titulo }), el('p', { class: 'text-muted-k small', text: 'Solo personal de caja. Demo: 1234' }), $in, el('div', { class: 'd-flex gap-2' }, $no, $ok)]);
        const fin = v => { $(document).off('keydown.dlg'); cerrar($o); res(v); };
        $in.on('input', () => $in.val($in.val().replace(/\D/g, '')));
        $ok.on('click', () => fin($in.val())); $no.on('click', () => fin(null));
        $(document).on('keydown.dlg', e => { if (e.key === 'Escape') fin(null); if (e.key === 'Enter') fin($in.val()); }); $in.trigger('focus');
    });
}
