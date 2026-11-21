// Reglas de negocio de reservas: disponibilidad, creación, pago, cancelación y expiración automática.
import { HORARIO, PAGO, CANCELACION } from './config.js';
import { aMin, inicioDate, codigoReserva, uid } from './utils.js';
import { getReservas, agregarReserva, actualizarReserva } from './almacen.js';

export const solapa = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;

// Intervalos [inicio, fin) ocupados de una sala en una fecha
export function ocupaciones(sala, fecha, excluirId = null) {
    return getReservas().filter(r => r.estado !== 'cancelada' && r.sala === sala && r.fecha === fecha && r.id !== excluirId)
        .map(r => [aMin(r.inicio), aMin(r.inicio) + r.horas * 60]);
}
export const hayConflicto = (sala, fecha, iniMin, durMin, excluirId) => ocupaciones(sala, fecha, excluirId).some(([a, b]) => solapa(iniMin, iniMin + durMin, a, b));
export const slotsDelDia = () => { const s = []; for (let m = aMin(HORARIO.apertura); m < aMin(HORARIO.cierre); m += HORARIO.pasoMin) s.push(m); return s; };

// ---- Creación ----
export function crearReserva({ datos, pedido, totales, metodo, estado, pago }) {
    const ini = aMin(datos.hora);
    if (hayConflicto(datos.sala, datos.fecha, ini, datos.horas * 60)) return { ok: false, msg: 'Ese horario acaba de ser reservado. Elige otro.' };
    const ahora = new Date(); let codigo = codigoReserva();
    while (getReservas().some(r => r.codigo === codigo)) codigo = codigoReserva();
    let expira = null;
    if (estado === 'pendiente') expira = (metodo === 'qr' ? new Date(ahora.getTime() + PAGO.holdQrMin * 60000) : new Date(inicioDate(datos.fecha, datos.hora).getTime() + PAGO.toleranciaEfectivoMin * 60000)).toISOString();
    const reserva = {
        id: uid(), codigo, creada: ahora.toISOString(), estado, expira,
        cliente: { nombre: datos.nombre, telefono: datos.telefono, email: datos.email },
        sala: datos.sala, fecha: datos.fecha, inicio: datos.hora, horas: datos.horas, personas: datos.personas, ocasion: datos.ocasion, notas: datos.notas,
        pistas: pedido.pistas.map(p => ({ ...p })), items: pedido.items.map(i => ({ ...i })), cupon: totales.cupon,
        montos: { sala: totales.montoSala, extras: totales.extras, descuento: totales.descuento, total: totales.total },
        pago: { metodo, ref: 'PAY-' + Math.random().toString(36).slice(2, 8).toUpperCase(), ...pago }
    };
    return agregarReserva(reserva) ? { ok: true, reserva } : { ok: false, msg: 'No se pudo guardar (almacenamiento lleno).' };
}

// ---- Acciones ----
export const marcarVerificando = id => actualizarReserva(id, { estado: 'verificando', expira: null });
export const confirmarPagoCaja = id => { const r = getReservas().find(x => x.id === id); return actualizarReserva(id, { estado: 'pagada', expira: null, pago: { ...r.pago, confirmadoEn: new Date().toISOString(), confirmadoPor: 'Caja' } }); };

export function politicaCancelacion(r, ahora = new Date()) {
    if (r.estado === 'cancelada') return { ok: false, motivo: 'La reserva ya está cancelada.' };
    const horas = (inicioDate(r.fecha, r.inicio) - ahora) / 36e5;
    if (horas <= 0) return { ok: false, motivo: 'La reserva ya comenzó o finalizó y no se puede cancelar.' };
    if (r.estado !== 'pagada') return { ok: true, reembolso: 0, texto: 'No se realizó ningún cobro, no hay reembolso.' };
    const completo = horas >= CANCELACION.reembolsoCompletoHoras, monto = Math.round(r.montos.total * (completo ? 1 : CANCELACION.reembolsoParcial) * 100) / 100;
    return { ok: true, reembolso: monto, texto: completo ? `Reembolso del 100% (Bs ${monto}).` : `Faltan menos de ${CANCELACION.reembolsoCompletoHoras} horas: reembolso del ${CANCELACION.reembolsoParcial * 100}% (Bs ${monto}).` };
}
export function cancelarReserva(id, motivo = 'Cancelada por el cliente') {
    const r = getReservas().find(x => x.id === id); if (!r) return null;
    const pol = politicaCancelacion(r);
    return actualizarReserva(id, { estado: 'cancelada', expira: null, canceladaEn: new Date().toISOString(), motivoCancelacion: motivo, reembolso: pol.ok ? pol.reembolso : 0 });
}

// Cancela automáticamente pendientes vencidos (QR sin pagar / efectivo sin presentarse). Devuelve las canceladas.
export function expirarPendientes(ahora = new Date()) {
    const vencidas = getReservas().filter(r => r.estado === 'pendiente' && r.expira && new Date(r.expira) < ahora);
    vencidas.forEach(r => cancelarReserva(r.id, r.pago.metodo === 'qr' ? 'Tiempo de pago QR agotado' : 'No se presentó en el horario'));
    return vencidas;
}
