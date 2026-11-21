// =========================================
// SIMULADOR DE ALTO CONTRASTE (a11y)
// =========================================

document.addEventListener('DOMContentLoaded', () => {
    const btnContraste = document.getElementById('btnSimularContraste');
    const body = document.body;

    if (btnContraste) {
        btnContraste.addEventListener('click', () => {
            // Alterna la clase 'alto-contraste' en el body
            body.classList.toggle('alto-contraste');

            // Cambiar el texto del botón para dar feedback al usuario
            if (body.classList.contains('alto-contraste')) {
                btnContraste.textContent = 'Quitar Alto Contraste';
                btnContraste.setAttribute('aria-pressed', 'true');
            } else {
                btnContraste.textContent = 'Simular Alto Contraste (WCAG)';
                btnContraste.setAttribute('aria-pressed', 'false');
            }
        });
    }
});
