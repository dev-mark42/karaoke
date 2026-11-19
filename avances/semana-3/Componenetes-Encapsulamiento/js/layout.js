/* =========================================
   LAYOUT MOBILE-FIRST (Base para Celular)
   ========================================= */

/* Grid del catálogo: 1 columna por defecto (móvil) */
.catalogo-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 10px;
}

/* El cuerpo interno de la tarjeta usa Flexbox para alinear verticalmente */
.card-cuerpo {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex-grow: 1;
}

/* Precio con estilo destacado */
.card-precio {
    font-size: 1.4rem;
    font-weight: bold;
    color: #00ff66;
    margin: 10px 0;
}

/* =========================================
   MEDIA QUERY (Escritorio / Tablet)
   ========================================= */
@media (min-width: 768px) {
    /* En pantallas grandes, el catálogo se vuelve una cuadrícula automática */
    .catalogo-grid {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }

    /* Clase especial para simular vista móvil desde el botón */
    .catalogo-grid.sim-movil {
        grid-template-columns: 1fr !important;
        max-width: 380px;
        margin: 0 auto; /* Centra la columna simulada */
    }
}
