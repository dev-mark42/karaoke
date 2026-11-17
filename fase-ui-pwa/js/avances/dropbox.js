// Avance: Normaliza enlaces de imágenes (Dropbox -> raw=1, rutas locales, data URLs) y bloquea esquemas peligrosos.
export function normalizarImagen(url) {
    if (!url) return '';
    url = String(url).trim();
    if (url.startsWith('data:image/')) return url;
    if (url.startsWith('assets/')) return url;
    try {
        const u = new URL(url);
        if (!/^https?:$/.test(u.protocol)) return '';
        if (u.hostname.endsWith('dropbox.com')) { u.searchParams.delete('dl'); u.searchParams.set('raw', '1'); }
        return u.toString();
    } catch { return ''; }
}
