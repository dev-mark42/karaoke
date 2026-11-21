const $ = window.jQuery;
// Avance: Generador de códigos QR 100% local (sin librerías externas ni peticiones de red). Devuelve un <svg> escalable.
import { QRCode, NIVEL } from '../vendor/qrcode.js';
export function qrSVG(texto, { px = 220, margen = 3, color = '#000', fondo = '#fff', etiqueta = 'Código QR' } = {}) {
    const t = String(texto).replace(/[^\x20-\x7E]/g, '');
    let qr = null;
    for (let tipo = 2; tipo <= 14 && !qr; tipo++) { try { const q = new QRCode(tipo, NIVEL.M); q.addData(t); q.make(); qr = q; } catch { qr = null; } }
    if (!qr) throw new Error('Texto demasiado largo para el QR');
    const n = qr.getModuleCount(), tam = n + margen * 2; let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + margen} ${r + margen}h1v1h-1z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tam} ${tam}" width="${px}" height="${px}" role="img" aria-label="${etiqueta}" shape-rendering="crispEdges"><rect width="${tam}" height="${tam}" fill="${fondo}"/><path d="${d}" fill="${color}"/></svg>`;
}

// Inserta el QR en un contenedor sin usar .html(): se parsea el SVG generado y se agrega como nodo.
export function montarQR($contenedor, texto, opciones) {
    const nodo = new DOMParser().parseFromString(qrSVG(texto, opciones), 'image/svg+xml').documentElement;
    $contenedor.empty().append(document.importNode(nodo, true));
}
