// Avance: Hidratación de la interfaz (muestra la app cuando las fuentes están listas)
export function iniciarHidratacion() {
    const listo = () => document.body.classList.add('hidratado');
    (document.fonts?.ready || Promise.resolve()).then(listo); setTimeout(listo, 1200);
}
