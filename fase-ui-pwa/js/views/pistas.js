// Vista Pistas: catálogo con búsqueda, filtros, orden, favoritos, scroll infinito (lazy), disco giratorio y prueba de micrófono.
import { LIMITES } from '../core/config.js';
import { el, icono, norm, debounce, portadaSVG } from '../core/utils.js';
import { getCatalogo, getFavs, toggleFav } from '../core/almacen.js';
import { agregarPista, quitarPista, tienePista } from '../core/pedido.js';
import { horasActuales } from './reserva.js';
import { imgLazy, inicializarLazyLoading } from '../avances/lazy-loading.js';
import { delegar, delegarActivar } from '../avances/delegacion-eventos.js';
import { toast } from '../avances/alertas.js';
import { observarReveal, celebrar } from '../avances/animaciones.js';
import { iniciarMic, detenerMic } from '../avances/mic.js';
const $ = window.jQuery;

const PAGINA = 12, ORDEN_FAMILIAS = ['Pop', 'Rock', 'Folk', 'Funk', 'Latino', 'Balada', 'Folklore'];
const f = { q: '', familia: 'todos', artista: 'todos', favs: false, orden: 'catalogo' };
let lista = [], mostrados = 0, actual = -1, timerLetra = null, obs = null;

const porId = id => getCatalogo().canciones.find(c => c.id === id);
const portada = c => c.portada || portadaSVG(c.titulo + c.artista);

function filtrar() {
    const q = norm(f.q), favs = getFavs();
    lista = getCatalogo().canciones.filter(c => (f.familia === 'todos' || c.familia === f.familia) && (f.artista === 'todos' || c.artista === f.artista) && (!f.favs || favs.includes(c.id)) && (!q || norm(`${c.titulo} ${c.artista} ${c.genero} ${c.album}`).includes(q)));
    const o = f.orden, cmp = { az: (a, b) => a.titulo.localeCompare(b.titulo, 'es'), artista: (a, b) => a.artista.localeCompare(b.artista, 'es') || a.titulo.localeCompare(b.titulo, 'es'), genero: (a, b) => a.genero.localeCompare(b.genero, 'es'), nuevas: (a, b) => b.id - a.id }[o];
    if (cmp) lista.sort(cmp);
    mostrados = 0; $('#catalogoKaraoke').empty(); $('#contPistas').text(`${lista.length} ${lista.length === 1 ? 'pista' : 'pistas'}`);
    $('#vacioPistas').toggleClass('d-none', lista.length > 0); renderMas();
}

function tarjeta(c) {
    const fav = getFavs().includes(c.id), enCola = tienePista(c.id);
    return el('article', { class: 'tarjeta-prod pista-card reveal', role: 'button', tabindex: 0, 'aria-label': `${c.titulo}, ${c.artista}. Abrir`, data: { id: c.id } },
        imgLazy({ src: c.portada, alt: '', fallback: portadaSVG(c.titulo + c.artista), w: 52, h: 52 }),
        el('div', { class: 'info-prod' }, el('h4', { text: c.titulo }), el('p', { text: `${c.artista} • ${c.genero}` })),
        el('button', { type: 'button', class: `btn-ic js-fav ${fav ? 'on' : ''}`, 'aria-label': fav ? `Quitar ${c.titulo} de favoritas` : `Marcar ${c.titulo} como favorita`, 'aria-pressed': fav }, icono('heart')),
        el('button', { type: 'button', class: `btn-ic js-add-pista ${enCola ? 'on' : ''}`, 'aria-label': enCola ? `${c.titulo} ya está en la cola` : `Agregar ${c.titulo} a la cola` }, icono(enCola ? 'check' : 'plus')));
}
function renderMas() {
    const $c = $('#catalogoKaraoke'), trozo = lista.slice(mostrados, mostrados + PAGINA);
    trozo.forEach(c => $c.append(tarjeta(c))); mostrados += trozo.length;
    inicializarLazyLoading($c); observarReveal($c);
    $('#btnMasPistas').toggleClass('d-none', mostrados >= lista.length);
}

// ---------- Filtros ----------
function construirFiltros() {
    const cat = getCatalogo(), fams = [...new Set(cat.canciones.map(c => c.familia))].sort((a, b) => (ORDEN_FAMILIAS.indexOf(a) + 1 || 99) - (ORDEN_FAMILIAS.indexOf(b) + 1 || 99));
    $('#filtrosGenero').empty().append(['todos', ...fams].map(g => el('button', { type: 'button', class: `chip ${g === f.familia ? 'active' : ''}`, 'aria-pressed': g === f.familia, data: { filtro: g }, text: g === 'todos' ? 'Todos' : g })));
    $('#selArtista').empty().append(el('option', { value: 'todos', text: 'Todos los artistas' }), [...new Set(cat.canciones.map(c => c.artista))].sort((a, b) => a.localeCompare(b, 'es')).map(a => el('option', { value: a, text: a })));
}

// ---------- Modal: disco giratorio ----------
function lineas(letra) { return letra ? letra.replace(/\.\.\.\s*/g, '...\n').split('\n').map(s => s.trim()).filter(Boolean) : []; }
function pintarPista() {
    const c = lista[actual]; if (!c) return;
    const hd = c.portada_hd || c.portada;
    $('#pistaImgHD').off('error.p').one('error.p', function () { this.src = portadaSVG(c.titulo + c.artista); }).attr({ src: hd || portadaSVG(c.titulo + c.artista), alt: `Portada de ${c.titulo}` });
    $('#pistaTitulo').text(c.titulo); $('#pistaArtista').text(c.artista); $('#pistaMeta').text([c.genero, c.album].filter(Boolean).join(' • ')); $('#pistaPos').text(`${actual + 1} / ${lista.length}`);
    const ls = lineas(c.letra), $l = $('#pistaLetra').empty();
    if (ls.length) ls.forEach((t, i) => $l.append(el('p', { class: 'linea-letra', data: { i }, text: t }))); else $l.append(el('p', { class: 'text-muted-k small mb-0', text: 'La letra no está incluida en el catálogo. Cántala con la pantalla de tu sala.' }));
    estadoBotones(); reproducir(true);
}
function estadoBotones() {
    const c = lista[actual]; if (!c) return; const enCola = tienePista(c.id), fav = getFavs().includes(c.id);
    $('#btnAgregarPista').empty().append(icono(enCola ? 'check-circle' : 'plus-circle', 'fs-5'), enCola ? ' En la cola (quitar)' : ' Agregar a la cola').toggleClass('btn-success', enCola).toggleClass('btn-gradient', !enCola);
    $('#btnFavPista').toggleClass('on', fav).attr('aria-pressed', fav);
    $('#btnPrevPista').prop('disabled', actual <= 0); $('#btnNextPista').prop('disabled', actual >= lista.length - 1);
}
function reproducir(on) {
    clearInterval(timerLetra); $('.vinyl-wrapper').toggleClass('pausado', !on); $('#btnGirar').attr('aria-pressed', on).empty().append(icono(on ? 'pause' : 'play'), on ? ' Pausar' : ' Girar');
    const $ls = $('#pistaLetra .linea-letra').removeClass('activa'); if (!on || !$ls.length) return;
    let i = 0; $ls.eq(0).addClass('activa');
    timerLetra = setInterval(() => { i = (i + 1) % $ls.length; $ls.removeClass('activa').eq(i).addClass('activa')[0].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 2400);
}
function abrir(id) {
    actual = lista.findIndex(c => c.id === id); if (actual < 0) return;
    pintarPista(); bootstrap.Modal.getOrCreateInstance($('#modalPista')[0]).show();
}
function alternarCola(c) {
    if (tienePista(c.id)) { quitarPista(c.id); toast(`${c.titulo} salió de la cola.`, 'info'); return; }
    const r = agregarPista(c, LIMITES.pistasPorHora * horasActuales());
    if (r === 'max') toast(`Máximo ${LIMITES.pistasPorHora * horasActuales()} pistas para ${horasActuales()} h. Aumenta la duración o quita alguna.`, 'warn', 'Cola llena');
    else { toast(`${c.titulo} agregada a tu cola.`, 'ok'); }
}
function refrescarTarjeta(id) { const c = porId(id), $t = $(`.pista-card[data-id="${id}"]`); if ($t.length) $t.replaceWith(tarjeta(c).addClass('visible')); inicializarLazyLoading($('#catalogoKaraoke')); }

// ---------- Prueba de micrófono ----------
function dibujarMic(buf) {
    const cv = $('#micCanvas')[0], g = cv.getContext('2d'), w = cv.width, h = cv.height, n = 28, bw = w / n; g.clearRect(0, 0, w, h);
    const grad = g.createLinearGradient(0, h, 0, 0); grad.addColorStop(0, '#22d3ee'); grad.addColorStop(.6, '#c084fc'); grad.addColorStop(1, '#f472b6'); g.fillStyle = grad;
    let suma = 0; for (let i = 0; i < n; i++) { const v = buf[i] / 255; suma += v; const bh = Math.max(4, v * h); g.fillRect(i * bw + 2, h - bh, bw - 4, bh); }
    $('#micNivel').text(suma / n > .35 ? 'Muy bien, se te escucha fuerte' : suma / n > .08 ? 'Se te escucha bien' : 'Habla o canta más cerca del micrófono');
}
async function alternarMic() {
    const $b = $('#btnMicToggle');
    if ($b.data('on')) { detenerMic(); $b.data('on', false).empty().append(icono('microphone'), ' Iniciar prueba'); return; }
    try { await iniciarMic(dibujarMic); $b.data('on', true).empty().append(icono('stop-circle'), ' Detener'); $('#micError').addClass('d-none'); }
    catch (e) { $('#micError').removeClass('d-none').text(e.message); }
}

export function iniciarPistas() {
    construirFiltros(); filtrar();
    delegar('#filtrosGenero', '.chip', 'click', (e, $t) => { f.familia = $t.data('filtro'); $('#filtrosGenero .chip').removeClass('active').attr('aria-pressed', false); $t.addClass('active').attr('aria-pressed', true); filtrar(); });
    $('#buscadorPistas').off('input.p').on('input.p', debounce(function () { f.q = this.value.slice(0, 60); filtrar(); }, 250));
    $('#selArtista').off('change.p').on('change.p', function () { f.artista = this.value; filtrar(); });
    $('#selOrden').off('change.p').on('change.p', function () { f.orden = this.value; filtrar(); });
    $('#chkFavs').off('change.p').on('change.p', function () { f.favs = this.checked; filtrar(); });
    $('#btnLimpiarPistas').off('click.p').on('click.p', () => { Object.assign(f, { q: '', familia: 'todos', artista: 'todos', favs: false, orden: 'catalogo' }); $('#buscadorPistas').val(''); $('#selArtista').val('todos'); $('#selOrden').val('catalogo'); $('#chkFavs').prop('checked', false); construirFiltros(); filtrar(); });
    $('#btnMasPistas').off('click.p').on('click.p', renderMas);
    $('#btnAleatorio').off('click.p').on('click.p', e => {
        const libres = getCatalogo().canciones.filter(c => !tienePista(c.id)); if (!libres.length) return toast('Ya agregaste todas las pistas.', 'info');
        const c = libres[Math.floor(Math.random() * libres.length)]; alternarCola(c); celebrar(e.clientX, e.clientY, 8);
    });
    if ('IntersectionObserver' in window) { obs?.disconnect(); obs = new IntersectionObserver(es => { if (es[0].isIntersecting && mostrados < lista.length) renderMas(); }, { rootMargin: '300px' }); obs.observe($('#centinelaPistas')[0]); }

    delegarActivar('#catalogoKaraoke', '.pista-card', (e, $t) => abrir($t.data('id')));
    delegar('#catalogoKaraoke', '.js-fav', 'click', (e, $t) => { e.stopPropagation(); const id = $t.closest('.pista-card').data('id'), on = toggleFav(id); toast(on ? 'Agregada a favoritas.' : 'Quitada de favoritas.', 'info'); if (f.favs) filtrar(); else refrescarTarjeta(id); });
    delegar('#catalogoKaraoke', '.js-add-pista', 'click', (e, $t) => { e.stopPropagation(); const id = $t.closest('.pista-card').data('id'); alternarCola(porId(id)); });
    $('#btnAgregarPista').off('click.p').on('click.p', () => { const c = lista[actual]; alternarCola(c); estadoBotones(); });
    $('#btnFavPista').off('click.p').on('click.p', () => { const c = lista[actual]; toggleFav(c.id); estadoBotones(); refrescarTarjeta(c.id); });
    $('#btnPrevPista').off('click.p').on('click.p', () => { if (actual > 0) { actual--; pintarPista(); } });
    $('#btnNextPista').off('click.p').on('click.p', () => { if (actual < lista.length - 1) { actual++; pintarPista(); } });
    $('#btnGirar').off('click.p').on('click.p', () => reproducir($('.vinyl-wrapper').hasClass('pausado')));
    $('#modalPista').off('hidden.bs.modal.p').on('hidden.bs.modal.p', () => { clearInterval(timerLetra); });
    $('#modalPista').off('keydown.p').on('keydown.p', e => { if (e.key === 'ArrowRight') $('#btnNextPista').trigger('click'); if (e.key === 'ArrowLeft') $('#btnPrevPista').trigger('click'); });
    $(document).off('pedido:cambio.pistas').on('pedido:cambio.pistas', () => { $('#catalogoKaraoke .pista-card').each(function () { const $t = $(this), id = $t.data('id'), en = tienePista(id); $t.find('.js-add-pista').toggleClass('on', en).empty().append(icono(en ? 'check' : 'plus')); }); if ($('#modalPista').hasClass('show')) estadoBotones(); });

    $('#btnMic').off('click.p').on('click.p', () => bootstrap.Modal.getOrCreateInstance($('#modalMic')[0]).show());
    $('#btnMicToggle').off('click.p').on('click.p', alternarMic);
    $('#modalMic').off('hidden.bs.modal.p').on('hidden.bs.modal.p', () => { detenerMic(); $('#btnMicToggle').data('on', false).empty().append(icono('microphone'), ' Iniciar prueba'); });
}
