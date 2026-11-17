// Avance: Animaciones y micro-interacciones (ripple, aparición al scroll, lluvia de notas musicales)
import { icono } from '../core/utils.js';
const $ = window.jQuery;
let io = null;

export function observarReveal($raiz = $(document)) {
    const $els = $raiz.find('.reveal:not(.visible)');
    if (!('IntersectionObserver' in window)) { $els.addClass('visible'); return; }
    io = io || new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { $(e.target).addClass('visible'); o.unobserve(e.target); } }), { threshold: .05 });
    $els.each((i, e) => { e.style.transitionDelay = Math.min(i % 10, 9) * 40 + 'ms'; io.observe(e); });
}
export function celebrar(x = innerWidth / 2, y = innerHeight / 2, n = 16) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < n; i++) {
        const $n = icono(['music-note', 'music-notes', 'microphone-stage', 'star'][i % 4], 'nota-vuela').css({ left: x, top: y, '--dx': (Math.random() * 280 - 140) + 'px', '--dy': (-80 - Math.random() * 200) + 'px', '--c': ['#c084fc', '#f472b6', '#22d3ee', '#fff'][i % 4] });
        $('body').append($n); setTimeout(() => $n.remove(), 1100);
    }
}
export function inicializarAnimaciones() {
    observarReveal();
    $(document).off('click.rip').on('click.rip', '.btn,.chip,.nav-item,.nav-link-web', function (e) {
        const r = this.getBoundingClientRect(), s = Math.max(r.width, r.height);
        const $o = $('<span class="ripple">').css({ width: s, height: s, left: e.clientX - r.left - s / 2, top: e.clientY - r.top - s / 2 });
        $(this).append($o); setTimeout(() => $o.remove(), 600);
    });
    // Teclado virtual: lleva el campo enfocado al centro de la pantalla
    $(document).off('focusin.kb').on('focusin.kb', 'input,textarea,select', function () { const t = this; setTimeout(() => t.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300); });
}
