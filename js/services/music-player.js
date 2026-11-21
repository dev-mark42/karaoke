import { getCatalogo } from '../core/almacen.js';
let audio, active=null, raf=0;
const $=s=>document.querySelector(s);
function fmt(n){if(!Number.isFinite(n))return '0:00';return `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;}
function highlight(){
 if(!audio||!active)return;
 const lines=active.letra_timing||[];
 const current=lines.reduce((best,line,i)=>line.time<=audio.currentTime?i:best,-1);
 document.querySelectorAll('#pistaLetra [data-time-index]').forEach((el,i)=>{el.classList.toggle('lyric-active',i===current);if(i===current)el.scrollIntoView({block:'nearest',behavior:'smooth'});});
 const progress=$('#karaokeProgress');if(progress&&audio.duration)progress.value=audio.currentTime/audio.duration*100;
 const time=$('#karaokeTime');if(time)time.textContent=`${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
 raf=requestAnimationFrame(highlight);
}
function mount(){
 const modal=$('#modalPista');if(!modal||$('#karaokePlayer'))return;
 const block=document.createElement('div');block.id='karaokePlayer';block.className='karaoke-player';
 block.innerHTML=`<div class="kp-top"><span>♪ REPRODUCTOR DE PISTA</span><span id="karaokeTime">0:00 / 0:00</span></div><audio id="karaokeAudio" controls preload="none"></audio><input id="karaokeProgress" type="range" min="0" max="100" value="0" aria-label="Progreso de canción"><small id="karaokeHint">Si el catálogo no incluye audio autorizado, añade audio_url al registro de la canción.</small>`;
 const lyric=modal.querySelector('#pistaLetra')?.parentElement;
 if(lyric)lyric.before(block);else modal.querySelector('.modal-body')?.prepend(block);
 audio=$('#karaokeAudio');
 audio.addEventListener('play',()=>{cancelAnimationFrame(raf);highlight();});
 audio.addEventListener('pause',()=>cancelAnimationFrame(raf));
 audio.addEventListener('ended',()=>cancelAnimationFrame(raf));
 $('#karaokeProgress').addEventListener('input',e=>{if(audio.duration)audio.currentTime=audio.duration*Number(e.target.value)/100;});
}
function loadCurrent(){
 mount();
 const title=$('#pistaTitulo')?.textContent?.trim(), artist=$('#pistaArtista')?.textContent?.trim();
 const songs=getCatalogo()?.canciones||[];
 active=songs.find(c=>c.titulo===title&&c.artista===artist);
 if(!active)return;
 const hint=$('#karaokeHint');
 if(active.audio_url){audio.src=active.audio_url;hint.textContent='Audio del catálogo · usa los controles para reproducir.';}
 else {audio.removeAttribute('src');audio.load();hint.textContent='Vista de letra disponible. Para escuchar la pista, configura audio_url con un archivo que tengas derecho a reproducir.';}
 const timed=active.letra_timing||active.lyrics_timing;
 if(Array.isArray(timed)&&timed.length){
  const box=$('#pistaLetra');box.replaceChildren();
  timed.forEach((line,i)=>{const p=document.createElement('p');p.dataset.timeIndex=i;p.textContent=line.text;box.append(p);});
 }
}
export function initMusicPlayer(){
 const modal=$('#modalPista');if(!modal)return;
 modal.addEventListener('shown.bs.modal',loadCurrent);
 const observer=new MutationObserver(()=>{if(!modal.classList.contains('show'))return;const title=$('#pistaTitulo')?.textContent;if(title&&title!==active?.titulo)loadCurrent();});
 observer.observe(modal,{subtree:true,childList:true,characterData:true});
}
