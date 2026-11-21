// Avance: Prueba de micrófono (Web Audio API) con manejo de permisos y errores.
let ctx = null, stream = null, raf = 0;
export async function iniciarMic(onNivel) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Tu navegador no permite usar el micrófono (se requiere HTTPS).');
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { throw new Error(e.name === 'NotAllowedError' ? 'Permiso de micrófono denegado.' : e.name === 'NotFoundError' ? 'No se encontró ningún micrófono.' : 'No se pudo iniciar el micrófono.'); }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const an = ctx.createAnalyser(); an.fftSize = 128; ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.frequencyBinCount);
    (function bucle() { an.getByteFrequencyData(buf); onNivel(buf); raf = requestAnimationFrame(bucle); })();
}
export function detenerMic() {
    cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); ctx?.close?.().catch(() => {}); stream = ctx = null;
}
