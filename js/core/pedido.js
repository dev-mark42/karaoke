// Estado del pedido (cola de pistas + productos + cupón) y cálculo de totales. Emite 'pedido:cambio'.
import { CUPONES, LIMITES, SALAS } from './config.js';
import { getBorrador } from './almacen.js';
const $ = window.jQuery;

const estado = { pistas: [], items: [], cupon: null };
const avisar = () => $(document).trigger('pedido:cambio');

export const getPedido = () => estado;
export function restaurar() {
    const b = getBorrador();
    if (b?.pedido) { estado.pistas = b.pedido.pistas || []; estado.items = b.pedido.items || []; estado.cupon = b.pedido.cupon || null; }
}

// ---- Pistas (cola ordenable, sin duplicados) ----
export function agregarPista(p, maxPistas) {
    if (estado.pistas.some(x => x.id === p.id)) return 'dup';
    if (maxPistas && estado.pistas.length >= maxPistas) return 'max';
    estado.pistas.push({ id: p.id, titulo: p.titulo, artista: p.artista }); avisar(); return 'ok';
}
export function quitarPista(id) { estado.pistas = estado.pistas.filter(x => x.id !== id); avisar(); }
export function moverPista(id, dir) {
    const i = estado.pistas.findIndex(x => x.id === id), j = i + dir;
    if (i < 0 || j < 0 || j >= estado.pistas.length) return;
    [estado.pistas[i], estado.pistas[j]] = [estado.pistas[j], estado.pistas[i]]; avisar();
}
export const tienePista = id => estado.pistas.some(x => x.id === id);

// ---- Productos ----
const totalUnidades = () => estado.items.reduce((a, i) => a + i.cantidad, 0);
export function agregarItem(prod, tipo, cantidad = 1) {
    const it = estado.items.find(i => i.id === prod.id);
    const nueva = (it?.cantidad || 0) + cantidad;
    if (nueva > LIMITES.cantidadItem) return 'max-item';
    if (totalUnidades() + cantidad > LIMITES.itemsTotales) return 'max-total';
    if (it) it.cantidad = nueva;
    else estado.items.push({ id: prod.id, tipo, titulo: prod.titulo, precio: prod.precio, cantidad, alcohol: !!prod.alcohol, incluye: prod.incluye || '' });
    avisar(); return 'ok';
}
export function cambiarCantidad(id, delta) {
    const it = estado.items.find(i => i.id === id); if (!it) return;
    const n = it.cantidad + delta;
    if (n <= 0) estado.items = estado.items.filter(i => i.id !== id);
    else if (n <= LIMITES.cantidadItem && totalUnidades() + delta <= LIMITES.itemsTotales) it.cantidad = n;
    avisar();
}
export function quitarItem(id) { estado.items = estado.items.filter(i => i.id !== id); avisar(); }
export function vaciar() { estado.pistas = []; estado.items = []; estado.cupon = null; avisar(); }
export function cargarDesde(reserva) {
    estado.pistas = reserva.pistas.map(p => ({ ...p })); estado.items = reserva.items.map(i => ({ ...i })); estado.cupon = reserva.cupon || null; avisar();
}

// ---- Cupón ----
export function validarCupon(codigo, salaTotal, horas, subtotal) {
    const c = CUPONES[String(codigo).toUpperCase().trim()];
    if (!c) return { ok: false, msg: 'Cupón no válido.' };
    if (c.minHoras && horas < c.minHoras) return { ok: false, msg: `Requiere mínimo ${c.minHoras} horas de sala.` };
    if (c.minTotal && subtotal < c.minTotal) return { ok: false, msg: `Requiere una compra mínima de Bs ${c.minTotal}.` };
    return { ok: true, msg: c.desc };
}
export function aplicarCupon(codigo) { estado.cupon = codigo ? String(codigo).toUpperCase().trim() : null; avisar(); }

// ---- Totales ----
export function calcular(salaNombre, horas) {
    const sala = SALAS.find(s => s.nombre === salaNombre) || SALAS[0];
    const h = Number(horas) || 1;
    const montoSala = sala.precioHora * h;
    const extras = estado.items.reduce((a, i) => a + i.precio * i.cantidad, 0);
    const subtotal = montoSala + extras;
    let descuento = 0, cuponValido = null;
    if (estado.cupon && CUPONES[estado.cupon] && validarCupon(estado.cupon, montoSala, h, subtotal).ok) {
        const c = CUPONES[estado.cupon], base = c.aplica === 'sala' ? montoSala : subtotal;
        descuento = c.tipo === 'pct' ? Math.round(base * c.valor) / 100 : Math.min(c.valor, base);
        cuponValido = estado.cupon;
    }
    return { sala, horas: h, montoSala, extras, subtotal, descuento, total: Math.max(0, subtotal - descuento), cupon: cuponValido,
             tieneAlcohol: estado.items.some(i => i.alcohol), nPistas: estado.pistas.length, nItems: totalUnidades() };
}
