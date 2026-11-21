// =========================================
// SIMULADOR DE VISTA RESPONSIVA
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnSimularVista');
    const grid = document.getElementById('grid-catalogo');

    if(btn && grid) {
        btn.addEventListener('click', () => {
            grid.classList.toggle('sim-movil');

            if (grid.classList.contains('sim-movil')) {
                btn.textContent = 'Ver Vista Escritorio';
                btn.style.backgroundColor = '#00cc52';
            } else {
                btn.textContent = 'Simular Vista Móvil';
                btn.style.backgroundColor = '#444';
            }
        });
    }
});
