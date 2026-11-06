/* =====================================================================
   Tauros Barbería · cliente.js
   Página pública: presentación, servicios, estilos, barberos, opiniones
   y el flujo de reserva (barbero → servicio → día y hora → datos → recibo).
   ===================================================================== */

var CATS = [
  { id: 'cortes', t: 'Cortes', ic: 'tijera' },
  { id: 'barba', t: 'Barba', ic: 'navaja' },
  { id: 'extras', t: 'Extras', ic: 'brocha' }
];
var SCAT = 'cortes';

/* ---------- Contenido de marketing (estático) ---------- */
/* Galería de estilos: se enlaza a un servicio y a un barbero por nombre */
var CORTES = [
  { n: 'Fade bajo', cat: 'fade', d: 'Degradado limpio desde la nuca, arriba con largo.', sv: 'Fade / degradado', ap: 'El Profe', lv: 'El clásico de hoy', look: { skin: 0, hair: 'fade', bg: '#f1e3c4' } },
  { n: 'Pompadour', cat: 'clasico', d: 'Volumen arriba, lados cortos. Con cera y peinado.', sv: 'Corte clásico', ap: 'El Profe', lv: 'Elegante', look: { skin: 2, hair: 'pompa', bg: '#e3e6f0' } },
  { n: 'Rizos con fade', cat: 'fade', d: 'Se respeta el rizo arriba y se degrada a los lados.', sv: 'Fade / degradado', ap: 'Juli', lv: 'Tendencia', look: { skin: 1, hair: 'rizofade', bg: '#ece1ef' } },
  { n: 'Diseño con líneas', cat: 'diseno', d: 'Rayas o figuras a navaja sobre el degradado.', sv: 'Diseño o línea', ap: 'Juli', lv: 'Para lucirse', look: { skin: 3, hair: 'diseno', bg: '#f6dcd3' } },
  { n: 'Clásico de lado', cat: 'clasico', d: 'Raya marcada y tijera. Nunca pasa de moda.', sv: 'Corte clásico', ap: 'El Profe', lv: 'Para la oficina', look: { skin: 2, hair: 'clasico', bg: '#efe6d6' } },
  { n: 'Barba completa', cat: 'barba', d: 'Forma, rebaje y perfilado con toalla caliente.', sv: 'Afeitado con toalla caliente', ap: 'Barbas', lv: 'Ritual', look: { skin: 0, hair: 'rapado', beard: true, bg: '#e6e0d0' } },
  { n: 'Buzz cut', cat: 'clasico', d: 'Todo parejo a máquina. Práctico y fresco.', sv: 'Corte clásico', ap: 'Barbas', lv: 'Cero mantenimiento', look: { skin: 1, hair: 'buzz', mustache: true, bg: '#dfe8e1' } },
  { n: 'Mohicano', cat: 'diseno', d: 'Franja arriba y lados bien bajos. Atrevido.', sv: 'Fade / degradado', ap: 'Juli', lv: 'Atrevido', look: { skin: 2, hair: 'mohicano', bg: '#dde7ee' } }
];
var GCAT = 'todos';
var GCATS = [['todos', 'Todos'], ['fade', 'Fade'], ['clasico', 'Clásicos'], ['diseno', 'Con diseño'], ['barba', 'Barba']];

/* Opiniones de ejemplo (reemplazar por opiniones reales) */
var RESENAS = [
  { n: 'Juan Camilo R.', ap: 'El Profe', t: 'Llevo dos años con Carlos y nunca me ha fallado el fade. Ahora reservo desde el celular y no espero nada.', d: 'hace 2 días' },
  { n: 'Sebastián M.', ap: 'Barbas', t: 'El afeitado con toalla caliente es otra cosa. Salí como nuevo, y Andrés es un parcero.', d: 'hace 1 semana' },
  { n: 'Laura P.', ap: 'Teo', t: 'Llevé a mi hijo de 6 años y Teo tuvo una paciencia increíble. Volvemos seguro.', d: 'hace 3 semanas' },
  { n: 'Kevin A.', ap: 'Juli', t: 'Le mostré una foto de un diseño y Juli lo dejó igualito, hasta mejor.', d: 'hace 5 días' },
  { n: 'Andrés F.', ap: 'El Profe', t: 'Puntuales con la hora. Llegué, me senté y en media hora estaba listo.', d: 'hace 1 mes' },
  { n: 'Daniel S.', ap: 'Barbas', t: 'La barba me quedó con la forma que quería. Buen ambiente y buena música.', d: 'hace 2 semanas' }
];

var WHY_IC = {
  rapido: '<svg viewBox="0 0 36 36" fill="none" stroke="#c8962a" stroke-width="2.2" stroke-linecap="round"><circle cx="18" cy="19" r="13"/><path d="M18 11v8l5 3M14 3h8"/></svg>',
  precio: '<svg viewBox="0 0 36 36" fill="none" stroke="#c8962a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18 18 4h12v12L16 30z"/><circle cx="24" cy="11" r="2.2"/></svg>',
  puntual: '<svg viewBox="0 0 36 36" fill="none" stroke="#c8962a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="14"/><path d="m11 18 5 5 9-10"/></svg>',
  cancela: '<svg viewBox="0 0 36 36" fill="none" stroke="#c8962a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="8" width="26" height="23" rx="4"/><path d="M5 15h26M12 4v7M24 4v7M14 21l8 6M22 21l-8 6"/></svg>'
};

/* ---------- Ayudas ---------- */
function activos() { return DB.barberos.filter(function (b) { return b.activo && b.silla_id; }); }
function svPorNombre(n) { return DB.servicios.find(function (s) { return s.nombre === n && s.activo; }) || DB.servicios.find(function (s) { return s.activo; }); }
function barberoPorApodo(ap) { return DB.barberos.find(function (b) { return b.apodo === ap; }) || activos()[0]; }
function primerNombre(b) { return b ? b.nombre.split(' ')[0] : ''; }

/* Turnos libres de hoy y el próximo disponible (para la portada) */
function hoyResumen() {
  var tot = 0, nx = null;
  activos().forEach(function (b) {
    var sl = slots(b.id, HOYS).filter(function (s) { return s.libre; });
    tot += sl.length;
    if (sl[0] && (!nx || m2(sl[0].h) < m2(nx.h))) nx = { h: sl[0].h, b: b };
  });
  return { tot: tot, nx: nx };
}
async function cargarOcupacionHoy() {
  await Promise.all(activos().map(function (b) { return cargarOcupadas(b.id, HOYS, true); }));
}

/* ---------- Secciones ---------- */
function svcCards() {
  return DB.servicios.filter(function (s) { return s.cat === SCAT && s.activo; }).map(function (s) {
    var c = CATS.find(function (x) { return x.id === s.cat; });
    return '<article class="svc">' + ICON[c.ic] + (s.tag ? '<span class="tg">' + esc(s.tag) + '</span>' : '') + '<h3>' + esc(s.nombre) + '</h3><p>' + esc(s.desc) + '</p>' +
      '<div class="pp"><b>' + cop(s.precio) + '</b><small>' + s.dur + ' min</small></div><button class="more" data-bsv="' + s.id + '">Reservar este servicio ›</button></article>';
  }).join('');
}
function bindSvc() { document.querySelectorAll('[data-bsv]').forEach(function (x) { x.onclick = function () { abrirReserva(null, +x.dataset.bsv); }; }); }

function drawGallery() {
  var el = document.getElementById('gal'); if (!el) return;
  el.innerHTML = CORTES.map(function (c, i) { return { c: c, i: i }; }).filter(function (x) { return GCAT === 'todos' || x.c.cat === GCAT; }).map(function (x, k) {
    var c = x.c, s = svPorNombre(c.sv), b = barberoPorApodo(c.ap), ok = b && b.activo && s;
    if (!s || !b) return '';
    return '<article class="cut cut-in" style="animation-delay:' + (k * 0.06) + 's"><div class="pic">' + portrait({ nombre: c.n, look: c.look }) + '<span class="lv">' + c.lv + '</span></div>' +
      '<div class="body"><h3>' + c.n + '</h3><p>' + c.d + '</p><span class="by">Lo hace mejor ' + esc(primerNombre(b)) + '</span>' +
      '<div class="row"><b>desde ' + cop(s.precio) + '</b><button class="btn btn-ink btn-sm" data-cut="' + x.i + '" ' + (ok ? '' : 'disabled') + '>' + (ok ? 'Lo quiero' : 'No disponible') + '</button></div></div></article>';
  }).join('');
  el.querySelectorAll('[data-cut]').forEach(function (x) { x.onclick = function () { var c = CORTES[+x.dataset.cut]; abrirReserva(barberoPorApodo(c.ap).id, svPorNombre(c.sv).id); }; });
  document.querySelectorAll('.fchip').forEach(function (f) { f.setAttribute('aria-pressed', String(f.dataset.g === GCAT)); });
}

/* Pantallas del teléfono en "Así de fácil" */
function screens() {
  var a = activos().slice(0, 3), s1 = svPorNombre('Fade / degradado'), lista = DB.servicios.filter(function (s) { return s.activo; }).slice(0, 3);
  return [
    '<div class="scr"><h5>¿Con quién?</h5>' + a.map(function (b, i) { return '<div class="mrow' + (i === 0 ? ' sel' : '') + '">' + portrait(b, true) + '<div><b>' + esc(primerNombre(b)) + '</b><small>' + esc(b.especialidad) + '</small></div></div>'; }).join('') + '<div class="mbtn">Continuar</div></div>',
    '<div class="scr"><h5>¿Qué te haces?</h5>' + lista.map(function (s, i) { return '<div class="mrow' + (i === 0 ? ' sel' : '') + '"><div><b>' + esc(s.nombre) + '</b><small>' + s.dur + ' min</small></div><span class="pr">' + cop(s.precio) + '</span></div>'; }).join('') + '<div class="mbtn">Total ' + cop(lista[0] ? lista[0].precio : 0) + '</div></div>',
    '<div class="scr"><h5>¿Cuándo?</h5><div class="mdays">' + [0, 1, 2, 3].map(function (i) { var d = add(HOY, i); return '<span' + (i === 0 ? ' class="sel"' : '') + '>' + (i === 0 ? 'hoy' : DC[d.getDay()]) + '<b>' + d.getDate() + '</b></span>'; }).join('') + '</div>' +
      '<div class="mslots"><span class="x">2:00</span><span>2:30</span><span class="sel">3:00</span><span>3:30</span><span class="x">4:00</span><span>4:30</span></div><div class="mbtn">Continuar · 3:00 pm</div></div>',
    '<div class="scr"><div class="mok"><i>✓</i><b>¡Listo, te esperamos!</b><small>' + esc(s1 ? s1.nombre : 'Corte') + ' con ' + esc(primerNombre(a[0])) + ' · hoy 3:00 pm</small><small>Pagas en la barbería</small></div></div>'
  ];
}

/* ---------- Página completa ---------- */
function renderC() {
  var now = new Date(), mn = now.getHours() * 60 + now.getMinutes(), dow = now.getDay();
  var cierra = dow === 0 ? null : (dow === 6 ? '14:00' : '19:00'), abre = dow === 6 ? '08:00' : '09:00', abierto = cierra && mn >= m2(abre) && mn < m2(cierra);
  var nf = hoyResumen(), N = NEGOCIO;
  var liveTxt = nf.nx ? '<b>' + nf.tot + ' turnos libres hoy</b> · el próximo a las ' + h12(nf.nx.h) + ' con ' + esc(primerNombre(nf.nx.b)) : '<b>Hoy ya no quedan turnos</b> · reserva para mañana';
  var scr = screens();
  var steps = [['Elige a tu barbero.', 'Cada uno tiene su silla y su estilo. Mira quién está hoy y escoge con quién te sientas.'],
    ['Escoge el servicio.', 'Con el precio y el tiempo a la vista desde el principio. Sin sorpresas al pagar.'],
    ['Aparta tu hora.', 'Ves en tiempo real qué horas quedan libres. Nadie más puede tomar la tuya.'],
    ['Llega y siéntate.', 'Recibes tu comprobante al instante. Solo llega cinco minutos antes.']];
  var team = DB.sillas.map(function (si) {
    var b = DB.barberos.find(function (x) { return x.silla_id === si.id; }); if (!b) return '';
    var h = hor(b.id, HOYS), trab = b.activo && h && h.activo, lib = trab ? slots(b.id, HOYS).filter(function (x) { return x.libre; }).length : 0;
    return '<article class="bcard reveal' + (b.activo ? '' : ' off') + '"><div class="pic">' + portrait(b) + '<span class="chairtag">Silla ' + pad2(si.n) + '</span>' + (b.activo ? '' : '<span class="stamp">De descanso</span>') + '</div>' +
      '<div class="bd"><h3>' + esc(b.nombre) + '</h3><div class="role">' + esc(b.especialidad) + (b.anios ? ' · ' + b.anios + ' años' : '') + '</div>' + (b.quote ? '<p class="quote">“' + esc(b.quote) + '”</p>' : '') +
      '<div class="facts">' + b.pide.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' +
      '<div class="foot"><small>' + (!b.activo ? 'Vuelve pronto' : trab ? lib + ' turnos libres hoy' : 'Hoy no atiende') + '</small><button class="btn btn-ink btn-sm" data-b="' + b.id + '" ' + (b.activo ? '' : 'disabled') + '>Reservar</button></div></div></article>';
  }).join('');
  var quotes = RESENAS.map(function (r) {
    var ini = r.n.split(' ').map(function (p) { return p[0]; }).join('').slice(0, 2), b = barberoPorApodo(r.ap);
    return '<figure class="qt reveal" style="margin:0"><span class="stars" aria-label="5 estrellas">★★★★★</span><p>“' + esc(r.t) + '”</p><figcaption class="by"><span class="av">' + ini + '</span><div><b>' + esc(r.n) + '</b>Lo atendió ' + esc(primerNombre(b)) + ' · ' + r.d + '</div></figcaption></figure>';
  }).join('');
  var faqs = [['¿Tengo que pagar para reservar?', 'No. Reservas gratis y pagas en la barbería cuando te atiendan: ' + N.pagos.toLowerCase() + '.'],
    ['¿Y si no puedo llegar?', 'Llámanos o escríbenos al ' + N.telefono + ' y liberamos el turno sin costo. Así otro cliente lo puede aprovechar.'],
    ['¿Qué pasa si llego tarde?', 'Te esperamos hasta ' + N.minutosTolerancia + ' minutos. Después, tu barbero puede atender al siguiente y te buscamos otro turno el mismo día si hay.'],
    ['¿Atienden niños?', 'Sí. El corte para niño es hasta los 12 años.'],
    ['¿Necesito crear una cuenta?', 'No. Solo tu nombre y, si quieres, tu celular para avisarte si hay que mover la cita.']];
  var hrs = [[1, 'Lunes a viernes', '9:00 am – 7:00 pm'], [6, 'Sábado', '8:00 am – 2:00 pm'], [0, 'Domingo', 'Cerrado']].map(function (r) {
    var on = (r[0] === 1 && dow >= 1 && dow <= 5) || r[0] === dow; return '<tr class="' + (on ? 'now' : '') + '"><td>' + r[1] + (on ? ' · hoy' : '') + '</td><td>' + r[2] + '</td></tr>';
  }).join('');
  var prueba = N.calificacion ? '<section class="proofbar gut" aria-label="Datos de la barbería"><div class="in">' +
    '<div><b>' + N.calificacion + ' <span class="st">★</span></b><span>' + N.numOpiniones + ' opiniones en Google</span></div><div><b>' + N.cortesAlAnio + '</b><span>cortes al año</span></div><div><b>' + N.aniosEnElBarrio + ' años</b><span>en el centro</span></div><div><b>1 min</b><span>para reservar</span></div></div></section>' : '';

  document.getElementById('app').innerHTML =
    '<header class="nav gut"><div class="in"><a class="mark" href="#">' + logoSvg + '<b>Tauros</b><span>Barbería</span></a>' +
    '<nav class="links" aria-label="Secciones"><a href="#servicios">Servicios</a><a href="#estilos">Estilos</a><a href="#equipo">Barberos</a><a href="#opiniones">Opiniones</a><a href="#visita">Visítanos</a><a href="/admin" title="Panel de administración">Admin</a></nav>' +
    '<button class="pill" data-book>Reservar</button></div></header>' +

    '<main><section class="hero gut"><div class="in">' +
    '<p class="eyebrow">' + esc(N.nombre) + ' · ' + esc(N.ciudad) + '</p>' +
    '<h1>Tu mejor corte. <span class="grad">Sin hacer fila.</span></h1>' +
    '<p class="sub">Escoge barbero, servicio y hora en menos de un minuto. Llegas, te sientas y listo.</p>' +
    '<div class="ctas"><button class="btn primary" data-book>Reservar turno</button><a class="more" href="#servicios">Ver servicios y precios ›</a></div>' +
    '<div class="live" role="status"><span class="dot' + (nf.nx ? '' : ' off') + '"></span><span>' + liveTxt + '</span></div>' +
    '<div class="hero-art" id="hart">' + chairSvg + '</div></div></section>' + prueba +

    '<section class="sec gut"><div class="in center"><h2 class="h-big reveal">Hecho para que vuelvas.</h2><p class="h-sub reveal">Lo que más nos piden los clientes es no perder tiempo. Así que lo quitamos del camino.</p><div class="why">' +
    '<div class="reveal">' + WHY_IC.rapido + '<b>Reserva en un minuto</b><p>Sin llamadas ni mensajes. Ves las horas libres y apartas la tuya.</p></div>' +
    '<div class="reveal">' + WHY_IC.precio + '<b>Precio claro antes de sentarte</b><p>Sabes cuánto pagas desde que reservas. Nada de sorpresas.</p></div>' +
    '<div class="reveal">' + WHY_IC.puntual + '<b>Tu hora es tu hora</b><p>Nadie más puede tomar tu turno. Llegas y te atendemos.</p></div>' +
    '<div class="reveal">' + WHY_IC.cancela + '<b>Cancelas sin costo</b><p>¿Se te cruzó algo? Avísanos y liberamos el turno.</p></div></div></div></section>' +

    '<section class="sec alt story gut" id="como"><div class="in center" style="margin-bottom:40px;display:block"><h2 class="h-big reveal">Así de fácil.</h2><p class="h-sub reveal">Cuatro toques desde tu celular.</p></div>' +
    '<div class="in"><div class="phone-col" aria-hidden="true"><div class="phone"><div class="screen">' + scr.join('') + '</div></div></div>' +
    '<div class="steps-col">' + steps.map(function (s, i) { return '<div class="stp" data-s="' + i + '"><span class="n">Paso ' + (i + 1) + '</span><h3>' + s[0] + '</h3><p>' + s[1] + '</p><div class="mini" aria-hidden="true">' + scr[i] + '</div></div>'; }).join('') + '</div></div></section>' +

    '<section class="sec gut" id="servicios"><div class="in"><div class="head-row"><div><h2 class="h-big reveal">Servicios y precios.</h2><p class="h-sub reveal">Todo incluye lavado. El tiempo es aproximado.</p></div></div>' +
    '<div class="segc" role="group" aria-label="Categoría">' + CATS.map(function (c) { return '<button data-sc="' + c.id + '" aria-pressed="' + (c.id === SCAT) + '">' + c.t + '</button>'; }).join('') + '</div>' +
    '<div class="svcs" id="svcs">' + svcCards() + '</div><p class="note-line">Pagas en la barbería: ' + esc(N.pagos.toLowerCase()) + '.</p></div></section>' +

    '<section class="sec alt gut" id="estilos"><div class="in"><div class="head-row"><div><h2 class="h-big reveal">¿No sabes qué pedirte?</h2><p class="h-sub reveal">Inspírate. Toca el que te guste y reservas con quien mejor lo hace.</p></div>' +
    '<div class="arrows"><button id="gl" aria-label="Anterior">‹</button><button id="gr" aria-label="Siguiente">›</button></div></div>' +
    '<div class="fbar" role="group" aria-label="Filtrar estilos" style="margin:-20px 0 20px">' + GCATS.map(function (g) { return '<button class="fchip" data-g="' + g[0] + '" aria-pressed="' + (g[0] === GCAT) + '">' + g[1] + '</button>'; }).join('') + '</div>' +
    '<div class="gallery" id="gal"></div></div></section>' +

    '<section class="sec gut" id="equipo"><div class="in"><div class="head-row"><div><h2 class="h-big reveal">Conoce a los de la casa.</h2><p class="h-sub reveal">Cada uno con su silla, su estilo y sus clientes de siempre.</p></div></div><div class="team">' + team + '</div></div></section>' +

    '<section class="sec dark gut" id="opiniones"><div class="in center"><h2 class="h-big reveal">Lo dicen ellos, no nosotros.</h2>' +
    (N.calificacion ? '<div class="rating reveal"><span class="big">' + N.calificacion + '</span><div style="text-align:left"><span class="stars" aria-label="5 de 5 estrellas">★★★★★</span><small>' + N.numOpiniones + ' opiniones en Google Maps</small></div></div>' : '<div style="height:40px"></div>') +
    '<div class="quotes" style="text-align:left">' + quotes + '</div>' + (N.opinionesDeEjemplo ? '<p class="disclaim">Opiniones de ejemplo.</p>' : '') + '</div></section>' +

    '<section class="sec alt gut" id="preguntas"><div class="in center"><h2 class="h-big reveal">Preguntas frecuentes.</h2><div class="faq" style="text-align:left">' +
    faqs.map(function (f, i) { return '<details' + (i === 0 ? ' open' : '') + '><summary>' + f[0] + '</summary><p>' + esc(f[1]) + '</p></details>'; }).join('') + '</div></div></section>' +

    '<section class="sec gut" id="visita"><div class="in"><div class="head-row"><div><h2 class="h-big reveal">Visítanos.</h2><p class="h-sub reveal">' + esc(N.referencia) + '</p></div></div><div class="visit">' +
    '<div class="reveal"><h3>Dirección</h3><address>' + esc(N.direccion) + '<br>' + esc(N.ciudad) + ', Santander</address></div>' +
    '<div class="reveal"><h3>Horario</h3><table>' + hrs + '</table></div>' +
    '<div class="reveal"><h3>Contacto</h3><p>' + esc(N.telefono) + '<br>' + esc(N.instagram) + '<br><span style="color:var(--mute)">' + esc(N.pagos) + '</span></p></div></div></div></section>' +

    '<section class="final gut"><div class="in"><h2 class="h-big">Tu silla está lista.</h2><p class="h-sub" style="margin:0 auto">' + (nf.nx ? 'Quedan ' + nf.tot + ' turnos hoy. El próximo es a las ' + h12(nf.nx.h) + '.' : 'Hoy ya cerramos la agenda. Aparta tu turno para mañana.') + '</p>' +
    '<button class="btn btn-brass" data-book>Reservar turno</button></div></section></main>' +

    '<footer class="foot-site gut"><div class="in"><span>© ' + new Date().getFullYear() + ' ' + esc(N.nombre) + ' · ' + esc(N.ciudad) + '</span><span>Proyecto académico · Universidad de Santander · <a class="lnk" href="/admin" style="color:inherit">Acceso administrador</a></span></div></footer>' +

    '<div class="mbar" id="mbar"><div><b>' + (nf.nx ? 'Próximo: ' + h12(nf.nx.h) + ' con ' + esc(primerNombre(nf.nx.b)) : 'Reserva para mañana') + '</b>' + (abierto ? 'Abiertos ahora' : 'Cerrado ahora') + '</div><button class="btn btn-ink btn-sm" data-book>Reservar</button></div>';

  /* Eventos */
  document.querySelectorAll('[data-book]').forEach(function (x) { x.onclick = function () { abrirReserva(null); }; });
  document.querySelectorAll('[data-b]').forEach(function (x) { x.onclick = function () { abrirReserva(+x.dataset.b); }; });
  document.querySelectorAll('[data-sc]').forEach(function (x) {
    x.onclick = function () {
      SCAT = x.dataset.sc;
      document.querySelectorAll('[data-sc]').forEach(function (y) { y.setAttribute('aria-pressed', String(y.dataset.sc === SCAT)); });
      document.getElementById('svcs').innerHTML = svcCards(); bindSvc();
    };
  });
  bindSvc();
  document.querySelectorAll('.fchip').forEach(function (f) { f.onclick = function () { GCAT = f.dataset.g; drawGallery(); document.getElementById('gal').scrollTo({ left: 0 }); }; });
  drawGallery();
  var gal = document.getElementById('gal');
  document.getElementById('gl').onclick = function () { gal.scrollBy({ left: -310, behavior: 'smooth' }); };
  document.getElementById('gr').onclick = function () { gal.scrollBy({ left: 310, behavior: 'smooth' }); };
  document.querySelectorAll('#app a[href^="#"]').forEach(function (a) {
    a.onclick = function (e) {
      var id = a.getAttribute('href'); e.preventDefault();
      if (id === '#') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      var t = document.querySelector(id); if (t) t.scrollIntoView({ behavior: 'smooth' });
    };
  });

  /* "Así de fácil": el paso visible cambia la pantalla del teléfono */
  var scrEls = document.querySelectorAll('.phone .scr'), stps = document.querySelectorAll('.stp');
  function setStep(i) { scrEls.forEach(function (s, k) { s.classList.toggle('on', k === i); }); stps.forEach(function (s, k) { s.classList.toggle('on', k === i); }); }
  setStep(0);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) setStep(+e.target.dataset.s); }); }, { rootMargin: '-45% 0px -45% 0px' });
    stps.forEach(function (s) { io.observe(s); });
    var ro = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('seen'); ro.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { ro.observe(el); });
  } else document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('seen'); });
}

/* Efectos de scroll: la silla crece un poco y la barra móvil aparece después del hero */
window.addEventListener('scroll', function () {
  var y = window.scrollY, h = document.getElementById('hart'), mb = document.getElementById('mbar');
  if (h) h.style.transform = 'translateY(' + (y * -0.06) + 'px) scale(' + (1 + Math.min(y, 600) / 6000) + ')';
  if (mb) mb.classList.toggle('show', y > 520);
}, { passive: true });

/* =====================================================================
   FLUJO DE RESERVA
   pasos: 0 barbero · 1 servicio · 2 día y hora · 3 tus datos · 4 recibo
   ===================================================================== */
var st = null;
var PASOS = ['Barbero', 'Servicio', 'Día y hora', 'Tus datos', 'Listo'];

function abrirReserva(bid, svId) {
  st = { bid: bid || null, step: bid ? 1 : 0, sv: svId || null, fecha: null, hora: null, nombre: '', tel: '', error: '', cita: null, cargando: false, enviando: false, last: null };
  document.body.style.overflow = 'hidden';
  dibujar();
}
function cerrarReserva() { st = null; document.getElementById('layer').innerHTML = ''; document.body.style.overflow = ''; }

/* Primer día con horario desde hoy (en los próximos 14 días) */
function diasDisponibles(bid) {
  var out = [];
  for (var i = 0; i < 14; i++) {
    var d = add(HOY, i), f = iso(d), h = hor(bid, f), ok = !!(h && h.activo);
    if (ok && f === HOYS) { var mn = new Date().getHours() * 60 + new Date().getMinutes(); ok = mn < m2(h.hora_fin) - 15; }
    out.push({ d: d, f: f, ok: ok });
  }
  return out;
}

async function elegirDia(f) {
  st.fecha = f; st.hora = null; st.error = ''; st.cargando = true; dibujar();
  try { await cargarOcupadas(st.bid, f, true); }
  catch (e) { st.error = 'No pudimos cargar los horarios. Revisa tu conexión e intenta de nuevo.'; }
  if (st) { st.cargando = false; dibujar(); }
}

async function confirmar() {
  var q = function (i) { return document.getElementById(i); };
  st.nombre = q('f-n').value.trim(); st.tel = q('f-t').value.trim();
  if (st.nombre.length < 2) { q('e-n').textContent = 'Escribe tu nombre para apartar el turno.'; q('f-n').focus(); return; }
  if (st.tel && !/^[0-9 +()-]{7,20}$/.test(st.tel)) { q('e-t').textContent = 'Revisa el número: solo números y espacios.'; q('f-t').focus(); return; }
  st.enviando = true; dibujar();
  try {
    st.cita = await reservar(st.bid, st.sv, st.fecha, st.hora, st.nombre, st.tel);
    st.cita.cliente_nombre = st.nombre;
    st.step = 4;
  } catch (e) {
    var cod = codigoError(e);
    st.error = cod ? ERRORES[cod] : 'No pudimos guardar la reserva. Revisa tu conexión e intenta de nuevo.';
    if (cod === 'HORARIO_OCUPADO' || cod === 'FECHA_INVALIDA' || cod === 'FUERA_DE_HORARIO') {
      st.step = 2; st.hora = null;
      try { await cargarOcupadas(st.bid, st.fecha, true); } catch (x) { /* se mostrará igual el mensaje */ }
    }
    if (cod === 'BARBERO_NO_DISPONIBLE') { await cargarCatalogo(); st.bid = null; st.step = 0; }
  }
  if (st) { st.enviando = false; dibujar(); }
}

function dibujar() {
  if (!st) return;
  var dir = st.last === null ? '' : (st.step > st.last ? 'fwd' : (st.step < st.last ? 'back' : ''));
  var celebrar = st.step === 4 && st.last === 3; st.last = st.step;
  var b = st.bid ? B(st.bid) : null, si = b ? S(b) : null, sv = st.sv ? SV(st.sv) : null, body = '', foot = '';

  if (st.step === 0) {
    body = '<div><div class="lbl">¿Con quién te quieres sentar?</div><div class="opts">' + activos().map(function (x) {
      var lib = slots(x.id, HOYS).filter(function (s) { return s.libre; }).length;
      return '<button class="opt" data-pb="' + x.id + '">' + portrait(x, true) + '<span><b>' + esc(x.nombre) + '</b><small>' + esc(x.especialidad) + '</small></span><span class="p" style="font-weight:500;font-size:13px;color:var(--free)">' + (lib ? lib + ' hoy' : '') + '</span></button>';
    }).join('') + '</div></div>';
    if (st.error) body += '<div class="alert" role="alert">' + st.error + '</div>';
    body += '<div class="trust"><span>Sin pagar por adelantado</span><span>Sin crear cuenta</span><span>Cancelas gratis</span></div>';
  } else if (st.step === 1) {
    body = '<div><div class="lbl">¿Qué te vas a hacer?</div>' + CATS.map(function (c) {
      var l = DB.servicios.filter(function (s) { return s.cat === c.id && s.activo; }); if (!l.length) return '';
      return '<div class="group" style="margin-bottom:14px"><h4>' + c.t + '</h4><div class="opts">' + l.map(function (s) {
        return '<button class="opt" data-sv="' + s.id + '" aria-pressed="' + (s.id === st.sv) + '">' + ICON[c.ic] + '<span><b>' + esc(s.nombre) + '</b><small>' + s.dur + ' min</small></span><span class="p">' + cop(s.precio) + '</span></button>';
      }).join('') + '</div></div>';
    }).join('') + '</div>';
    foot = '<button class="btn btn-line" id="k-b1">Atrás</button><div style="display:flex;align-items:center;gap:14px"><div class="tot">' + (sv ? 'Total<b>' + cop(sv.precio) + '</b>' : '') + '</div><button class="btn btn-ink" id="k-n1" ' + (sv ? '' : 'disabled') + '>Continuar</button></div>';
  } else if (st.step === 2) {
    var ds = diasDisponibles(b.id);
    body = '<div><div class="lbl">¿Qué día?</div><div class="days" role="group" aria-label="Elige el día">' + ds.map(function (x) {
      return '<button class="day" data-f="' + x.f + '" ' + (x.ok ? '' : 'disabled') + ' aria-pressed="' + (x.f === st.fecha) + '"><small>' + (x.f === HOYS ? 'hoy' : DC[x.d.getDay()]) + '</small><b>' + x.d.getDate() + '</b><small>' + MES[x.d.getMonth()] + '</small></button>';
    }).join('') + '</div></div>';
    if (st.error) body += '<div class="alert" role="alert">' + st.error + '</div>';
    if (st.cargando) body += '<p class="loading-line">Buscando horas libres…</p>';
    else {
      var sl = slots(b.id, st.fecha, sv.dur), man = sl.filter(function (x) { return m2(x.h) < 720; }), tar = sl.filter(function (x) { return m2(x.h) >= 720; });
      var grp = function (t, a) {
        return a.length ? '<div class="group"><h4>' + t + '</h4><div class="slots">' + a.map(function (x) {
          return '<button class="slot" data-h="' + x.h + '" ' + (x.libre ? '' : 'disabled aria-label="' + h12(x.h) + ', no disponible"') + ' aria-pressed="' + (x.h === st.hora) + '">' + h12(x.h).replace(/ [ap]m/, '') + '</button>';
        }).join('') + '</div></div>' : '';
      };
      var hayLibre = sl.some(function (x) { return x.libre; });
      body += '<div><div class="lbl">¿A qué hora?</div>' + (hayLibre ? '<div style="display:flex;flex-direction:column;gap:14px">' + grp('Mañana', man) + grp('Tarde', tar) + '</div>' : '<p class="empty">No quedan turnos este día para este servicio. Prueba otro día.</p>') + '</div>';
      body += '<div class="key"><span><i style="border:1px solid var(--free-line)"></i>Libre</span><span><i style="background:var(--busy-bg)"></i>Ocupado</span><span><i style="background:var(--free)"></i>Tu turno</span></div>';
    }
    foot = '<button class="btn btn-line" id="k-b2">Atrás</button><button class="btn btn-ink" id="k-n2" ' + (st.hora ? '' : 'disabled') + '>Continuar' + (st.hora ? ' · ' + h12(st.hora) : '') + '</button>';
  } else if (st.step === 3) {
    body = '<dl class="recap"><dt>Servicio</dt><dd>' + esc(sv.nombre) + '</dd><dt>Barbero</dt><dd>' + esc(b.nombre) + '</dd><dt>Día</dt><dd>' + fl(st.fecha) + '</dd><dt>Hora</dt><dd>' + h12(st.hora) + '</dd><dt>Precio</dt><dd>' + cop(sv.precio) + '</dd></dl>';
    if (st.error) body += '<div class="alert" role="alert">' + st.error + '</div>';
    body += '<div class="field"><label for="f-n">¿Cómo te llamas?</label><input id="f-n" autocomplete="name" maxlength="80" value="' + esc(st.nombre) + '" placeholder="Tu nombre"><span class="err" id="e-n"></span></div>' +
      '<div class="field"><label for="f-t">Celular <small>(opcional)</small></label><input id="f-t" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" value="' + esc(st.tel) + '" placeholder="300 123 4567"><span class="err" id="e-t"></span><span class="hint">Solo te escribimos si hay que mover tu turno.</span></div>' +
      '<div class="trust"><span>Sin pago por adelantado</span><span>Cancelas gratis</span></div>';
    foot = '<button class="btn btn-line" id="k-b3">Atrás</button><button class="btn btn-brass' + (st.enviando ? ' busy' : '') + '" id="k-ok">' + (st.enviando ? 'Reservando…' : 'Confirmar reserva') + '</button>';
  } else {
    var c = st.cita;
    body = '<div class="receipt" role="status"><span class="stamp">Confirmado</span><div class="r-h"><b>Tauros</b><span>' + esc(NEGOCIO.direccion.split(',')[0]) + ' · ' + esc(NEGOCIO.telefono) + '</span></div><div class="r-ok">¡Te esperamos!</div>' +
      '<dl><dt>N.º</dt><dd>TB-' + c.id + '</dd><dt>Cliente</dt><dd>' + esc(c.cliente_nombre) + '</dd><dt>Barbero</dt><dd>' + esc(b.nombre) + '</dd><dt>Silla</dt><dd>' + pad2(si.n) + '</dd><dt>Día</dt><dd>' + fl(c.fecha) + '</dd><dt>Hora</dt><dd>' + h12(c.hora_inicio) + ' – ' + h12(c.hora_fin) + '</dd></dl>' +
      '<div class="r-t"><span>' + esc(sv.nombre) + '</span><span>' + cop(sv.precio) + '</span></div><div class="r-f">Pagas en la barbería.<br>Toma captura de este recibo y llega 5 min antes.</div></div>';
    foot = '<span></span><button class="btn btn-ink" id="k-d">Listo</button>';
  }

  var top = b ? '<div class="sh-top" style="--bgc:' + b.look.bg + '">' + portrait(b, true) + '<div><h3>' + esc(b.nombre) + '</h3><p>Silla ' + pad2(si.n) + ' · ' + esc(b.especialidad) + '</p></div><button class="close" id="k-c" aria-label="Cerrar">×</button></div>'
    : '<div class="sh-top">' + logoSvg.replace('<svg ', '<svg style="width:44px;height:44px" ') + '<div><h3>Reserva tu turno</h3><p>' + (sv ? esc(sv.nombre) + ' · ' + cop(sv.precio) : esc(NEGOCIO.nombre)) + '</p></div><button class="close" id="k-c" aria-label="Cerrar">×</button></div>';

  document.getElementById('layer').innerHTML = '<div class="scrim" id="scr"><aside class="sheet" role="dialog" aria-modal="true" aria-label="Reservar turno">' + top +
    '<div class="prog">' + PASOS.map(function (t, i) { return '<span class="' + (i <= st.step ? 'on' : '') + '"></span>'; }).join('') + '</div>' +
    '<div class="prog-l">Paso ' + (st.step + 1) + ' de 5 · <b>' + PASOS[st.step] + '</b></div>' +
    '<div class="sh-body ' + dir + '">' + body + '</div>' + (foot ? '<div class="sh-foot">' + foot + '</div>' : '') + '</aside></div>';

  /* Eventos del panel */
  var q = function (i) { return document.getElementById(i); };
  q('k-c').onclick = cerrarReserva;
  q('scr').addEventListener('click', function (e) { if (e.target.id === 'scr') cerrarReserva(); });
  document.querySelectorAll('[data-pb]').forEach(function (x) { x.onclick = function () { st.bid = +x.dataset.pb; st.error = ''; st.step = 1; dibujar(); }; });
  document.querySelectorAll('[data-sv]').forEach(function (x) { x.onclick = function () { st.sv = +x.dataset.sv; dibujar(); }; });
  document.querySelectorAll('.day').forEach(function (x) { x.onclick = function () { elegirDia(x.dataset.f); }; });
  document.querySelectorAll('.slot').forEach(function (x) { x.onclick = function () { st.hora = x.dataset.h; st.error = ''; dibujar(); }; });
  if (q('k-b1')) q('k-b1').onclick = function () { st.step = 0; dibujar(); };
  if (q('k-n1')) q('k-n1').onclick = function () {
    st.step = 2; st.hora = null;
    var primero = diasDisponibles(st.bid).find(function (x) { return x.ok; });
    if (primero) elegirDia(st.fecha || primero.f); else { st.error = 'Este barbero no tiene días disponibles en las próximas dos semanas.'; dibujar(); }
  };
  if (q('k-b2')) q('k-b2').onclick = function () { st.step = 1; st.error = ''; dibujar(); };
  if (q('k-n2')) q('k-n2').onclick = function () { st.step = 3; st.error = ''; dibujar(); setTimeout(function () { q('f-n') && q('f-n').focus(); }, 0); };
  if (q('k-b3')) q('k-b3').onclick = function () { st.nombre = q('f-n').value; st.tel = q('f-t').value; st.step = 2; dibujar(); };
  if (q('k-ok')) q('k-ok').onclick = confirmar;
  if (q('k-d')) q('k-d').onclick = async function () { cerrarReserva(); try { await cargarOcupacionHoy(); } catch (e) { } renderC(); };
  if (celebrar) confetti(document.querySelector('.sheet'));
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st) cerrarReserva(); });

/* =====================================================================
   ARRANQUE
   ===================================================================== */
async function iniciar() {
  var app = document.getElementById('app');
  try {
    await cargarCatalogo();
    await cargarOcupacionHoy();
    renderC();
  } catch (e) {
    console.error(e);
    app.innerHTML = '<div class="fatal"><div>' + logoSvg.replace('<svg ', '<svg style="width:56px;height:56px" ') +
      '<h1>No pudimos cargar la agenda</h1><p>Revisa tu conexión a internet e intenta de nuevo. Si el problema sigue, llámanos al ' + esc(NEGOCIO.telefono) + '.</p>' +
      '<button class="btn btn-ink" onclick="location.reload()">Intentar de nuevo</button></div></div>';
  }
}
/* Refresca los turnos libres cuando el cliente vuelve a la pestaña */
document.addEventListener('visibilitychange', async function () {
  if (document.visibilityState === 'visible' && !st && DB.barberos.length) {
    try { await cargarOcupacionHoy(); renderC(); } catch (e) { }
  }
});
iniciar();
