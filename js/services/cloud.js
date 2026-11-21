import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_READY } from '../core/supabase-config.js';

let client = null;
export async function getSupabase() {
  if (!SUPABASE_READY) return null;
  if (!client) {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  }
  return client;
}
const KEY='karaoke_sync_queue_v1';
import { getCatalogo } from '../core/almacen.js';
const readQueue=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
const writeQueue=q=>localStorage.setItem(KEY,JSON.stringify(q));
export const currentSession=async()=>{const sb=await getSupabase(); if(!sb)return null; const {data}=await sb.auth.getSession(); return data.session||null};

export async function enqueueReservation(reservation) {
  const queue=readQueue(); queue.push({id:reservation.id, reservation, created_at:new Date().toISOString()}); writeQueue(queue);
  return flushQueue();
}
export async function flushQueue() {
  if(!navigator.onLine) return {synced:0,pending:readQueue().length};
  const sb=await getSupabase(); if(!sb) return {synced:0,pending:readQueue().length,unconfigured:true};
  const session=await currentSession(); if(!session) return {synced:0,pending:readQueue().length,needsLogin:true};
  const queue=readQueue(); let synced=0; const pending=[];
  for(const item of queue) {
    const r=item.reservation;
    const row={id:r.id, user_id:session.user.id, code:r.codigo, customer_name:r.cliente?.nombre||'', customer_phone:r.cliente?.telefono||'', customer_email:r.cliente?.email||null, room_id:r.sala, booking_date:r.fecha, start_time:r.inicio, duration_hours:r.horas, people:r.personas, occasion:r.ocasion||null, notes:r.notas||null, status:r.estado||'pendiente', songs:r.pistas||[], items:r.items||[], amounts:r.montos||{}, payment:r.pago||{}, payload:r};
    const {error}=await sb.from('reservations').upsert(row,{onConflict:'id'});
    if(error) pending.push(item); else synced++;
  }
  writeQueue(pending); return {synced,pending:pending.length};
}
export async function getProfile() {
 const sb=await getSupabase(); if(!sb)return null; const s=await currentSession(); if(!s)return null;
 const {data,error}=await sb.from('profiles').select('id,full_name,role').eq('id',s.user.id).maybeSingle();
 if(error) throw error; return data;
}
export async function initCloudUI() {
 const host=document.createElement('div'); host.id='cloud-access';
 host.innerHTML=`<button class="cloud-fab" id="cloudOpen" aria-label="Cuenta y administración">♙ Cuenta</button>
 <div class="cloud-panel" id="cloudPanel" hidden><div class="cloud-head"><b>Cuenta Karaoke</b><button id="cloudClose" aria-label="Cerrar">×</button></div>
 <div id="cloudStatus" class="cloud-status">Modo local disponible. Configura Supabase para activar cuentas y sincronización.</div>
 <div id="cloudForms"><form id="cloudLogin"><h3>Iniciar sesión</h3><input name="email" type="email" placeholder="Correo" required autocomplete="email"><input name="password" type="password" placeholder="Contraseña" required minlength="6"><button>Entrar</button></form>
 <form id="cloudRegister"><h3>Crear cuenta</h3><input name="name" placeholder="Nombre completo" required maxlength="80"><input name="email" type="email" placeholder="Correo" required><input name="password" type="password" placeholder="Contraseña (mín. 8)" required minlength="8"><button>Registrarme</button></form></div>
 <div id="cloudSigned" hidden><p id="cloudUser"></p><button id="cloudSync">Sincronizar pendientes</button><button id="cloudAdmin" hidden>Panel de administración</button><button id="cloudLogout" class="secondary">Cerrar sesión</button></div>
 <div id="cloudAdminPanel" hidden><button id="cloudPublishCatalog">Publicar catálogo local en Supabase</button><h3>Reservas recientes</h3><div id="cloudBookings"></div><h3>Clientes registrados</h3><div id="cloudCustomers"></div></div></div>`;
 document.body.append(host);
 const panel=host.querySelector('#cloudPanel'), status=host.querySelector('#cloudStatus');
 const msg=t=>{status.textContent=t};
 host.querySelector('#cloudOpen').onclick=()=>panel.hidden=!panel.hidden;
 host.querySelector('#cloudClose').onclick=()=>panel.hidden=true;
 const sb=await getSupabase();
 if(!sb){msg('Supabase no está configurado. La app seguirá guardando reservas localmente; completa js/core/supabase-config.js y ejecuta supabase/schema.sql.');return;}
 const refresh=async()=>{
  const session=await currentSession(); const signed=!!session;
  host.querySelector('#cloudForms').hidden=signed; host.querySelector('#cloudSigned').hidden=!signed;
  if(!signed){msg('Inicia sesión o crea tu cuenta.');return;}
  host.querySelector('#cloudUser').textContent=session.user.email;
  try {const p=await getProfile(); const isAdmin=p?.role==='admin'; host.querySelector('#cloudAdmin').hidden=!isAdmin; msg(`Sesión activa · ${p?.full_name||session.user.email} · ${isAdmin?'Administrador':'Cliente'}`);}catch(e){msg('Sesión activa. Perfil pendiente de configuración.');}
  const sync=await flushQueue(); if(sync.synced) msg(`Sesión activa · ${sync.synced} reserva(s) sincronizada(s).`);
 };
 host.querySelector('#cloudLogin').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});msg(error?.message||'Acceso correcto.');if(!error)await refresh();};
 host.querySelector('#cloudRegister').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {data,error}=await sb.auth.signUp({email:f.get('email'),password:f.get('password'),options:{data:{full_name:f.get('name')}}});msg(error?.message||'Cuenta creada. Revisa tu correo si la confirmación está activada.');if(data.session)await refresh();};
 host.querySelector('#cloudLogout').onclick=async()=>{await sb.auth.signOut();await refresh();};
 host.querySelector('#cloudSync').onclick=async()=>{const r=await flushQueue();msg(`${r.synced} sincronizadas · ${r.pending} pendientes.`);};
 host.querySelector('#cloudPublishCatalog').onclick=async()=>{
  const cat=getCatalogo(); if(!cat){msg('Catálogo local aún no cargado.');return;}
  const songs=cat.canciones.map(c=>({id:c.id,title:c.titulo,artist:c.artista,genre:c.genero,album:c.album,cover_url:c.portada,audio_url:c.audio_url||null,lyrics:c.letra,lyrics_timing:c.letra_timing||[],active:true}));
  const products=[...cat.snacks.map(x=>({...x,product_type:'snack'})),...cat.bebidas.map(x=>({...x,product_type:'drink'}))].map(x=>({id:x.id,title:x.titulo,description:x.desc,price:x.precio,category:x.categoria,product_type:x.product_type,image_url:x.portada||null,active:true}));
  const a=await sb.from('songs').upsert(songs); const b=await sb.from('menu_products').upsert(products);
  msg(a.error?.message||b.error?.message||`Catálogo publicado: ${songs.length} canciones y ${products.length} productos.`);
 };
 host.querySelector('#cloudAdmin').onclick=async()=>{
  const p=host.querySelector('#cloudAdminPanel');p.hidden=!p.hidden;if(p.hidden)return;
  const {data,error}=await sb.from('reservations').select('code,customer_name,customer_phone,booking_date,start_time,status,amounts').order('created_at',{ascending:false}).limit(50);
  const box=host.querySelector('#cloudBookings');box.replaceChildren();
  if(error){box.textContent=error.message;return;}
  data.forEach(r=>{
   const el=document.createElement('article');el.className='cloud-booking';
   const line=document.createElement('div');line.textContent=`${r.code} · ${r.customer_name} · ${r.customer_phone} · ${r.booking_date} ${r.start_time} · Bs ${r.amounts?.total??'—'}`;
   const select=document.createElement('select');select.setAttribute('aria-label',`Estado de ${r.code}`);
   ['pendiente','verificando','pagada','cancelada'].forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;o.selected=v===r.status;select.append(o);});
   select.onchange=async()=>{const {error}=await sb.from('reservations').update({status:select.value}).eq('code',r.code);msg(error?.message||`Reserva ${r.code} actualizada.`);};
   el.append(line,select);box.append(el);
  });
  const customers=host.querySelector('#cloudCustomers');customers.replaceChildren();
  const {data:people,error:peopleError}=await sb.from('profiles').select('full_name,role,created_at').order('created_at',{ascending:false}).limit(100);
  if(peopleError){customers.textContent=peopleError.message;return;}
  people.forEach(person=>{const el=document.createElement('article');el.className='cloud-booking';el.textContent=`${person.full_name||'Cliente'} · ${person.role} · ${new Date(person.created_at).toLocaleDateString()}`;customers.append(el);});
 };
 sb.auth.onAuthStateChange(()=>setTimeout(refresh,0)); await refresh();
}
export function queueLocalReservation(reservation){ return enqueueReservation(reservation).catch(e=>console.warn('[sync]',e)); }

export async function hydrateCatalogFromCloud(){
 if(!navigator.onLine)return;
 const sb=await getSupabase();if(!sb)return;
 try{
  const [{data:songs},{data:products}]=await Promise.all([
   sb.from('songs').select('*').eq('active',true),
   sb.from('menu_products').select('*').eq('active',true)
  ]);
  const cat=getCatalogo();if(!cat)return;
  if(songs?.length)cat.canciones=songs.map(s=>({id:s.id,titulo:s.title,artista:s.artist,genero:s.genre||'',album:s.album||'',portada:s.cover_url||'',audio_url:s.audio_url||'',letra:s.lyrics||'',letra_timing:s.lyrics_timing||[],familia:s.genre||'Otros'}));
  if(products?.length){cat.snacks=products.filter(p=>p.product_type==='snack').map(p=>({id:p.id,titulo:p.title,desc:p.description,precio:Number(p.price),categoria:p.category,portada:p.image_url}));cat.bebidas=products.filter(p=>p.product_type==='drink').map(p=>({id:p.id,titulo:p.title,desc:p.description,precio:Number(p.price),categoria:p.category,portada:p.image_url}));}
  cat.porId=new Map([...cat.canciones,...cat.snacks,...cat.bebidas].map(x=>[x.id,x]));
 }catch(e){console.warn('[catalog cloud]',e);}
}
