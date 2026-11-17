// Vista Reserva: formulario validado, disponibilidad en tiempo real, resumen del pedido (pistas + productos + cupón).
import { SALAS, HORARIO, LIMITES, OCASIONES, CUPONES } from '../core/config.js';
import { el, icono, fmtBs, hoyISO, aMin, aHM, pad, debounce, fechaLarga } from '../core/utils.js';
import { getPedido, quitarPista, moverPista, cambiarCantidad, quitarItem, vaciar, aplicarCupon, validarCupon, calcular, cargarDesde } from '../core/pedido.js';
import { hayConflicto, ocupaciones, slotsDelDia } from '../core/reservas.js';
import { getBorrador, setBorrador, limpiarBorrador } from '../core/almacen.js';
import { irAVista } from '../core/nav.js';
import { V, marcarCampo, validarCampo, limpiarValidacion, soloDigitos } from '../avances/validaciones.js';
import { limpiarEntrada } from '../avances/seguridad-xss.js';
import { delegar } from '../avances/delegacion-eventos.js';
import { toast, confirmar } from '../avances/alertas.js';
const $ = window.jQuery;

const salaActual = () => SALAS.find(s => s.nombre === $('#salaSelect').val()) || SALAS[0];
export const horasActuales = () => +$('#duracionReserva').val() || 1;
const ahoraMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

export function leerFormulario() {
    return {
        nombre: limpiarEntrada($('#clienteNombre').val(), LIMITES.nombreMax), telefono: soloDigitos($('#clienteTel').val()).replace(/^591/, ''),
        email: limpiarEntrada($('#clienteEmail').val(), 80).toLowerCase(), sala: $('#salaSelect').val(), fecha: $('#fechaReserva').val(), hora: $('#horaReserva').val(),
        horas: horasActuales(), personas: parseInt($('#personas').val(), 10), ocasion: $('#ocasion').val(), notas: limpiarEntrada($('#notas').val(), LIMITES.notasMax)
    };
}

// ---------- Selects dependientes (hora / duración) ----------
function poblarHoras() {
    const sala = $('#salaSelect').val(), fecha = $('#fechaReserva').val(), hoy = fecha === hoyISO(), previa = $('#horaReserva').val(), $s = $('#horaReserva').empty();
    $s.append(el('option', { value: '', text: 'Elige la hora' }));
    slotsDelDia().forEach(m => {
        let motivo = '';
        if (hoy && m < ahoraMin() + HORARIO.anticipoMin) motivo = 'no disponible';
        else if (m + 60 > aMin(HORARIO.cierre)) motivo = 'cierre';
        else if (fecha && hayConflicto(sala, fecha, m, 60)) motivo = 'ocupado';
        $s.append(el('option', { value: aHM(m), text: aHM(m) + (motivo ? ` · ${motivo}` : ''), disabled: !!motivo }));
    });
    if (previa && $s.find(`option[value="${previa}"]:not(:disabled)`).length) $s.val(previa);
}
function poblarDuraciones() {
    const ini = $('#horaReserva').val() ? aMin($('#horaReserva').val()) : null, sala = $('#salaSelect').val(), fecha = $('#fechaReserva').val(), previa = +$('#duracionReserva').val() || 1, $s = $('#duracionReserva').empty();
    for (let h = 1; h <= HORARIO.horasMax; h++) {
        const bloqueada = ini !== null && (ini + h * 60 > aMin(HORARIO.cierre) || (fecha && hayConflicto(sala, fecha, ini, h * 60)));
        $s.append(el('option', { value: h, text: `${h} ${h === 1 ? 'hora' : 'horas'} · ${fmtBs(salaActual().precioHora * h)}`, disabled: bloqueada }));
    }
    let v = previa; while (v > 1 && $s.find(`option[value="${v}"]`).prop('disabled')) v--; $s.val(v);
}
function actualizarSala() {
    const s = salaActual();
    $('#infoSala').empty().append(icono('users'), ` Capacidad ${s.capacidad} personas · ${fmtBs(s.precioHora)}/hora. ${s.detalle}.`);
    $('#personas').attr('max', s.capacidad);
}

// ---------- Disponibilidad del día (grilla de 30 min por sala) ----------
export function renderDisponibilidad() {
    const fecha = $('#fechaReserva').val() || hoyISO(), hoy = fecha === hoyISO(), slots = slotsDelDia(), $g = $('#gridDisponibilidad').empty();
    $('#dispFecha').text(fechaLarga(fecha));
    const escala = el('div', { class: 'disp-row disp-escala', 'aria-hidden': 'true' }, el('div', { class: 'disp-sala' }), el('div', { class: 'disp-strip' }, slots.map(m => el('span', { class: 'tick', text: m % 120 === 0 ? pad(m / 60) : '' }))));
    $g.append(escala);
    SALAS.forEach(s => {
        const oc = ocupaciones(s.nombre, fecha);
        $g.append(el('div', { class: 'disp-row' }, el('div', { class: 'disp-sala', text: s.nombre }),
            el('div', { class: 'disp-strip', role: 'img', 'aria-label': `Disponibilidad de ${s.nombre}` }, slots.map(m => {
                const ocu = oc.some(([a, b]) => m >= a && m < b), pas = hoy && m < ahoraMin();
                return el('span', { class: `slot ${ocu ? 'ocupado' : pas ? 'pasado' : 'libre'}`, title: `${aHM(m)} · ${ocu ? 'ocupado' : pas ? 'pasado' : 'libre'}` });
            }))));
    });
}

// ---------- Resumen del pedido ----------
const filaPrecio = (txt, val, clase = '') => el('div', { class: `d-flex justify-content-between ${clase}` }, el('span', { text: txt }), el('span', { text: val }));
function renderResumen() {
    const f = leerFormulario(), t = calcular(f.sala, f.horas), p = getPedido(), maxP = LIMITES.pistasPorHora * f.horas;
    $('.js-resumen').each(function () {
        const $r = $(this).empty();
        $r.append(el('div', { class: 'res-grupo' }, el('div', { class: 'res-tit' }, icono('microphone-stage'), ' Sala'), filaPrecio(`${t.sala.nombre} × ${t.horas} h`, fmtBs(t.montoSala))));
        const $pi = el('div', { class: 'res-grupo' }, el('div', { class: 'res-tit' }, icono('music-notes'), ` Cola de pistas (${p.pistas.length}/${maxP})`));
        if (!p.pistas.length) $pi.append(el('p', { class: 'text-muted-k small mb-0', text: 'Aún no elegiste pistas. Se incluyen sin costo.' }));
        p.pistas.forEach((x, i) => $pi.append(el('div', { class: 'res-item' }, el('span', { class: 'num', text: i + 1 }),
            el('div', { class: 'flex-grow-1 min-w-0' }, el('div', { class: 'text-truncate', text: x.titulo }), el('small', { class: 'text-muted-k text-truncate d-block', text: x.artista })),
            el('button', { type: 'button', class: 'btn-ic js-sube', 'aria-label': `Subir ${x.titulo}`, disabled: i === 0, data: { id: x.id } }, icono('arrow-up')),
            el('button', { type: 'button', class: 'btn-ic js-baja', 'aria-label': `Bajar ${x.titulo}`, disabled: i === p.pistas.length - 1, data: { id: x.id } }, icono('arrow-down')),
            el('button', { type: 'button', class: 'btn-ic js-quita-pista', 'aria-label': `Quitar ${x.titulo}`, data: { id: x.id } }, icono('x')))));
        $r.append($pi);
        if (p.items.length) {
            const $it = el('div', { class: 'res-grupo' }, el('div', { class: 'res-tit' }, icono('shopping-cart'), ' Comida y bebidas'));
            p.items.forEach(i => $it.append(el('div', { class: 'res-item' },
                el('div', { class: 'flex-grow-1 min-w-0' }, el('div', { class: 'text-truncate', text: i.titulo }), el('small', { class: 'text-muted-k', text: `${fmtBs(i.precio)} c/u${i.alcohol ? ' · 18+' : ''}` })),
                el('div', { class: 'stepper' }, el('button', { type: 'button', class: 'btn-ic js-menos', 'aria-label': `Menos ${i.titulo}`, data: { id: i.id } }, icono('minus')), el('b', { text: i.cantidad, 'aria-live': 'polite' }),
                    el('button', { type: 'button', class: 'btn-ic js-mas', 'aria-label': `Más ${i.titulo}`, data: { id: i.id } }, icono('plus'))),
                el('span', { class: 'precio-fila', text: fmtBs(i.precio * i.cantidad) }),
                el('button', { type: 'button', class: 'btn-ic js-quita-item', 'aria-label': `Quitar ${i.titulo}`, data: { id: i.id } }, icono('trash')))));
            $r.append($it);
        }
        const $c = el('div', { class: 'res-grupo' }, el('div', { class: 'res-tit' }, icono('ticket'), ' Cupón'));
        if (t.cupon) $c.append(el('div', { class: 'd-flex align-items-center gap-2' }, el('span', { class: 'badge bg-success', text: t.cupon }), el('small', { class: 'flex-grow-1 text-muted-k', text: CUPONES[t.cupon].desc }), el('button', { type: 'button', class: 'btn btn-sm btn-outline-light js-cupon-quitar', text: 'Quitar' })));
        else $c.append(el('div', { class: 'input-group' }, el('input', { type: 'text', class: 'form-control campo js-cupon-input', placeholder: 'Código de cupón', maxlength: 12, autocomplete: 'off', 'aria-label': 'Código de cupón' }), el('button', { type: 'button', class: 'btn btn-outline-light js-cupon-btn', text: 'Aplicar' })), el('small', { class: 'js-cupon-msg d-block mt-1', role: 'status' }));
        $r.append($c, el('div', { class: 'res-total' }, filaPrecio('Subtotal', fmtBs(t.subtotal), 'text-muted-k small'), t.descuento > 0 && filaPrecio(`Descuento ${t.cupon}`, '− ' + fmtBs(t.descuento), 'text-success small'), filaPrecio('TOTAL', fmtBs(t.total), 'fw-bold fs-5')));
    });
    $('.js-contador').text(t.nPistas + t.nItems).toggleClass('d-none', !(t.nPistas + t.nItems)); $('.js-fab-total').text(fmtBs(t.total));
}

// ---------- Validación completa (reglas de negocio) ----------
function errFecha(d) { if (!d.fecha) return 'Elige una fecha.'; if (d.fecha < hoyISO()) return 'La fecha ya pasó.'; const max = new Date(); max.setDate(max.getDate() + HORARIO.diasMax); return d.fecha > hoyISO(max) ? `Solo se reserva hasta ${HORARIO.diasMax} días antes.` : ''; }
function errHora(d) {
    if (!d.hora) return 'Elige la hora de inicio.'; const ini = aMin(d.hora);
    if (d.fecha === hoyISO() && ini < ahoraMin() + HORARIO.anticipoMin) return `Reserva con al menos ${HORARIO.anticipoMin} min de anticipación.`;
    if (ini + d.horas * 60 > aMin(HORARIO.cierre)) return 'La reserva excede el horario de cierre (24:00).';
    return hayConflicto(d.sala, d.fecha, ini, d.horas * 60) ? 'La sala ya está ocupada en ese horario.' : '';
}
function errPersonas(d) { const c = SALAS.find(s => s.nombre === d.sala).capacidad; return !Number.isInteger(d.personas) || d.personas < 1 ? 'Indica cuántas personas asistirán.' : d.personas > c ? `Capacidad máxima de la sala: ${c}.` : ''; }

export function validarReserva() {
    const d = leerFormulario(); let ok = true;
    const chk = (s, m) => { ok = marcarCampo($(s), m) && ok; };
    chk('#clienteNombre', V.nombre(d.nombre)); chk('#clienteTel', V.telefono(d.telefono)); chk('#clienteEmail', V.email(d.email));
    chk('#fechaReserva', errFecha(d)); chk('#horaReserva', errHora(d)); chk('#personas', errPersonas(d)); chk('#notas', V.nota(d.notas));
    if (ok && getPedido().pistas.length > LIMITES.pistasPorHora * d.horas) { toast(`Máximo ${LIMITES.pistasPorHora * d.horas} pistas para ${d.horas} h. Quita algunas.`, 'error'); return { ok: false }; }
    if (!ok) { $('#formReserva .is-invalid').first().trigger('focus'); toast('Revisa los campos marcados en rojo.', 'error', 'Faltan datos'); }
    return { ok, datos: d };
}

// ---------- Borrador ----------
const guardarBorrador = debounce(() => setBorrador({ form: leerFormulario(), pedido: getPedido() }), 300);
function aplicarFormulario(f) {
    $('#clienteNombre').val(f.nombre || ''); $('#clienteTel').val(f.telefono || ''); $('#clienteEmail').val(f.email || '');
    if (f.sala) $('#salaSelect').val(f.sala); if (f.fecha && f.fecha >= hoyISO()) $('#fechaReserva').val(f.fecha);
    poblarHoras(); if (f.hora) $('#horaReserva').val(f.hora); $('#duracionReserva').val(f.horas || 1); poblarDuraciones();
    $('#personas').val(f.personas || 2); $('#ocasion').val(f.ocasion || OCASIONES[0]); $('#notas').val(f.notas || ''); actualizarSala();
}
const refrescar = () => { poblarHoras(); poblarDuraciones(); actualizarSala(); renderDisponibilidad(); renderResumen(); guardarBorrador(); };

export function iniciarReserva() {
    $('#salaSelect').empty().append(SALAS.map(s => el('option', { value: s.nombre, text: s.nombre })));
    $('#ocasion').empty().append(OCASIONES.map(o => el('option', { value: o, text: o })));
    const max = new Date(); max.setDate(max.getDate() + HORARIO.diasMax); $('#fechaReserva').attr({ min: hoyISO(), max: hoyISO(max) }).val(hoyISO());
    const b = getBorrador(); poblarHoras(); poblarDuraciones(); actualizarSala(); if (b?.form) aplicarFormulario(b.form);
    renderDisponibilidad(); renderResumen();

    $('#salaSelect,#fechaReserva').off('change.kr').on('change.kr', refrescar);
    $('#horaReserva').off('change.kr').on('change.kr', () => { poblarDuraciones(); renderResumen(); guardarBorrador(); });
    $('#duracionReserva').off('change.kr').on('change.kr', () => { renderResumen(); guardarBorrador(); });
    $('#personas,#ocasion,#notas,#clienteNombre,#clienteTel,#clienteEmail').off('input.kr change.kr').on('input.kr change.kr', guardarBorrador);
    $('#clienteNombre').off('blur.kr').on('blur.kr', () => validarCampo($('#clienteNombre'), V.nombre));
    $('#clienteTel').off('input.tel blur.kr').on('input.tel', function () { this.value = soloDigitos(this.value).slice(0, 8); }).on('blur.kr', () => validarCampo($('#clienteTel'), V.telefono));
    $('#clienteEmail').off('blur.kr').on('blur.kr', () => validarCampo($('#clienteEmail'), V.email));
    $('#notas').off('input.cnt').on('input.cnt', function () { $('#notasCont').text(`${this.value.length}/${LIMITES.notasMax}`); });
    $('#formReserva').off('submit.kr').on('submit.kr', e => e.preventDefault());

    // Delegación (siempre .off().on()): resumen en la vista y en el panel lateral
    delegar(document, '.js-sube', 'click', (e, $t) => moverPista($t.data('id'), -1));
    delegar(document, '.js-baja', 'click', (e, $t) => moverPista($t.data('id'), 1));
    delegar(document, '.js-quita-pista', 'click', (e, $t) => quitarPista($t.data('id')));
    delegar(document, '.js-mas', 'click', (e, $t) => cambiarCantidad($t.data('id'), 1));
    delegar(document, '.js-menos', 'click', (e, $t) => cambiarCantidad($t.data('id'), -1));
    delegar(document, '.js-quita-item', 'click', (e, $t) => quitarItem($t.data('id')));
    delegar(document, '.js-cupon-quitar', 'click', () => { aplicarCupon(null); toast('Cupón retirado.', 'info'); });
    delegar(document, '.js-cupon-btn', 'click', (e, $t) => {
        const f = leerFormulario(), t = calcular(f.sala, f.horas), code = String($t.closest('.input-group').find('.js-cupon-input').val()).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12), $m = $t.closest('.res-grupo').find('.js-cupon-msg');
        if (!code) return $m.attr('class', 'js-cupon-msg d-block mt-1 text-warning').text('Escribe un código.');
        const r = validarCupon(code, t.montoSala, f.horas, t.subtotal);
        if (!r.ok) return $m.attr('class', 'js-cupon-msg d-block mt-1 text-danger').text(r.msg);
        aplicarCupon(code); toast(r.msg, 'ok', 'Cupón aplicado');
    });
    delegar(document, '.js-cupon-input', 'keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $(this).closest('.input-group').find('.js-cupon-btn').trigger('click'); } });
    delegar(document, '.js-vaciar', 'click', async () => { if (getPedido().pistas.length + getPedido().items.length && await confirmar('Se quitarán todas las pistas y productos del pedido.', { titulo: 'Vaciar pedido', ok: 'Vaciar', peligro: true })) { vaciar(); toast('Pedido vaciado.', 'info'); } });
    delegar(document, '.js-confirmar', 'click', () => { const v = validarReserva(); if (v.ok) { bootstrap.Offcanvas.getInstance($('#offcanvasPedido')[0])?.hide(); $(document).trigger('checkout:abrir', [v.datos]); } });

    $(document).off('pedido:cambio.res').on('pedido:cambio.res', () => { renderResumen(); guardarBorrador(); })
        .off('reservas:cambio.res').on('reservas:cambio.res', refrescar)
        .off('reserva:duplicar.res').on('reserva:duplicar.res', (e, r) => { cargarDesde(r); aplicarFormulario({ nombre: r.cliente.nombre, telefono: r.cliente.telefono, email: r.cliente.email, sala: r.sala, horas: r.horas, personas: r.personas, ocasion: r.ocasion, notas: r.notas }); refrescar(); irAVista('reserva'); toast('Elige una nueva fecha y hora para repetir la reserva.', 'info', 'Reserva copiada'); })
        .off('reserva:completada.res').on('reserva:completada.res', () => { vaciar(); limpiarBorrador(); limpiarValidacion($('#formReserva')); $('#horaReserva').val(''); $('#notas').val(''); $('#notasCont').text(`0/${LIMITES.notasMax}`); refrescar(); });
}
