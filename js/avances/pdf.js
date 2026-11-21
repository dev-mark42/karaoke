// Avance: Carga diferida (lazy) de html2pdf: solo se descarga cuando el usuario pide el PDF (ahorra ~900 KB al inicio).
let promesa = null;
const URL_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
function cargarLib() {
    if (window.html2pdf) return Promise.resolve();
    promesa = promesa || new Promise((ok, fail) => {
        const s = document.createElement('script'); s.src = URL_LIB; s.async = true; s.onload = ok;
        s.onerror = () => { promesa = null; fail(new Error('No se pudo cargar el generador de PDF. Revisa tu conexión.')); };
        document.head.appendChild(s);
    });
    return promesa;
}
export async function descargarPDF(nodo, nombre) {
    await cargarLib();
    return window.html2pdf().set({ margin: 0.4, filename: nombre, html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true }, jsPDF: { unit: 'in', format: 'a5', orientation: 'portrait' } }).from(nodo).save();
}
