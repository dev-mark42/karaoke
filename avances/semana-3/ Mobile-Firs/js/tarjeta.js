// =========================================
// COMPONENTE: TARJETA (Hidratación y Delegación)
// =========================================

document.addEventListener('click', (e) => {
    // 1. Verificamos si el clic fue en un botón de simulación
    if (!e.target.matches('.btn-simular')) return;

    // 2. Encontramos la tarjeta más cercana (su padre contenedor)
    const tarjeta = e.target.closest('.card-item');

    // 3. Buscamos el elemento de estado dentro de ESTA tarjeta
    const estado = tarjeta.querySelector('.card-item_estado');

    // 4. Alternamos la clase modificadora (--activo)
    const activo = tarjeta.classList.toggle('card-item--activo');

    // 5. Actualizamos el texto del estado
    estado.textContent = activo
        ? 'Estado: Seleccionado (Simulación)'
        : 'Estado: Disponible';
});
