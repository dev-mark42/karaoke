// Checkout: Efectivo (paga en caja), QR (sin verificación automática) y Tarjeta (Luhn, vencimiento, CVV; simulación segura).
import { PAGO, NEGOCIO } from '../core/config.js';
import { fmtBs, fechaLarga, aHM, aMin, copiarTexto } from '../core/utils.js';
import { calcular, getPedido } from '../core/pedido.js';
import { crearReserva } from '../core/reservas.js';
import { queueLocalReservation } from '../services/cloud.js';
import { montarQR } from '../avances/qr.js';
import { marcarCampo, limpiarValidacion, soloDigitos, formatoTarjeta, marcaTarjeta, errorNumeroTarjeta, errorVencimiento, errorCVV, errorTitular } from '../avances/validaciones.js';
import { limpiarEntrada } from '../avances/seguridad-xss.js';
import { toast } from '../avances/alertas.js';
import { celebrar } from '../avances/animaciones.js';
const $ = window.jQuery;

let ctx = null, procesando = false;
const dormir = ms => new Promise(r => setTimeout(r, ms));
const metodo = () => $('input[name="metodoPago"]:checked').val();

function mostrarMetodo() {
    const m = metodo();
    $('.panel-pago').addClass('d-none'); $(`#panel-${m}`).removeClass('d-none'); $('.metodo-card').removeClass('sel').has('input:checked').addClass('sel');
    $('#pagoError').addClass('d-none'); $('#btnPagoLuego').toggleClass('d-none', m !== 'qr');
    const t = ctx.totales.total;
    $('#btnPagoConfirmar').empty().append($('<i class="ph ph-check-circle fs-5" aria-hidden="true">'), ' ', document.createTextNode(m === 'tarjeta' ? `Pagar ${fmtBs(t)}` : m === 'qr' ? 'Ya realicé el pago' : 'Confirmar reserva'));
    if (m === 'qr') $('#qrRef').text('Ref: ' + ctx.ref);
    if (m === 'qr') montarQR($('#qrPago'), `KARAOKE-UPDS|PAY|${ctx.ref}|${t}|${NEGOCIO.moneda}`, { px: 200, etiqueta: 'QR de pago de la reserva' });
}
function marcaVisual() { const m = marcaTarjeta($('#tcNumero').val()); $('#tcMarca').text(m || 'Tarjeta').toggleClass('activa', !!m); }
function cambioEfectivo() {
    const v = parseFloat($('#efectivoPagoCon').val()); const $c = $('#efectivoCambio');
    $c.text(Number.isFinite(v) && v >= ctx.totales.total ? `Cambio a devolver: ${fmtBs(v - ctx.totales.total)}` : 'Opcional: indica con cuánto pagarás para preparar tu cambio.');
}

function validarComun() {
    let ok = true;
    $('#errTerminos').addClass('d-none'); $('#errEdad').addClass('d-none');
    if (!$('#chkTerminos').prop('checked')) { $('#errTerminos').removeClass('d-none'); ok = false; }
    if (ctx.totales.tieneAlcohol && !$('#chkEdad').prop('checked')) { $('#errEdad').removeClass('d-none'); ok = false; }
    return ok;
}
function validarMetodo() {
    const m = metodo(); let ok = true;
    if (m === 'efectivo') {
        const raw = $('#efectivoPagoCon').val().trim(), v = parseFloat(raw);
        ok = marcarCampo($('#efectivoPagoCon'), raw && (!Number.isFinite(v) || v < ctx.totales.total) ? `El monto debe ser al menos ${fmtBs(ctx.totales.total)}.` : '');
    } else if (m === 'tarjeta') {
        const marca = marcaTarjeta($('#tcNumero').val()), chk = (s, e) => { ok = marcarCampo($(s), e) && ok; };
        chk('#tcNumero', errorNumeroTarjeta($('#tcNumero').val())); chk('#tcTitular', errorTitular(limpiarEntrada($('#tcTitular').val(), 40))); chk('#tcVence', errorVencimiento($('#tcVence').val().trim())); chk('#tcCvv', errorCVV($('#tcCvv').val().trim(), marca));
    }
    return ok;
}
function bloquear(on) { procesando = on; $('#btnPagoConfirmar,#btnPagoLuego,.metodo-card input').prop('disabled', on); $('#pagoProcesando').toggleClass('d-none', !on); $('#modalPago .modal-content').attr('aria-busy', on); }

async function confirmarPago(luego = false) {
    if (procesando || !ctx) return;
    const okC = validarComun(), okM = validarMetodo();
    if (!okC || !okM) { toast('Completa los datos requeridos para continuar.', 'error', 'Revisa el pago'); $('#modalPago .is-invalid:visible').first().trigger('focus'); return; }
    const m = metodo(); let estado, pago = { ref: ctx.ref };
    if (m === 'efectivo') { const v = parseFloat($('#efectivoPagoCon').val()); estado = 'pendiente'; if (Number.isFinite(v)) pago = { ...pago, pagoCon: v, cambio: Math.round((v - ctx.totales.total) * 100) / 100 }; }
    else if (m === 'qr') estado = luego ? 'pendiente' : 'verificando';
    else {
        bloquear(true); $('#pagoError').addClass('d-none'); await dormir(1700);
        const num = soloDigitos($('#tcNumero').val());
        if (num.endsWith(PAGO.tarjetaDeclinadaTermina)) { bloquear(false); $('#pagoError').removeClass('d-none').text('El banco rechazó la tarjeta (simulación). Prueba con otra tarjeta.'); return; }
        estado = 'pagada'; pago = { ...pago, marca: marcaTarjeta(num), ultimos4: num.slice(-4), autorizacion: 'AUT-' + Math.random().toString(36).slice(2, 8).toUpperCase() };
    }
    bloquear(true);
    const r = crearReserva({ datos: ctx.datos, pedido: getPedido(), totales: ctx.totales, metodo: m, estado, pago });
    bloquear(false);
    if (r.ok) queueLocalReservation(r.reserva);
    if (!r.ok) { $('#pagoError').removeClass('d-none').text(r.msg); toast(r.msg, 'error'); $(document).trigger('reservas:cambio'); return; }
    limpiarSensibles(); bootstrap.Modal.getInstance($('#modalPago')[0]).hide();
    $(document).trigger('reservas:cambio').trigger('ticket:mostrar', [r.reserva, { nuevo: true }]);
    toast(estado === 'pagada' ? 'Pago aprobado. Reserva confirmada.' : estado === 'verificando' ? 'Pago QR registrado. Se verificará en caja.' : 'Reserva registrada. Paga en caja al llegar.', 'ok', '¡Listo!');
    celebrar();
}
function limpiarSensibles() { $('#tcNumero,#tcTitular,#tcVence,#tcCvv,#efectivoPagoCon').val(''); limpiarValidacion($('#modalPago')); marcaVisual(); }

export function iniciarPago() {
    $(document).off('checkout:abrir.pago').on('checkout:abrir.pago', (e, datos) => {
        const totales = calcular(datos.sala, datos.horas);
        ctx = { datos, totales, ref: 'PAY-' + Math.random().toString(36).slice(2, 8).toUpperCase() };
        $('#pagoTotal').text(fmtBs(totales.total));
        $('#pagoResumenMini').text(`${datos.sala} · ${fechaLarga(datos.fecha)} · ${datos.hora}–${aHM(aMin(datos.hora) + datos.horas * 60)} (${datos.horas} h)`);
        $('#pagoEdadBox').toggleClass('d-none', !totales.tieneAlcohol); $('#chkTerminos,#chkEdad').prop('checked', false);
        $('#mp-efectivo').prop('checked', true); limpiarSensibles(); cambioEfectivo(); mostrarMetodo(); $('#errTerminos,#errEdad,#pagoError').addClass('d-none'); bloquear(false);
        bootstrap.Modal.getOrCreateInstance($('#modalPago')[0]).show();
    });
    $('input[name="metodoPago"]').off('change.pago').on('change.pago', mostrarMetodo);
    $('#efectivoPagoCon').off('input.pago').on('input.pago', function () { this.value = this.value.replace(/[^\d.]/g, '').slice(0, 7); cambioEfectivo(); });
    $('#tcNumero').off('input.pago blur.pago').on('input.pago', function () { this.value = formatoTarjeta(this.value); marcaVisual(); }).on('blur.pago', function () { marcarCampo($(this), errorNumeroTarjeta(this.value)); });
    $('#tcTitular').off('input.pago blur.pago').on('input.pago', function () { this.value = this.value.replace(/[^\p{L}\s'.-]/gu, '').slice(0, 40); }).on('blur.pago', function () { marcarCampo($(this), errorTitular(limpiarEntrada(this.value, 40))); });
    $('#tcVence').off('input.pago blur.pago').on('input.pago', function () { const d = soloDigitos(this.value).slice(0, 4); this.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; }).on('blur.pago', function () { marcarCampo($(this), errorVencimiento(this.value.trim())); });
    $('#tcCvv').off('input.pago blur.pago').on('input.pago', function () { this.value = soloDigitos(this.value).slice(0, 4); }).on('blur.pago', function () { marcarCampo($(this), errorCVV(this.value.trim(), marcaTarjeta($('#tcNumero').val()))); });
    $('#btnCopiarRef').off('click.pago').on('click.pago', async () => toast((await copiarTexto(ctx.ref)) ? 'Referencia copiada.' : 'No se pudo copiar.', 'info'));
    $('#btnPagoConfirmar').off('click.pago').on('click.pago', () => confirmarPago(false));
    $('#btnPagoLuego').off('click.pago').on('click.pago', () => confirmarPago(true));
    $('#modalPago').off('hide.bs.modal.pago hidden.bs.modal.pago').on('hide.bs.modal.pago', e => { if (procesando) e.preventDefault(); }).on('hidden.bs.modal.pago', limpiarSensibles);
    $(document).off('click.demo').on('click.demo', '.js-demo-tarjeta', function () { $('#tcNumero').val(formatoTarjeta($(this).data('num'))).trigger('input'); $('#tcTitular').val('TITULAR DE PRUEBA'); $('#tcVence').val('12/' + String((new Date().getFullYear() + 3) % 100).padStart(2, '0')); $('#tcCvv').val('123'); });
}
