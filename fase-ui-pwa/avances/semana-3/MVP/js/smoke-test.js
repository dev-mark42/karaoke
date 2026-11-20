// =========================================
// SIMULADOR DE SMOKE TESTING
// =========================================

document.addEventListener('DOMContentLoaded', () => {
    const btnSmokeTest = document.getElementById('btnSmokeTest');
    const salidaAudit = document.getElementById('salidaAudit');

    if (btnSmokeTest) {
        btnSmokeTest.addEventListener('click', () => {
            // Ejecutar la auditoría del DOM
            ejecutarSmokeTest();
        });
    }

    function ejecutarSmokeTest() {
        // 1. Contar imágenes sin atributo ALT o con ALT vacío
        const imagenesSinAlt = document.querySelectorAll('img:not([alt]), img[alt=""]').length;

        // 2. Contar enlaces vacíos (href="") o sin href
        const enlacesVacios = document.querySelectorAll('a[href=""], a:not([href])').length;

        // 3. Contar la cantidad total de botones en la página
        const botones = document.querySelectorAll('button').length;

        // 4. Contar otros elementos semánticos (ejemplo: secciones)
        const secciones = document.querySelectorAll('section, article').length;

        // Limpiar las clases previas del resultado
        salidaAudit.classList.remove('success', 'warning', 'error');

        // 5. Construir el mensaje de salida
        let mensaje = `Resultados del Smoke Test:\n`;
        mensaje += `✅ Botones: ${botones} | `;
        mensaje += `✅ Secciones/Artículos: ${secciones} | `;
        mensaje += `${imagenesSinAlt === 0 ? '✅' : '❌'} Imágenes sin alt: ${imagenesSinAlt} | `;
        mensaje += `${enlacesVacios === 0 ? '✅' : '❌'} Enlaces vacíos: ${enlacesVacios}`;

        // 6. Lógica de colores según el resultado
        if (imagenesSinAlt === 0 && enlacesVacios === 0) {
            salidaAudit.textContent = mensaje + `\n🎉 ¡Todo correcto! Puedes desplegar con seguridad.`;
            salidaAudit.classList.add('success');
        } else if (imagenesSinAlt > 0 || enlacesVacios > 0) {
            salidaAudit.textContent = mensaje + `\n⚠️ Revisa los elementos marcados en rojo antes de desplegar.`;
            salidaAudit.classList.add('warning');
        } else {
            salidaAudit.textContent = mensaje + `\nℹ️ Auditoría completada.`;
        }

        // Log en consola para pruebas de QA
        console.log("Smoke Test ejecutado:", { botones, secciones, imagenesSinAlt, enlacesVacios });
    }
});
