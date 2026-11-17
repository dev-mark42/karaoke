// Configuración central del sistema de reservas Karaoke UPDS
export const NEGOCIO = { nombre: 'Karaoke UPDS', whatsapp: '59170000000', moneda: 'Bs' };

export const SALAS = [
    { id: 'vip1',     nombre: 'Sala VIP 1',     capacidad: 10, precioHora: 60, icono: 'crown',          detalle: 'Sofá premium, pantalla 65" y luces LED' },
    { id: 'vip2',     nombre: 'Sala VIP 2',     capacidad: 10, precioHora: 60, icono: 'crown',          detalle: 'Sofá premium, pantalla 65" y luces LED' },
    { id: 'central4', nombre: 'Mesa Central 4', capacidad: 4,  precioHora: 40, icono: 'users',          detalle: 'Mesa para 4 en el salón principal' },
    { id: 'familiar', nombre: 'Sala Familiar',  capacidad: 15, precioHora: 50, icono: 'house-line',     detalle: 'Amplia, ideal para grupos y cumpleaños' }
];

export const HORARIO = { apertura: '12:00', cierre: '24:00', pasoMin: 30, horasMax: 6, anticipoMin: 30, diasMax: 60 };
export const LIMITES = { pistasPorHora: 8, cantidadItem: 10, itemsTotales: 40, nombreMax: 40, notasMax: 200 };
export const OCASIONES = ['Sin ocasión', 'Cumpleaños', 'Despedida', 'Aniversario', 'Reunión de amigos', 'Evento universitario', 'Empresa / Team building'];

export const CUPONES = {
    UPDS10:     { tipo: 'pct',  valor: 10, aplica: 'total', desc: '10% en toda la reserva' },
    SALA20:     { tipo: 'pct',  valor: 20, aplica: 'sala',  minHoras: 2,  desc: '20% en la sala (mínimo 2 horas)' },
    ESTUDIANTE: { tipo: 'fijo', valor: 15, aplica: 'total', minTotal: 100, desc: 'Bs 15 de descuento desde Bs 100' }
};

export const PAGO = {
    holdQrMin: 15,            // minutos para pagar con QR antes de cancelarse automáticamente
    toleranciaEfectivoMin: 15, // minutos de tolerancia tras la hora de inicio para pago en efectivo
    staffPin: '1234',          // PIN de caja (demo) para confirmar pagos manualmente
    tarjetaDeclinadaTermina: '0002' // tarjeta de prueba que simula rechazo
};
export const CANCELACION = { reembolsoCompletoHoras: 2, reembolsoParcial: 0.5 };

export const ESTADOS = {
    pendiente:  { texto: 'Pendiente de pago',   clase: 'warning', icono: 'clock-countdown' },
    verificando:{ texto: 'Por verificar (QR)',  clase: 'info',    icono: 'qr-code' },
    pagada:     { texto: 'Pagada',              clase: 'success', icono: 'check-circle' },
    cancelada:  { texto: 'Cancelada',           clase: 'danger',  icono: 'x-circle' }
};
