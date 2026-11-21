// Avance: Sanitización contra XSS. En el DOM se usa siempre .text() / textContent (ver utils.el): nunca se concatena HTML.
// Entrada de usuario: quita caracteres de control y etiquetas, colapsa espacios y limita el largo.
export function limpiarEntrada(texto, max = 200) {
    return String(texto ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
// Evita inyección de fórmulas al exportar CSV (Excel interpreta = + - @)
export const celdaCSV = v => { const s = String(v ?? '').replace(/"/g, '""'); return `"${/^[=+\-@]/.test(s) ? "'" + s : s}"`; };

// Avance C3-A2: Sanitización de HTML dinámico con DOMPurify.
// Se usa cuando el HTML viene de una fuente externa (JSON, BD, API) y NO se puede
// confiar en él. NUNCA uses innerHTML/.html() con datos sin sanitizar.
export function renderizarDetalleSeguro(htmlDesdeServidor, selector = '#detalleProyecto') {
    if (typeof window.DOMPurify === 'undefined') {
        console.warn('[seguridad-xss] DOMPurify no está cargado. Revisa assets/vendor/purify.min.js');
        return;
    }
    const limpio = window.DOMPurify.sanitize(String(htmlDesdeServidor ?? ''), {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'ul', 'ol', 'li', 'br', 'a', 'h1', 'h2', 'h3', 'h4', 'img', 'span', 'div'],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'width', 'height', 'class', 'target', 'rel']
    });
    const cont = document.querySelector(selector);
    if (cont) cont.innerHTML = limpio; // ya sanitizado
    return limpio;
}
