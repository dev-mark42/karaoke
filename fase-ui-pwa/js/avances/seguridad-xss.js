// Avance: Sanitización contra XSS. En el DOM se usa siempre .text() / textContent (ver utils.el): nunca se concatena HTML.
// Entrada de usuario: quita caracteres de control y etiquetas, colapsa espacios y limita el largo.
export function limpiarEntrada(texto, max = 200) {
    return String(texto ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}
// Evita inyección de fórmulas al exportar CSV (Excel interpreta = + - @)
export const celdaCSV = v => { const s = String(v ?? '').replace(/"/g, '""'); return `"${/^[=+\-@]/.test(s) ? "'" + s : s}"`; };
