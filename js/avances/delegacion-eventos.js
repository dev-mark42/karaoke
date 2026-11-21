// Avance: Delegación de eventos con jQuery. Siempre .off() antes de .on() (namespaced) => sin listeners duplicados ni fugas de memoria.
const $ = window.jQuery;
const ns = sel => '.d' + sel.replace(/[^a-z0-9]/gi, '');

export function delegar(contenedor, selector, evento, handler) {
    const e = `${evento}${ns(selector)}`;
    $(contenedor).off(e, selector).on(e, selector, function (ev) { return handler.call(this, ev, $(this)); });
}
// Accesibilidad: elementos role="button" responden a click, Enter y Espacio
export function delegarActivar(contenedor, selector, handler) {
    delegar(contenedor, selector, 'click', handler);
    const e = `keydown${ns(selector)}k`;
    $(contenedor).off(e, selector).on(e, selector, function (ev) {
        if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === this) { ev.preventDefault(); handler.call(this, ev, $(this)); }
    });
}
