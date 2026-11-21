# Karaoke UPDS · Proyecto reorganizado

## Estructura
- `index.html`: única entrada central del sistema.
- `css/`, `js/`, `assets/`: estilos, módulos y catálogo.
- `sw.js`, `manifest.json`: PWA y caché offline-first.
- `supabase/schema.sql`: tablas, perfiles, RLS y políticas.
- `avances/semana-3/`: avances académicos autónomos, cada uno conserva su HTML/CSS/JS.

## Activar Supabase
1. Crea un proyecto en https://supabase.com.
2. En SQL Editor ejecuta `supabase/schema.sql`.
3. La URL y la publishable key que compartiste ya están configuradas en `js/core/supabase-config.js`.
4. La publishable key puede estar en el frontend; nunca uses una `sb_secret_` ni `service_role` en el navegador. La protección de datos depende de las políticas RLS.
5. Registra un usuario desde el botón **Cuenta**.
6. Para convertirlo en administrador, ejecuta en SQL Editor:
   `update public.profiles set role='admin' where id=(select id from auth.users where email='TU_CORREO');`
7. Inicia sesión de nuevo. En el panel de administración pulsa **Publicar catálogo local en Supabase**.

## Offline First
El service worker precachea los archivos locales de la aplicación y los avances. Reservas se guardan primero en localStorage; se encolan y sincronizan con Supabase cuando vuelve la red y hay sesión iniciada. Si el usuario reserva sin sesión, los datos permanecen en el dispositivo hasta iniciar sesión. Para uso real multi-dispositivo, la reserva offline no bloquea una sala en el servidor hasta sincronizarse; la disponibilidad debe validarse otra vez en línea antes de confirmar el pago.

**Nota de dependencias:** la versión original usa Bootstrap, jQuery, iconos y fuentes alojados en CDN. La aplicación principal conserva esas dependencias externas; para un modo 100% desconectado desde una instalación limpia, descarga esas bibliotecas a `assets/vendor/` y cambia sus referencias CDN a rutas locales. Una sesión ya cargada puede seguir operando con la caché local, pero no se debe prometer que recursos CDN nunca serán necesarios.

## Música y letras sincronizadas
Cada registro de `assets/data/canciones.json` puede incorporar:
- `audio_url`: URL HTTPS o ruta local a un audio del que tengas derechos de reproducción.
- `letra_timing`: arreglo de objetos `{ "time": 0.0, "text": "Primera línea" }`, con segundos desde el inicio.
El reproductor HTML5 sincroniza el resaltado de líneas con `audio.currentTime`. Las letras del catálogo actual son fragmentos de ejemplo y no incluyen tiempos; no se descargan canciones ni letras con copyright de una API no autorizada. Para producción, almacena los audios propios/licenciados en Supabase Storage y usa URLs públicas o firmadas.

## Recibo
La aplicación conserva la vista de ticket y su opción PDF/impresión del proyecto original. Para impresión física usa el diálogo del navegador desde la vista del recibo.

## Archivos de semana 3
El ZIP recibido incluía MVP/Smoke Test, Componentes-Encapsulamiento, Mobile-First y Accesibilidad. No incluía los PDFs que mencionas; cuando los compartas, se pueden integrar sin inventar requisitos.


## Subir al repositorio Git por SSH
Abre una terminal dentro de la carpeta `karaoke-upds` (la carpeta que contiene `index.html`) y ejecuta:

```bash
git init
git add .
git commit -m "Karaoke UPDS: estructura inicial"
# Sustituye la URL por la SSH que muestra tu repositorio remoto:
git remote add origin git@github.com:TU_USUARIO/TU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

Si ya existe un remoto `origin`, no repitas `git remote add`; revisa con `git remote -v` y actualiza con `git remote set-url origin git@github.com:TU_USUARIO/TU_REPOSITORIO.git`. Tener SSH configurada en tu equipo permite autenticar el `git push` desde ese equipo; esta sesión no puede usar la clave SSH privada de tu computadora.
