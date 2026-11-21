// Mis reservas: historial, ticket (PDF/QR/WhatsApp), cancelación con política de reembolso, confirmación en caja (PIN) y CSV.
import { ESTADOS, PAGO, NEGOCIO, CANCELACION } from '../core/config.js';
import { el, icono, fmtBs, fechaLarga, fechaHora, aHM, aMin, mmss, norm, descargarArchivo } from '../core/utils.js';
import { getReservas, getReserva, eliminarReserva, guardarReservas } from '../core/almacen.js';
import { expirarPendientes, politicaCancelacion, cancelarReserva, confirmarPagoCaja, marcarVerificando } from '../core/reservas.js';
import { irAVista } from '../core/nav.js';
import { montarQR } from '../avances/qr.js';
import { descargarPDF } from '../avances/pdf.js';
import { delegar } from '../avances/delegacion-eventos.js';
import { toast, confirmar, pedirPin } from '../avances/alertas.js';
import { celdaCSV } from '../avances/seguridad-xss.js';
import { observarReveal } from '../avances/animaciones.js';
const $ = window.jQuery;

const filtro = { estado: 'todas', q: '' };
let ticket = null, relojes = null;
const METODOS = { efectivo: 'Efectivo (en caja)', qr: 'QR', tarjeta: 'Tarjeta' };
const fin = r => aHM(aMin(r.inicio) + r.horas * 60);
const badge = r => el('span', { class: `badge-estado ${ESTADOS[r.estado].clase}` }, icono(ESTADOS[r.estado].icono), ' ', ESTADOS[r.estado].texto);
const cuenta = r => r.estado === 'pendiente' && r.expira ? el('span', { class: 'cuenta js-cuenta', 'data-expira': r.expira, text: mmss(new Date(r.expira) - Date.now()) }) : null;

// ---------- Lista ----------
function stats(l) {
    const por = l.filter(r => ['pendiente', 'verificando'].includes(r.estado)), pag = l.filter(r => r.estado === 'pagada'), suma = a => a.reduce((s, r) => s + r.montos.total, 0);
    const card = (ic, t, v, s) => el('div', { class: 'col-6 col-lg-3' }, el('div', { class: 'stat-k' }, icono(ic, 'fs-3'), el('div', { class: 'min-w-0' }, el('div', { class: 'stat-v', text: v }), el('small', { class: 'text-muted-k text-truncate d-block', text: t }), s && el('small', { class: 'text-muted-k', text: s }))));
    $('#statsHistorial').empty().append(card('receipt', 'Reservas', l.length), card('clock-countdown', 'Por cobrar', fmtBs(suma(por)), `${por.length} activas`), card('check-circle', 'Cobrado', fmtBs(suma(pag)), `${pag.length} pagadas`), card('x-circle', 'Canceladas', l.filter(r => r.estado === 'cancelada').length));
}
function chips(l) {
    const n = e => e === 'todas' ? l.length : l.filter(r => r.estado === e).length;
    $('#filtrosHistorial').empty().append([['todas', 'Todas'], ...Object.entries(ESTADOS).map(([k, v]) => [k, v.texto])].map(([k, t]) => el('button', { type: 'button', class: `chip ${filtro.estado === k ? 'active' : ''}`, 'aria-pressed': filtro.estado === k, data: { estado: k }, text: `${t} (${n(k)})` })));
}
function tarjeta(r) {
    const pol = politicaCancelacion(r), acc = [];
    acc.push(el('button', { type: 'button', class: 'btn btn-sm btn-gradient js-ver' }, icono('ticket'), ' Ver ticket'));
    if (['pendiente', 'verificando'].includes(r.estado)) acc.push(el('button', { type: 'button', class: 'btn btn-sm btn-outline-info js-caja' }, icono('lock'), ' Confirmar pago (caja)'));
    if (pol.ok) acc.push(el('button', { type: 'button', class: 'btn btn-sm btn-outline-danger js-cancelar' }, icono('x-circle'), ' Cancelar'));
    acc.push(el('button', { type: 'button', class: 'btn btn-sm btn-outline-light js-repetir' }, icono('arrow-counter-clockwise'), ' Repetir'));
    if (r.estado === 'cancelada') acc.push(el('button', { type: 'button', class: 'btn btn-sm btn-outline-secondary js-eliminar' }, icono('trash'), ' Eliminar'));
    return el('article', { class: `res-card reveal ${r.estado}`, data: { id: r.id } },
        el('header', { class: 'd-flex flex-wrap align-items-center gap-2 mb-2' }, el('span', { class: 'codigo', text: r.codigo }), badge(r), cuenta(r), el('span', { class: 'ms-auto fw-bold fs-5 text-total', text: fmtBs(r.montos.total) })),
        el('div', { class: 'res-meta' }, el('span', {}, icono('user'), ' ', r.cliente.nombre), el('span', {}, icono('microphone-stage'), ' ', r.sala), el('span', {}, icono('calendar'), ' ', fechaLarga(r.fecha)),
            el('span', {}, icono('clock'), ` ${r.inicio}–${fin(r)} (${r.horas} h)`), el('span', {}, icono('users'), ` ${r.personas} pers.`), el('span', {}, icono('music-notes'), ` ${r.pistas.length} pistas`), el('span', {}, icono('wallet'), ' ', METODOS[r.pago.metodo])),
        r.estado === 'cancelada' && el('p', { class: 'small text-danger mt-2 mb-0', text: `${r.motivoCancelacion || 'Cancelada'}${r.reembolso ? ` · Reembolso simulado: ${fmtBs(r.reembolso)}` : ''}` }),
        el('div', { class: 'd-flex flex-wrap gap-2 mt-3' }, acc));
}
export function renderHistorial() {
    const todas = getReservas(), q = norm(filtro.q);
    const l = todas.filter(r => (filtro.estado === 'todas' || r.estado === filtro.estado) && (!q || norm(`${r.codigo} ${r.cliente.nombre} ${r.sala}`).includes(q)));
    stats(todas); chips(todas);
    $('#listaHistorial').empty().append(l.map(tarjeta)); $('#vacioHistorial').toggleClass('d-none', l.length > 0); observarReveal($('#listaHistorial'));
    $('#btnExportar,#btnLimpiarHist').prop('disabled', !todas.length);
}

// ---------- Ticket ----------
const fila = (a, b, c = '') => el('div', { class: `t-fila ${c}` }, el('span', { text: a }), el('span', { text: b }));
export function renderTicket(r) {
    const $t = $('#ticketVisual').empty(), m = r.montos, qrPago = r.pago.metodo === 'qr' && r.estado === 'pendiente';
    $t.append(el('div', { class: 't-centro' }, el('h4', { text: 'KARAOKE UPDS' }), el('p', { text: 'Ticket de reserva' }), el('small', { text: `Emitido: ${fechaHora(r.creada)}` })), el('hr'),
        el('div', { class: 't-codigo', text: r.codigo }), el('div', { class: 't-centro t-estado' }, el('b', { text: ESTADOS[r.estado].texto.toUpperCase() })), el('hr'),
        fila('Cliente:', r.cliente.nombre), fila('Celular:', r.cliente.telefono), fila('Sala:', r.sala), fila('Fecha:', fechaLarga(r.fecha)), fila('Horario:', `${r.inicio} - ${fin(r)} (${r.horas} h)`), fila('Personas:', String(r.personas)), r.ocasion && r.ocasion !== 'Sin ocasión' && fila('Ocasión:', r.ocasion), el('hr'));
    if (r.pistas.length) $t.append(el('div', { class: 't-sub', text: 'Cola de pistas' }), el('ol', { class: 't-lista' }, r.pistas.map(p => el('li', { text: `${p.titulo} — ${p.artista}` }))), el('hr'));
    $t.append(el('div', { class: 't-sub', text: 'Detalle' }), fila(`Sala ${r.horas} h`, fmtBs(m.sala)), r.items.map(i => fila(`${i.cantidad}x ${i.titulo}`, fmtBs(i.precio * i.cantidad))), m.descuento > 0 && fila(`Descuento ${r.cupon}`, '- ' + fmtBs(m.descuento)), el('hr'),
        fila('TOTAL', fmtBs(m.total), 't-total'), el('hr'),
        fila('Método:', METODOS[r.pago.metodo]), r.pago.ultimos4 && fila('Tarjeta:', `${r.pago.marca} •••• ${r.pago.ultimos4}`), r.pago.autorizacion && fila('Autorización:', r.pago.autorizacion), r.pago.cambio > 0 && fila('Cambio a devolver:', fmtBs(r.pago.cambio)), fila('Referencia:', r.pago.ref), r.reembolso > 0 && fila('Reembolso simulado:', fmtBs(r.reembolso)));
    const $qr = el('div', { class: 't-centro t-qr' }); $t.append(el('hr'), $qr);
    if (qrPago) { montarQR($qr.append(el('div')).find('div'), `KARAOKE-UPDS|PAY|${r.pago.ref}|${m.total}|${NEGOCIO.moneda}`, { px: 170, etiqueta: 'QR de pago' }); $qr.append(el('small', { text: 'Escanea para pagar. El QR NO se verifica automáticamente: el personal confirma en caja.' }), el('div', { class: 't-estado' }, 'Vence en ', el('b', { class: 'js-cuenta', 'data-expira': r.expira, text: mmss(new Date(r.expira) - Date.now()) }))); }
    else { montarQR($qr.append(el('div')).find('div'), `KR|${r.codigo}|${r.fecha}|${r.inicio}`, { px: 150, etiqueta: 'QR de acceso a la reserva' }); $qr.append(el('small', { text: 'Presenta este código al ingresar.' })); }
    $t.append(el('p', { class: 't-pie', text: `Precios incluyen impuestos. Cancelación: reembolso total hasta ${CANCELACION.reembolsoCompletoHoras} h antes; luego ${CANCELACION.reembolsoParcial * 100}%. ¡Gracias por cantar!` }));
    $('#btnYaPague').toggleClass('d-none', !qrPago);
}
function mostrarTicket(r, nuevo = false) { ticket = { id: r.id, nuevo }; renderTicket(r); bootstrap.Modal.getOrCreateInstance($('#modalTicket')[0]).show(); }

// ---------- Acciones ----------
async function cancelar(id) {
    const r = getReserva(id), pol = politicaCancelacion(r);
    if (!pol.ok) return toast(pol.motivo, 'warn');
    if (!await confirmar(`${pol.texto} Esta acción no se puede deshacer.`, { titulo: `Cancelar ${r.codigo}`, ok: 'Sí, cancelar', cancelar: 'Mantener', peligro: true })) return;
    cancelarReserva(id); toast(pol.reembolso ? `Reserva cancelada. ${pol.texto}` : 'Reserva cancelada.', 'info'); refrescarTodo();
}
async function caja(id) {
    const pin = await pedirPin('Confirmar pago en caja'); if (pin === null) return;
    if (pin !== PAGO.staffPin) return toast('PIN incorrecto.', 'error');
    confirmarPagoCaja(id); toast('Pago confirmado en caja.', 'ok'); refrescarTodo();
}
function exportarCSV() {
    const cab = ['Código', 'Cliente', 'Celular', 'Sala', 'Fecha', 'Inicio', 'Horas', 'Personas', 'Total (Bs)', 'Método', 'Estado', 'Creada'];
    const filas = getReservas().map(r => [r.codigo, r.cliente.nombre, r.cliente.telefono, r.sala, r.fecha, r.inicio, r.horas, r.personas, r.montos.total, METODOS[r.pago.metodo], ESTADOS[r.estado].texto, r.creada].map(celdaCSV).join(','));
    descargarArchivo(`reservas_karaoke_${new Date().toISOString().slice(0, 10)}.csv`, [cab.map(celdaCSV).join(','), ...filas].join('\n')); toast('Archivo CSV generado.', 'ok');
}
function refrescarTodo() { renderHistorial(); if (ticket && $('#modalTicket').hasClass('show')) { const r = getReserva(ticket.id); if (r) renderTicket(r); } $(document).trigger('reservas:cambio'); }
function tic() {
    const vencidas = expirarPendientes();
    if (vencidas.length) { vencidas.forEach(r => toast(`${r.codigo} se canceló por tiempo agotado.`, 'warn', 'Reserva vencida')); refrescarTodo(); }
    $('.js-cuenta').each(function () { $(this).text(mmss(new Date($(this).data('expira')) - Date.now())); });
}

export function iniciarHistorial() {
    expirarPendientes(); renderHistorial(); clearInterval(relojes); relojes = setInterval(tic, 1000);
    delegar('#filtrosHistorial', '.chip', 'click', (e, $t) => { filtro.estado = $t.data('estado'); renderHistorial(); });
    $('#buscadorHistorial').off('input.h').on('input.h', function () { filtro.q = this.value.slice(0, 60); renderHistorial(); });
    const id = $t => $t.closest('.res-card').data('id');
    delegar('#listaHistorial', '.js-ver', 'click', (e, $t) => mostrarTicket(getReserva(id($t))));
    delegar('#listaHistorial', '.js-cancelar', 'click', (e, $t) => cancelar(id($t)));
    delegar('#listaHistorial', '.js-caja', 'click', (e, $t) => caja(id($t)));
    delegar('#listaHistorial', '.js-repetir', 'click', (e, $t) => $(document).trigger('reserva:duplicar', [getReserva(id($t))]));
    delegar('#listaHistorial', '.js-eliminar', 'click', async (e, $t) => { if (await confirmar('Se borrará del historial de este dispositivo.', { titulo: 'Eliminar reserva', ok: 'Eliminar', peligro: true })) { eliminarReserva(id($t)); renderHistorial(); toast('Reserva eliminada.', 'info'); $(document).trigger('reservas:cambio'); } });
    $('#btnExportar').off('click.h').on('click.h', exportarCSV);
    $('#btnLimpiarHist').off('click.h').on('click.h', async () => { if (await confirmar('Se eliminarán TODAS las reservas guardadas en este dispositivo.', { titulo: 'Limpiar historial', ok: 'Eliminar todo', peligro: true })) { guardarReservas([]); renderHistorial(); $(document).trigger('reservas:cambio'); toast('Historial limpio.', 'info'); } });

    $(document).off('ticket:mostrar.h').on('ticket:mostrar.h', (e, r, o) => mostrarTicket(r, o?.nuevo));
    $('#btnYaPague').off('click.h').on('click.h', () => { marcarVerificando(ticket.id); toast('Pago QR registrado. Quedó por verificar en caja.', 'info'); refrescarTodo(); });
    $('#btnDescargarPDF').off('click.h').on('click.h', async function () {
        const $b = $(this).prop('disabled', true), r = getReserva(ticket.id);
        try { await descargarPDF($('#ticketVisual')[0], `Ticket_${r.codigo}.pdf`); toast('PDF descargado.', 'ok'); } catch (err) { toast(err.message || 'No se pudo generar el PDF.', 'error'); } finally { $b.prop('disabled', false); }
    });
    $('#btnWhatsApp').off('click.h').on('click.h', () => {
        const r = getReserva(ticket.id), t = `${NEGOCIO.nombre} - Reserva ${r.codigo}\n${r.sala} · ${fechaLarga(r.fecha)} · ${r.inicio}-${fin(r)}\nTotal: ${fmtBs(r.montos.total)} · ${ESTADOS[r.estado].texto}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, '_blank', 'noopener');
    });
    $('#modalTicket').off('hidden.bs.modal.h').on('hidden.bs.modal.h', () => { const n = ticket?.nuevo; ticket = null; if (n) { $(document).trigger('reserva:completada'); irAVista('historial'); } renderHistorial(); });
    $(document).off('reservas:cambio.h').on('reservas:cambio.h', renderHistorial);
}
