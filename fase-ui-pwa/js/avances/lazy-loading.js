// Avance: Lazy loading real: atributo loading="lazy" + IntersectionObserver (data-src), fade-in y portada de respaldo si falla.
import { normalizarImagen } from './dropbox.js';
const $ = window.jQuery;
let observer = null;

function cargar(img) {
    const $i = $(img), src = $i.attr('data-src'); if (!src) return;
    $i.one('load', () => $i.addClass('cargada')).one('error', () => {
        const fb = $i.attr('data-fallback'); if (fb && $i.attr('src') !== fb) $i.attr('src', fb); $i.addClass('cargada');
    });
    $i.attr('src', src).removeAttr('data-src');
}
export function inicializarLazyLoading($raiz = $(document)) {
    const $imgs = $raiz.find('img[data-src]');
    if (!('IntersectionObserver' in window)) { $imgs.each((_, i) => cargar(i)); return; }
    observer = observer || new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { cargar(e.target); o.unobserve(e.target); } }), { rootMargin: '250px' });
    $imgs.each((_, i) => observer.observe(i));
}
// Crea un <img> con width/height (evita saltos de layout), loading="lazy" y respaldo
export function imgLazy({ src, alt = '', fallback, w, h, clase = '' }) {
    return $('<img>').attr({ 'data-src': normalizarImagen(src) || fallback, 'data-fallback': fallback, alt, width: w, height: h, loading: 'lazy', decoding: 'async' }).addClass(clase);
}
