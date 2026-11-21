// Avance: Validaciones de formularios (mensajes accesibles) y validadores de pago (Luhn, vencimiento, CVV).
const $ = window.jQuery;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const V = {
    nombre: v => !v ? 'Ingresa tu nombre.' : !/^[\p{L}][\p{L}\s'.-]{2,39}$/u.test(v) ? 'Solo letras (3 a 40 caracteres).' : '',
    telefono: v => !v ? 'Ingresa tu celular.' : !/^[67]\d{7}$/.test(v) ? 'Celular boliviano de 8 dígitos (ej. 71234567).' : '',
    email: v => v && (!EMAIL_RE.test(v) || v.length > 80) ? 'Correo no válido.' : '',
    nota: v => v.length > 200 ? 'Máximo 200 caracteres.' : ''
};

// --- Marca visual de error / éxito y mensaje enlazado por aria-describedby ---
export function marcarCampo($i, msg) {
    const id = $i.attr('id') || ('c' + Math.random().toString(36).slice(2, 7)); $i.attr('id', id);
    let $fb = $i.siblings(`.invalid-feedback[data-for="${id}"]`);
    if (msg) {
        if (!$fb.length) $fb = $('<div class="invalid-feedback" role="alert">').attr({ 'data-for': id, id: id + '-err' }).insertAfter($i);
        $fb.text(msg).show(); $i.attr({ 'aria-invalid': 'true', 'aria-describedby': id + '-err' });
    } else { $fb.remove(); $i.removeAttr('aria-invalid aria-describedby'); }
    $i.toggleClass('is-invalid', !!msg).toggleClass('is-valid', !msg && String($i.val()).trim() !== '');
    return !msg;
}
export const validarCampo = ($i, fn) => marcarCampo($i, fn(String($i.val() ?? '').trim()));
export function limpiarValidacion($form) { $form.find('.is-invalid,.is-valid').removeClass('is-invalid is-valid').removeAttr('aria-invalid'); $form.find('.invalid-feedback').remove(); }

// --- Tarjeta de crédito/débito ---
export const soloDigitos = v => String(v).replace(/\D/g, '');
export function luhn(num) {
    const d = soloDigitos(num); if (d.length < 12) return false;
    let s = 0, alt = false;
    for (let i = d.length - 1; i >= 0; i--) { let n = +d[i]; if (alt) { n *= 2; if (n > 9) n -= 9; } s += n; alt = !alt; }
    return s % 10 === 0;
}
export function marcaTarjeta(num) {
    const d = soloDigitos(num);
    if (/^4/.test(d)) return 'Visa';
    if (/^(5[1-5]|2(2[2-9]|[3-6]|7[01]|720))/.test(d)) return 'Mastercard';
    if (/^3[47]/.test(d)) return 'American Express';
    return '';
}
export function formatoTarjeta(num) {
    const d = soloDigitos(num).slice(0, marcaTarjeta(num) === 'American Express' ? 15 : 16);
    return marcaTarjeta(num) === 'American Express' ? d.replace(/^(\d{4})(\d{0,6})(\d{0,5}).*/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' ')) : d.replace(/(\d{4})(?=\d)/g, '$1 ');
}
export function errorNumeroTarjeta(v) {
    const d = soloDigitos(v), m = marcaTarjeta(v);
    if (!d) return 'Ingresa el número de tarjeta.';
    if (!m) return 'Solo se aceptan Visa, Mastercard y American Express.';
    if (d.length !== (m === 'American Express' ? 15 : 16)) return 'El número está incompleto.';
    return luhn(d) ? '' : 'Número de tarjeta inválido.';
}
export function errorVencimiento(v, ahora = new Date()) {
    const m = /^(\d{2})\/(\d{2})$/.exec(v); if (!m) return 'Formato MM/AA.';
    const mes = +m[1], anio = 2000 + +m[2]; if (mes < 1 || mes > 12) return 'Mes inválido.';
    const fin = new Date(anio, mes, 0, 23, 59, 59);
    if (fin < ahora) return 'La tarjeta está vencida.';
    return anio > ahora.getFullYear() + 15 ? 'Fecha de vencimiento no válida.' : '';
}
export const errorCVV = (v, marca) => { const n = marca === 'American Express' ? 4 : 3; return new RegExp(`^\\d{${n}}$`).test(v) ? '' : `El CVV tiene ${n} dígitos.`; };
export const errorTitular = v => !v ? 'Ingresa el nombre del titular.' : /^[\p{L}][\p{L}\s'.-]{2,39}$/u.test(v) ? '' : 'Nombre del titular no válido.';
