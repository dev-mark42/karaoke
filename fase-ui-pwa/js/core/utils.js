// Utilidades compartidas (jQuery global). Todo el DOM dinámico se construye con el() + .text() => sin inyección de HTML.
const $ = window.jQuery;

export const fmtBs = n => 'Bs ' + (Math.round(Number(n || 0) * 100) / 100).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
export const pad = n => String(n).padStart(2, '0');

export function debounce(fn, ms = 250) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); }; }

// ---- Fechas y horas (hora local del dispositivo) ----
export const hoyISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const aMin = hm => { const [h, m] = String(hm).split(':').map(Number); return h * 60 + (m || 0); };
export const aHM = min => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
export const inicioDate = (fecha, hm) => { const [y, mo, d] = fecha.split('-').map(Number), m = aMin(hm); return new Date(y, mo - 1, d, Math.floor(m / 60), m % 60); };
export const fechaLarga = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es-BO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }); };
export const fechaHora = iso => new Date(iso).toLocaleString('es-BO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };

export function codigoReserva() {
    const a = Date.now().toString(36).slice(-5).toUpperCase(), b = Math.random().toString(36).slice(2, 4).toUpperCase();
    return `KR-${a}${b}`;
}
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// ---- Constructor DOM seguro ----
export function el(tag, props = {}, ...kids) {
    const $e = $(document.createElement(tag));
    for (const [k, v] of Object.entries(props)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'text') $e.text(v);
        else if (k === 'class') $e.addClass(v);
        else if (k === 'data') Object.entries(v).forEach(([dk, dv]) => $e.attr('data-' + dk, dv));
        else $e.attr(k, v === true ? '' : v);
    }
    kids.flat(Infinity).forEach(c => { if (c !== null && c !== undefined && c !== false) $e.append(typeof c === 'object' ? c : document.createTextNode(String(c))); });
    return $e;
}
export const icono = (n, extra = '') => el('i', { class: `ph ph-${n} ${extra}`.trim(), 'aria-hidden': 'true' });

// ---- Portada generada (SVG) cuando no hay imagen o falla el enlace ----
export function portadaSVG(texto = '', tipo = 'musica') {
    const t = String(texto), hue = [...t].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    const ini = (t.match(/[A-Za-zÁ-ú0-9]/g) || ['K']).slice(0, 2).join('').toUpperCase();
    const forma = tipo === 'musica'
        ? '<circle cx="100" cy="100" r="62" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="3"/><circle cx="100" cy="100" r="36" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="3"/><circle cx="100" cy="100" r="9" fill="rgba(255,255,255,.55)"/>'
        : '<path d="M30 130h140l-12 36H42z" fill="rgba(255,255,255,.2)"/><circle cx="70" cy="92" r="26" fill="rgba(255,255,255,.18)"/><circle cx="128" cy="84" r="34" fill="rgba(255,255,255,.14)"/>';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,45%)"/><stop offset="1" stop-color="hsl(${(hue + 60) % 360},75%,30%)"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/>${forma}<text x="100" y="116" font-size="44" font-family="Arial,sans-serif" font-weight="800" text-anchor="middle" fill="#fff">${ini}</text></svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export async function copiarTexto(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch {
        const $t = $('<textarea>').val(t).css({ position: 'fixed', opacity: 0 }).appendTo('body'); $t[0].select();
        const ok = document.execCommand('copy'); $t.remove(); return ok;
    }
}
export function descargarArchivo(nombre, texto, tipo = 'text/csv;charset=utf-8') {
    const url = URL.createObjectURL(new Blob(['\ufeff' + texto], { type: tipo }));
    const a = $('<a>').attr({ href: url, download: nombre }).appendTo('body'); a[0].click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 500);
}
