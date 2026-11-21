// Capa de datos: fetch() del catálogo (AJAX) + persistencia en localStorage con manejo de errores.
const K = { res: 'kr_reservas', fav: 'kr_favoritos', bor: 'kr_borrador' };
const leer = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

let catalogo = null;
async function pedirJSON(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(`HTTP ${r.status} al cargar ${url}`);
    return r.json();
}
export async function cargarCatalogo() {
    if (catalogo) return catalogo;
    const [canciones, productos] = await Promise.all([pedirJSON('assets/data/canciones.json'), pedirJSON('assets/data/productos.json')]);
    catalogo = { canciones, snacks: productos.snacks, bebidas: productos.bebidas };
    catalogo.porId = new Map([...canciones, ...productos.snacks, ...productos.bebidas].map(x => [x.id, x]));
    return catalogo;
}
export const getCatalogo = () => catalogo;

// Reservas
export const getReservas = () => leer(K.res, []);
export const getReserva = id => getReservas().find(r => r.id === id);
export const guardarReservas = l => guardar(K.res, l);
export function agregarReserva(r) { const l = getReservas(); l.unshift(r); return guardarReservas(l); }
export function actualizarReserva(id, parche) {
    const l = getReservas(), i = l.findIndex(r => r.id === id); if (i < 0) return null;
    l[i] = { ...l[i], ...parche }; guardarReservas(l); return l[i];
}
export const eliminarReserva = id => guardarReservas(getReservas().filter(r => r.id !== id));

// Favoritos de pistas
export const getFavs = () => leer(K.fav, []);
export function toggleFav(id) { const f = getFavs(), i = f.indexOf(id); i > -1 ? f.splice(i, 1) : f.push(id); guardar(K.fav, f); return i === -1; }

// Borrador (formulario + pedido) para no perder datos al recargar
export const getBorrador = () => leer(K.bor, null);
export const setBorrador = b => guardar(K.bor, b);
export const limpiarBorrador = () => localStorage.removeItem(K.bor);
