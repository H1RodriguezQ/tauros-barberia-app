/* =====================================================================
   Tauros Barbería · ui.js
   Utilidades compartidas: fechas y horas, formato de dinero, escape de
   HTML, ilustraciones SVG (retratos, íconos, silla), confeti y avisos.
   ===================================================================== */

/* ===== Utilidades ===== */
var DIAS=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
var DC=['dom','lun','mar','mié','jue','vie','sáb'];
var MES=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function iso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function add(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
function m2(h){var p=h.split(':');return +p[0]*60+ +p[1];}
function h2(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
function h12(h){var m=m2(h),H=Math.floor(m/60);return ((H+11)%12+1)+':'+String(m%60).padStart(2,'0')+(H<12?' am':' pm');}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
function fl(s){var d=new Date(s+'T12:00');return cap(DIAS[d.getDay()])+' '+d.getDate()+' de '+MES[d.getMonth()];}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function cop(n){return '$'+n.toLocaleString('es-CO');}
function pad2(n){return String(n).padStart(2,'0');}
/* Mensaje corto en la parte de abajo de la pantalla */
function toast(t){var e=document.createElement('div');e.className='toast';e.setAttribute('role','status');e.textContent=t;document.body.appendChild(e);setTimeout(function(){e.remove();},2600);}
/* Fecha de hoy (hora local del navegador) */
var HOY=new Date();HOY.setHours(0,0,0,0);var HOYS=iso(HOY);

/* ===== Ilustraciones (SVG hechas a mano, sin fotos) ===== */
var ICON={
  tijera:'<svg viewBox="0 0 40 40" fill="none" stroke="#1a1a2e" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="29" r="5"/><circle cx="29" cy="29" r="5"/><path d="M14.5 25.5 31 6M25.5 25.5 9 6"/><circle cx="20" cy="17.5" r="1.4" fill="#c8962a" stroke="none"/></svg>',
  navaja:'<svg viewBox="0 0 40 40" fill="none" stroke="#1a1a2e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 30 22 14l4 4-16 16z" fill="#f1e3c4"/><path d="M22 14c3-6 8-8 12-8-1 5-3 9-8 12"/><circle cx="24" cy="16" r="1.3" fill="#1a1a2e"/></svg>',
  barba:'<svg viewBox="0 0 40 40" fill="none" stroke="#1a1a2e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12c0 14 5 22 12 22s12-8 12-22c-3 4-7 5-12 5S11 16 8 12z" fill="#f1e3c4"/><path d="M14 22c2 1.5 4 2 6 2s4-.5 6-2"/></svg>',
  peine:'<svg viewBox="0 0 40 40" fill="none" stroke="#1a1a2e" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="12" width="30" height="7" rx="2" fill="#f1e3c4"/><path d="M8 19v10M12 19v10M16 19v10M20 19v10M24 19v10M28 19v10M32 19v10"/></svg>',
  brocha:'<svg viewBox="0 0 40 40" fill="none" stroke="#1a1a2e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 6c-2 6 0 12 7 12s9-6 7-12c-4 2-10 2-14 0z" fill="#f1e3c4"/><path d="M15 18h10l-1 6h-8z"/><path d="M16 24h8v10h-8z" fill="#c8962a"/></svg>'
};
var SKIN=['#c68a5e','#8a5636','#e3b68c','#a46a43'];
function portrait(b,small){
  if(b.foto_url)return '<img src="'+esc(b.foto_url)+'" alt="Foto de '+esc(b.nombre)+'" loading="lazy">';
  var p=b.look||{skin:0,hair:'fade',beard:false,bg:'#f1e3c4'},s=SKIN[p.skin],ink='#1a1a2e',hair='',beard='';
  if(p.hair==='fade')hair='<path d="M38 52c0-16 10-25 22-25s22 9 22 25c-3-5-8-8-22-8s-19 3-22 8z" fill="'+ink+'"/><path d="M38 52c0 4 1 7 2 9M82 52c0 4-1 7-2 9" stroke="'+ink+'" stroke-width="2" opacity=".35"/>';
  if(p.hair==='rizo')hair='<g fill="'+ink+'">'+[[42,44],[50,36],[60,33],[70,36],[78,44],[46,52],[74,52],[56,40],[66,40]].map(function(c){return '<circle cx="'+c[0]+'" cy="'+c[1]+'" r="8"/>';}).join('')+'</g>';
  if(p.hair==='peinado')hair='<path d="M37 56c-2-20 9-30 25-30 12 0 21 7 21 17-6-6-16-6-26-3-9 3-14 9-20 16z" fill="'+ink+'"/>';
  if(p.hair==='rapado')hair='<path d="M39 50c2-13 11-21 21-21s19 8 21 21c-6-4-13-6-21-6s-15 2-21 6z" fill="'+ink+'" opacity=".55"/>';
  if(p.hair==='buzz')hair='<path d="M39 52c1-14 10-21 21-21s20 7 21 21c-5-5-12-7-21-7s-16 2-21 7z" fill="'+ink+'" opacity=".82"/>';
  if(p.hair==='pompa')hair='<path d="M38 56c-3-12 0-22 8-28 6-5 14-8 22-6 10 2 16 10 14 20-2 6-4 10-4 14-4-6-10-9-18-9-10 0-17 3-22 9z" fill="'+ink+'"/><path d="M38 56c0 3 1 6 2 8M82 56c0 3-1 6-2 8" stroke="'+ink+'" stroke-width="2" opacity=".35"/>';
  if(p.hair==='mohicano')hair='<path d="M39 52c2-12 10-19 21-19s19 7 21 19c-5-4-12-6-21-6s-16 2-21 6z" fill="'+ink+'" opacity=".3"/><path d="M53 46c0-16 3-26 7-30 4 4 7 14 7 30z" fill="'+ink+'"/>';
  if(p.hair==='clasico')hair='<path d="M37 56c-2-19 8-29 24-29 13 0 22 8 21 20-2-5-6-8-11-9-2 4-6 6-12 7-9 1-16 5-22 11z" fill="'+ink+'"/><path d="M64 29c2 5 4 10 7 13" stroke="#fffdf9" stroke-width="1.6" opacity=".7" fill="none"/>';
  if(p.hair==='diseno')hair='<path d="M38 52c0-16 10-25 22-25s22 9 22 25c-3-5-8-8-22-8s-19 3-22 8z" fill="'+ink+'"/><path d="M43 44l10-6M46 49l10-6M74 38l5 7" stroke="#fffdf9" stroke-width="1.8" stroke-linecap="round"/>';
  if(p.hair==='rizofade')hair='<path d="M39 56c0-6 1-11 3-14M81 56c0-6-1-11-3-14" stroke="'+ink+'" stroke-width="3" opacity=".4"/><g fill="'+ink+'">'+[[46,41],[53,34],[61,31],[69,34],[75,41],[57,39],[65,39],[50,45],[71,45]].map(function(c){return '<circle cx="'+c[0]+'" cy="'+c[1]+'" r="6.5"/>';}).join('')+'</g>';
  if(p.beard)beard='<path d="M40 64c1 16 9 26 20 26s19-10 20-26c-3 5-6 7-9 7-3-3-7-4-11-4s-8 1-11 4c-3 0-6-2-9-7z" fill="'+ink+'"/>';
  if(p.mustache)beard+='<path d="M50 74c4-3 7-3 10-1 3-2 6-2 10 1-3 2-7 2-10 1-3 1-7 1-10-1z" fill="'+ink+'"/>';
  return '<svg viewBox="0 0 120 120" role="img" aria-label="Ilustración de '+esc(b.nombre)+'"><rect width="120" height="120" fill="'+p.bg+'"/>'+
    (small?'':'<circle cx="96" cy="22" r="10" fill="none" stroke="'+ink+'" stroke-width="1.5" opacity=".15"/><path d="M8 100 22 86" stroke="'+ink+'" stroke-width="1.5" opacity=".15"/>')+
    '<path d="M18 120c3-22 20-32 42-32s39 10 42 32z" fill="'+ink+'"/><path d="M48 88h24l-12 16z" fill="#fffdf9"/><path d="M52 90l8 10 8-10" fill="none" stroke="#c8962a" stroke-width="2"/>'+
    '<rect x="52" y="74" width="16" height="16" rx="6" fill="'+s+'"/><ellipse cx="38.5" cy="60" rx="4" ry="6" fill="'+s+'"/><ellipse cx="81.5" cy="60" rx="4" ry="6" fill="'+s+'"/>'+
    '<ellipse cx="60" cy="58" rx="21" ry="25" fill="'+s+'"/>'+beard+hair+'</svg>';
}
var logoSvg='<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#1a1a2e"/><path d="M9 14c4 0 7 2 8.5 6 1.5-4.5 4-7 6.5-7s5 2.5 6.5 7c1.5-4 4.5-6 8.5-6-1 6-4.5 9-8.5 10v4c0 6-3.5 9.5-6.5 11-3-1.5-6.5-5-6.5-11v-4C13.5 23 10 20 9 14z" fill="#c8962a"/></svg>';

/* Escena del hero: silla de barbería bajo la lámpara */
var chairSvg='<svg class="chair" viewBox="0 0 400 450" role="img" aria-label="Silla de barbería clásica bajo una lámpara">'+
 '<defs><clipPath id="arch"><path d="M50 440V180a150 150 0 0 1 300 0v260z"/></clipPath>'+
 '<pattern id="tiles" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="#efe9dd"/><rect width="14" height="14" fill="#2b2b44"/><rect x="14" y="14" width="14" height="14" fill="#2b2b44"/></pattern>'+
 '<linearGradient id="chrome" x1="0" x2="1"><stop offset="0" stop-color="#8a6a1c"/><stop offset=".45" stop-color="#efcd6e"/><stop offset="1" stop-color="#8a6a1c"/></linearGradient>'+
 '<linearGradient id="leather" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bf4632"/><stop offset="1" stop-color="#7a281e"/></linearGradient>'+
 '<linearGradient id="cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a" stop-opacity=".5"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></linearGradient></defs>'+
 '<path d="M50 440V180a150 150 0 0 1 300 0v260z" fill="#24243b"/>'+
 '<g clip-path="url(#arch)"><rect x="40" y="392" width="320" height="60" fill="url(#tiles)"/><path d="M186 80 L80 420 H320 L214 80z" fill="url(#cone)"/></g>'+
 '<path d="M50 440V180a150 150 0 0 1 300 0v260" fill="none" stroke="url(#chrome)" stroke-width="8"/>'+
 '<g class="lamp"><path d="M200 0v54" stroke="#c8962a" stroke-width="2"/><path d="M170 78c0-15 13-24 30-24s30 9 30 24z" fill="#c8962a"/><ellipse cx="200" cy="80" rx="13" ry="5" fill="#fff4cf"/></g>'+
 '<g class="chairg">'+
  '<ellipse cx="200" cy="414" rx="100" ry="14" fill="#000" opacity=".35"/>'+
  '<ellipse cx="200" cy="404" rx="86" ry="14" fill="url(#chrome)"/>'+
  '<path d="M184 320h32l10 82h-52z" fill="url(#chrome)"/>'+
  '<path d="M196 330v26M204 330v26" stroke="#8a6a1c" stroke-width="3"/><rect x="148" y="354" width="104" height="9" rx="4.5" fill="url(#chrome)"/>'+
  '<rect x="118" y="304" width="164" height="16" rx="6" fill="#121222"/>'+
  '<rect x="110" y="268" width="180" height="40" rx="14" fill="url(#leather)"/>'+
  '<path d="M124 281h152" stroke="#f1d9b5" stroke-width="1.5" stroke-dasharray="4 4" opacity=".6"/>'+
  '<path d="M138 160h124a16 16 0 0 1 16 16v96H122v-96a16 16 0 0 1 16-16z" fill="url(#leather)"/>'+
  '<rect x="132" y="170" width="136" height="92" rx="10" fill="none" stroke="#f1d9b5" stroke-width="1.5" stroke-dasharray="4 4" opacity=".5"/>'+
  '<g fill="#5a1c15"><circle cx="165" cy="196" r="3.2"/><circle cx="200" cy="196" r="3.2"/><circle cx="235" cy="196" r="3.2"/><circle cx="182" cy="232" r="3.2"/><circle cx="218" cy="232" r="3.2"/></g>'+
  '<rect x="194" y="136" width="12" height="26" fill="url(#chrome)"/><rect x="164" y="110" width="72" height="30" rx="13" fill="url(#leather)"/>'+
  '<rect x="90" y="242" width="56" height="16" rx="8" fill="#121222"/><rect x="104" y="258" width="10" height="14" fill="url(#chrome)"/>'+
  '<rect x="254" y="242" width="56" height="16" rx="8" fill="#121222"/><rect x="286" y="258" width="10" height="14" fill="url(#chrome)"/>'+
  '<path d="M284 306l26 24" stroke="url(#chrome)" stroke-width="5" stroke-linecap="round"/><circle cx="312" cy="332" r="6.5" fill="#c8962a"/>'+
 '</g>'+
 '<g transform="translate(318 132)"><g class="float"><g fill="none" stroke="#e3b552" stroke-width="3" stroke-linecap="round"><circle cx="8" cy="34" r="7"/><circle cx="30" cy="34" r="7"/><path d="M13 29 34 2M25 29 4 2"/></g></g></g>'+
 '<g transform="translate(22 250)"><g class="float b"><rect x="0" y="0" width="40" height="9" rx="3" fill="#e3b552"/><path d="M4 9v12M10 9v12M16 9v12M22 9v12M28 9v12M34 9v12" stroke="#e3b552" stroke-width="2.4" stroke-linecap="round"/></g></g>'+
 '<path class="twinkle" d="M352 60l3 9 9 3-9 3-3 9-3-9-9-3 9-3z" fill="#e3b552"/>'+
 '<path class="twinkle b" d="M40 150l2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5z" fill="#e3b552"/>'+
'</svg>';

/* Confeti al confirmar (se omite si el usuario prefiere menos movimiento) */
function confetti(host){
  if(!host||menosMovimiento())return;
  var c=document.createElement('canvas');c.className='confetti';host.appendChild(c);
  var r=host.getBoundingClientRect(),dpr=window.devicePixelRatio||1;c.width=r.width*dpr;c.height=r.height*dpr;
  var x=c.getContext('2d');x.scale(dpr,dpr);var cols=['#c8962a','#b5372b','#1a1a2e','#e3b552','#1d6b45'],P=[];
  for(var i=0;i<150;i++)P.push({x:r.width/2,y:r.height*0.32,vx:(Math.random()-.5)*13,vy:-Math.random()*12-4,s:5+Math.random()*6,c:cols[i%5],a:Math.random()*6,va:(Math.random()-.5)*.35});
  var t0=performance.now();
  (function f(t){var e=t-t0;x.clearRect(0,0,r.width,r.height);
    P.forEach(function(p){p.vy+=.34;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.a+=p.va;x.save();x.translate(p.x,p.y);x.rotate(p.a);x.globalAlpha=Math.max(0,1-e/2300);x.fillStyle=p.c;x.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);x.restore();});
    if(e<2300)requestAnimationFrame(f);else c.remove();})(t0);
}

/* =====================================================================
   Accesibilidad del movimiento (WCAG 2.2: 2.2.2 y 2.3.3)
   - Respeta la preferencia del sistema "reducir movimiento".
   - Botón para pausar todas las animaciones (se recuerda en este navegador).
   ===================================================================== */
var MOV_KEY = 'tauros-sin-movimiento';
function prefiereSinMovimiento() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
function movimientoPausado() { return document.documentElement.classList.contains('sin-mov'); }
function menosMovimiento() { return prefiereSinMovimiento() || movimientoPausado(); }
function aplicarMovimiento(pausar) {
  document.documentElement.classList.toggle('sin-mov', pausar);
  try { localStorage.setItem(MOV_KEY, pausar ? '1' : '0'); } catch (e) { }
  document.querySelectorAll('[data-mov]').forEach(function (b) {
    b.setAttribute('aria-pressed', String(pausar));
    b.textContent = pausar ? 'Reanudar animaciones' : 'Pausar animaciones';
  });
}
(function () { var v = null; try { v = localStorage.getItem(MOV_KEY); } catch (e) { } if (v === '1') document.documentElement.classList.add('sin-mov'); })();
function botonMovimiento(extraClase) {
  var p = movimientoPausado();
  return '<button type="button" class="mov-btn ' + (extraClase || '') + '" data-mov aria-pressed="' + p + '">' + (p ? 'Reanudar animaciones' : 'Pausar animaciones') + '</button>';
}
function enlazarMovimiento() { document.querySelectorAll('[data-mov]').forEach(function (b) { b.onclick = function () { aplicarMovimiento(!movimientoPausado()); }; }); }
function desplazar(el) { if (el) el.scrollIntoView({ behavior: menosMovimiento() ? 'auto' : 'smooth' }); }

/* Mantiene el foco del teclado dentro de un diálogo abierto (WCAG 2.1.2 / 2.4.3) */
function atraparFoco(cont, e) {
  if (e.key !== 'Tab' || !cont) return;
  var f = Array.prototype.filter.call(cont.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'), function (x) { return x.offsetParent !== null; });
  if (!f.length) return;
  var first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
