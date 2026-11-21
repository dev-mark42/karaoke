// =========================================
// COMPONENTE: TARJETA (Delegación de Eventos)
// =========================================
document.addEventListener('click', (e) => {
    if (!e.target.matches('.btn-simular')) return;
    const tarjeta = e.target.closest('.card-item');
    const estado = tarjeta.querySelector('.card-item_estado');
    const activo = tarjeta.classList.toggle('card-item--activo');

    estado.textContent = activo
        ? 'Estado: Seleccionado (Simulación)'
        : 'Estado: Disponible';
});
