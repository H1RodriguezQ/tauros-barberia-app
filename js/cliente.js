/* =====================================================================
   Tauros Barbería · cliente.js
   Página pública: elegir barbero (con su Instagram), servicios, ubicación
   y el flujo de reserva (barbero → servicio → día y hora → datos → recibo).
   ===================================================================== */

var CATS = [
  { id: 'cortes', t: 'Cortes', ic: 'tijera' },
  { id: 'barba', t: 'Barba', ic: 'navaja' },
  { id: 'extras', t: 'Extras', ic: 'brocha' }
];

/* ---------- Ayudas ---------- */
function activos() { return DB.barberos.filter(function (b) { return b.activo && b.silla_id; }); }
function primerNombre(b) { return b ? b.nombre.split(' ')[0] : ''; }
function enlaceInstagram(usuario) { return 'https://www.instagram.com/' + encodeURIComponent(usuario) + '/'; }
var IG_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>';

/* Turnos libres de hoy y el próximo disponible */
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

/* ---------- Página: elegir barbero y agendar ---------- */
function renderC() {
  var dow = new Date().getDay(), N = NEGOCIO;
  var team = DB.sillas.map(function (si) {
    var b = DB.barberos.find(function (x) { return x.silla_id === si.id; }); if (!b || !b.activo) return '';
    var h = hor(b.id, HOYS), trab = h && h.activo, sl = trab ? slots(b.id, HOYS).filter(function (x) { return x.libre; }) : [];
    var estado = sl.length ? 'Hoy desde ' + h12(sl[0].h) : 'Sin turnos hoy';
    return '<article class="bcard">' +
      '<button class="pic" data-b="' + b.id + '" aria-label="Agendar con ' + esc(b.nombre) + '">' + portrait(b).replace('<svg ', '<svg preserveAspectRatio="xMidYMax slice" ') +
      '<span class="estado' + (sl.length ? '' : ' no') + '">' + estado + '</span></button>' +
      '<div class="bd"><h3>' + esc(b.nombre) + '</h3><div class="role">' + (b.apodo ? esc(b.apodo) + ' · ' : '') + esc(b.especialidad) + '</div>' +
      '<div class="acc"><button class="btn btn-ink" data-b="' + b.id + '">Agendar</button>' +
      (b.instagram ? '<a class="btn btn-line ig" href="' + enlaceInstagram(b.instagram) + '" target="_blank" rel="noopener" aria-label="Ver trabajos de ' + esc(primerNombre(b)) + ' en Instagram (se abre en otra pestaña)">' + IG_SVG + '<span>Sus trabajos</span></a>' : '') +
      '</div></div></article>';
  }).join('');
  var menuSv = CATS.map(function (c) {
    var items = DB.servicios.filter(function (sv) { return sv.cat === c.id && sv.activo; });
    if (!items.length) return '';
    return '<div class="sv-grupo"><h3>' + c.t + '</h3><ul>' + items.map(function (sv) {
      return '<li><button class="sv-fila" data-carta="' + sv.id + '"><span class="sv-n"><b>' + esc(sv.nombre) + '</b>' + (sv.desc ? '<small>' + esc(sv.desc) + '</small>' : '') + '</span>' +
        '<span class="sv-d">' + sv.dur + ' min</span><span class="sv-p">' + cop(sv.precio) + '</span></button></li>';
    }).join('') + '</ul></div>';
  }).join('');
  var hrs = [[1, 'Lunes a viernes', '9:00 am – 7:00 pm'], [6, 'Sábado', '8:00 am – 2:00 pm'], [0, 'Domingo', 'Cerrado']].map(function (r) {
    var on = (r[0] === 1 && dow >= 1 && dow <= 5) || r[0] === dow; return '<tr class="' + (on ? 'now' : '') + '"><td>' + r[1] + (on ? ' · hoy' : '') + '</td><td>' + r[2] + '</td></tr>';
  }).join('');

  document.getElementById('app').innerHTML =
    '<a class="skip" href="#equipo">Saltar a los barberos</a>' +
    '<header class="nav gut"><div class="in"><a class="mark" href="#">' + logoSvg + '<b>Tauros</b><span>Barbería</span></a>' +
    '<nav class="links" aria-label="Secciones"><a href="#equipo">Barberos</a><a href="#servicios">Servicios</a><a href="#visita">Ubicación</a><a href="/admin" title="Panel de administración">Admin</a></nav>' +
    '<button class="menu-btn" id="menu-btn" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="menu-movil"><span></span><span></span></button></div>' +
    '<div class="menu-movil" id="menu-movil" hidden><nav aria-label="Menú"><a href="#equipo">Barberos</a><a href="#servicios">Servicios y precios</a><a href="#visita">Ubicación y horario</a><a class="menu-admin" href="/admin">Acceso administrador</a></nav></div></header>' +

    '<main id="contenido"><section class="intro gut"><div class="in">' +
    '<h1>Elige tu barbero.</h1><p class="sub">Toca su foto y aparta tu hora. Sin llamadas, sin filas.</p></div></section>' +
    '<section class="gut" id="equipo" aria-label="Barberos"><div class="in"><div class="team">' + team + '</div></div></section>' +

    '<section class="gut" id="servicios"><div class="in"><h2 class="h-mid">Servicios y precios</h2><p class="sv-nota">Toca un servicio para agendarlo; en la reserva puedes sumar otros. Pagas en la barbería: ' + esc(N.pagos) + '.</p><div class="sv-menu">' + menuSv + '</div></div></section>' +
    '<section class="sec gut" id="visita"><div class="in"><h2 class="h-mid">Ubicación y horario</h2><div class="visit">' +
    '<div><h3>Dónde estamos</h3><address>' + esc(N.direccion) + '<br>' + esc(N.ciudad) + ', Santander</address><p style="margin-top:10px">' + esc(N.telefono) + ' · ' + esc(N.pagos) + '</p></div>' +
    '<div><h3>Horario</h3><table>' + hrs + '</table></div></div>' +
    '<div class="mapa" id="mapa"><div class="mapa-ph" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg></div>' +
    '<div class="mapa-txt"><b>' + esc(N.mapa.split(',')[0]) + '</b><span>' + esc(N.direccion) + ' · ' + esc(N.ciudad) + '</span></div>' +
    '<div class="mapa-acc"><button class="btn btn-ink btn-sm" id="ver-mapa" type="button">Ver mapa</button><a class="btn btn-line btn-sm" href="https://www.google.com/maps/dir/?api=1&amp;destination=' + encodeURIComponent(N.mapa) + '" target="_blank" rel="noopener">Cómo llegar ↗</a></div>' +
    '<p class="mapa-nota">El mapa lo muestra Google Maps y solo se carga si tocas «Ver mapa».</p></div></div></section></main>' +

    '<footer class="foot-site gut"><div class="in"><span>© ' + new Date().getFullYear() + ' ' + esc(N.nombre) + ' · ' + esc(N.ciudad) + '</span><span class="foot-links"><a href="/privacidad">Política de privacidad</a><a href="/admin">Acceso administrador</a>' + botonMovimiento('') + '</span><span>Proyecto académico · Universidad de Santander</span></div></footer>';

  /* Menú del celular */
  var mb = document.getElementById('menu-btn'), mm = document.getElementById('menu-movil');
  var menu = function (abrir) {
    mm.hidden = !abrir; mb.setAttribute('aria-expanded', String(abrir));
    mb.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
    document.querySelector('.nav').classList.toggle('abierto', abrir);
    if (abrir) { var p = mm.querySelector('a'); if (p) p.focus(); }
  };
  mb.onclick = function () { menu(mm.hidden); };
  mm.addEventListener('click', function (e) { if (e.target.closest('a,button')) menu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !mm.hidden) { menu(false); mb.focus(); } });
  document.addEventListener('click', function (e) { if (!mm.hidden && !e.target.closest('.nav')) menu(false); });

  /* Eventos */
  document.querySelectorAll('[data-b]').forEach(function (x) { x.onclick = function () { abrirReserva(+x.dataset.b); }; });
  document.querySelectorAll('[data-carta]').forEach(function (x) { x.onclick = function () { abrirReserva(null, +x.dataset.carta); }; });
  var vm = document.getElementById('ver-mapa');
  if (vm) vm.addEventListener('click', function () {
    var box = document.getElementById('mapa'), f = document.createElement('iframe');
    f.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(NEGOCIO.mapa) + '&z=16&hl=es&output=embed';
    f.title = 'Mapa: ' + NEGOCIO.mapa; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade';
    box.classList.add('abierto'); box.querySelector('.mapa-ph').replaceWith(f); vm.remove(); f.focus();
  });
  enlazarMovimiento();
  document.querySelectorAll('#app a[href^="#"]').forEach(function (a) {
    a.onclick = function (e) {
      var id = a.getAttribute('href'); e.preventDefault();
      if (id === '#') { window.scrollTo({ top: 0, behavior: menosMovimiento() ? 'auto' : 'smooth' }); return; }
      var t = document.querySelector(id); if (t) desplazar(t);
    };
  });
}

/* =====================================================================
   FLUJO DE RESERVA
   pasos: 0 barbero · 1 servicio · 2 día y hora · 3 tus datos · 4 recibo
   ===================================================================== */
var st = null;
var PASOS = ['Barbero', 'Servicio', 'Día y hora', 'Tus datos', 'Listo'];

function abrirReserva(bid, svId) {
  st = { bid: bid || null, step: bid ? 1 : 0, svs: svId ? [svId] : [], fecha: null, hora: null, nombre: '', tel: '', acepta: false, error: '', cita: null, cargando: false, enviando: false, last: null, recienAbierto: true, origen: document.activeElement };
  document.body.style.overflow = 'hidden';
  dibujar();
}
function cerrarReserva() { var o = st && st.origen; st = null; document.getElementById('layer').innerHTML = ''; document.body.style.overflow = ''; if (o && document.body.contains(o)) o.focus({ preventScroll: true }); }

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
  st.nombre = q('f-n').value.trim(); st.tel = q('f-t').value.trim(); st.acepta = q('f-a').checked;
  ['e-n', 'e-t', 'e-a'].forEach(function (i) { q(i).textContent = ''; });
  ['f-n', 'f-t', 'f-a'].forEach(function (i) { q(i).removeAttribute('aria-invalid'); });
  var mal = function (campo, err, msg) { q(err).textContent = msg; q(campo).setAttribute('aria-invalid', 'true'); q(campo).focus(); };
  if (st.nombre.length < 2 || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(st.nombre)) { mal('f-n', 'e-n', 'Escribe tu nombre para apartar el turno.'); return; }
  if (!celularValido(st.tel)) { mal('f-t', 'e-t', 'Escribe un celular de 10 dígitos que empiece por 3. Ej: 300 123 4567'); return; }
  if (!st.acepta) { mal('f-a', 'e-a', 'Debes autorizar el uso de tus datos para reservar.'); return; }
  st.enviando = true; dibujar();
  try {
    st.cita = await reservar(st.bid, st.svs, st.fecha, st.hora, st.nombre, normalizarCelular(st.tel), st.acepta);
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
    if (cod === 'AUTORIZACION_REQUERIDA') st.acepta = false;
    if (cod === 'VARIOS_NO_DISPONIBLE' || cod === 'SERVICIO_NO_DISPONIBLE') { await cargarCatalogo(); st.step = 1; }
  }
  if (st) { st.enviando = false; dibujar(); }
}

function dibujar() {
  if (!st) return;
  var dir = st.last === null ? '' : (st.step > st.last ? 'fwd' : (st.step < st.last ? 'back' : ''));
  var celebrar = st.step === 4 && st.last === 3; st.last = st.step;
  var b = st.bid ? B(st.bid) : null, si = b ? S(b) : null, svs = st.svs.map(SV).filter(Boolean), sv = svs.length ? { nombre: svs.map(function (x) { return x.nombre; }).join(' + '), precio: svs.reduce(function (t, x) { return t + x.precio; }, 0), dur: svs.reduce(function (t, x) { return t + x.dur; }, 0) } : null, body = '', foot = '';

  if (st.step === 0) {
    body = '<div><div class="lbl">¿Con quién te quieres sentar?</div><div class="opts">' + activos().map(function (x) {
      var lib = slots(x.id, HOYS).filter(function (s) { return s.libre; }).length;
      return '<button class="opt" data-pb="' + x.id + '">' + portrait(x, true) + '<span><b>' + esc(x.nombre) + '</b><small>' + esc(x.especialidad) + '</small></span><span class="p" style="font-weight:500;font-size:13px;color:var(--free)">' + (lib ? lib + ' hoy' : '') + '</span></button>';
    }).join('') + '</div></div>';
    if (st.error) body += '<div class="alert" role="alert">' + st.error + '</div>';
    body += '<div class="trust"><span>Sin pagar por adelantado</span><span>Sin crear cuenta</span><span>Cancelas gratis</span></div>';
  } else if (st.step === 1) {
    body = '<div><div class="lbl">¿Qué te vas a hacer?</div><p class="lbl-sub">Puedes elegir varios, por ejemplo corte + cejas (máximo 4).</p>' + CATS.map(function (c) {
      var l = DB.servicios.filter(function (s) { return s.cat === c.id && s.activo; }); if (!l.length) return '';
      return '<div class="group" style="margin-bottom:14px"><h4>' + c.t + '</h4><div class="opts">' + l.map(function (s) {
        return '<button class="opt" data-sv="' + s.id + '" aria-pressed="' + (st.svs.indexOf(s.id) > -1) + '">' + ICON[c.ic] + '<span><b>' + esc(s.nombre) + '</b><small>' + s.dur + ' min</small></span><span class="p">' + cop(s.precio) + '</span></button>';
      }).join('') + '</div></div>';
    }).join('') + '</div>';
    foot = '<button class="btn btn-line" id="k-b1">Atrás</button><div style="display:flex;align-items:center;gap:14px"><div class="tot">' + (sv ? 'Total · ' + sv.dur + ' min<b>' + cop(sv.precio) + '</b>' : '') + '</div><button class="btn btn-ink" id="k-n1" ' + (sv ? '' : 'disabled') + '>Continuar</button></div>';
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
    body = '<dl class="recap"><dt>' + (svs.length > 1 ? 'Servicios' : 'Servicio') + '</dt><dd>' + esc(sv.nombre) + '</dd><dt>Duración</dt><dd>' + sv.dur + ' min</dd><dt>Barbero</dt><dd>' + esc(b.nombre) + '</dd><dt>Día</dt><dd>' + fl(st.fecha) + '</dd><dt>Hora</dt><dd>' + h12(st.hora) + '</dd><dt>Total</dt><dd>' + cop(sv.precio) + '</dd></dl>';
    if (st.error) body += '<div class="alert" role="alert">' + st.error + '</div>';
    body += '<div class="field"><label for="f-n">¿Cómo te llamas?</label><input id="f-n" autocomplete="name" maxlength="80" required aria-describedby="e-n" value="' + esc(st.nombre) + '" placeholder="Tu nombre"><span class="err" id="e-n" aria-live="polite"></span></div>' +
      '<div class="field"><label for="f-t">Celular</label><input id="f-t" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="12" required aria-describedby="h-t e-t" value="' + esc(st.tel) + '" placeholder="300 123 4567"><span class="err" id="e-t" aria-live="polite"></span><span class="hint" id="h-t">Solo lo usamos para confirmarte o avisarte si hay que mover tu turno.</span></div>' +
      '<label class="consent"><input type="checkbox" id="f-a" required ' + (st.acepta ? 'checked' : '') + ' aria-describedby="e-a"><span>Autorizo a ' + esc(NEGOCIO.nombre) + ' a usar mi nombre y celular solo para gestionar esta cita, según la <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a> (Ley 1581 de 2012).</span></label><span class="err" id="e-a" aria-live="polite"></span>' +
      '<div class="trust"><span>Sin pago por adelantado</span><span>Cancelas gratis</span></div>';
    foot = '<button class="btn btn-line" id="k-b3">Atrás</button><button class="btn btn-brass' + (st.enviando ? ' busy' : '') + '" id="k-ok">' + (st.enviando ? 'Reservando…' : 'Confirmar reserva') + '</button>';
  } else {
    var c = st.cita;
    body = '<div class="receipt" role="status"><span class="stamp">Confirmado</span><div class="r-h"><b>Tauros</b><span>' + esc(NEGOCIO.direccion.split(',')[0]) + ' · ' + esc(NEGOCIO.telefono) + '</span></div><div class="r-ok">¡Te esperamos!</div>' +
      '<dl><dt>N.º</dt><dd>TB-' + c.id + '</dd><dt>Cliente</dt><dd>' + esc(c.cliente_nombre) + '</dd><dt>Barbero</dt><dd>' + esc(b.nombre) + '</dd><dt>Silla</dt><dd>' + pad2(si.n) + '</dd><dt>Día</dt><dd>' + fl(c.fecha) + '</dd><dt>Hora</dt><dd>' + h12(c.hora_inicio) + ' – ' + h12(c.hora_fin) + '</dd></dl>' +
      svs.map(function (x) { return '<div class="r-l"><span>' + esc(x.nombre) + '</span><span>' + cop(x.precio) + '</span></div>'; }).join('') + '<div class="r-t"><span>Total</span><span>' + cop(sv.precio) + '</span></div><div class="r-f">Pagas en la barbería.<br>Toma captura de este recibo y llega 5 min antes.</div></div>';
    foot = '<span></span><button class="btn btn-ink" id="k-d">Listo</button>';
  }

  var top = b ? '<div class="sh-top" style="--bgc:' + b.look.bg + '">' + portrait(b, true) + '<div><h3>' + esc(b.nombre) + '</h3><p>Silla ' + pad2(si.n) + ' · ' + esc(b.especialidad) + '</p></div><button class="close" id="k-c" aria-label="Cerrar">×</button></div>'
    : '<div class="sh-top">' + logoSvg.replace('<svg ', '<svg style="width:44px;height:44px" ') + '<div><h3>Reserva tu turno</h3><p>' + (sv ? esc(sv.nombre) + ' · ' + cop(sv.precio) : esc(NEGOCIO.nombre)) + '</p></div><button class="close" id="k-c" aria-label="Cerrar">×</button></div>';

  document.getElementById('layer').innerHTML = '<div class="scrim" id="scr"><aside class="sheet" role="dialog" aria-modal="true" aria-label="Reservar turno">' + top +
    '<div class="prog">' + PASOS.map(function (t, i) { return '<span class="' + (i <= st.step ? 'on' : '') + '"></span>'; }).join('') + '</div>' +
    '<div class="prog-l" aria-live="polite">Paso ' + (st.step + 1) + ' de 5 · <b>' + PASOS[st.step] + '</b></div>' +
    '<div class="sh-body ' + dir + '">' + body + '</div>' + (foot ? '<div class="sh-foot">' + foot + '</div>' : '') + '</aside></div>';

  /* Eventos del panel */
  var q = function (i) { return document.getElementById(i); };
  q('k-c').onclick = cerrarReserva;
  q('scr').addEventListener('click', function (e) { if (e.target.id === 'scr') cerrarReserva(); });
  document.querySelectorAll('[data-pb]').forEach(function (x) { x.onclick = function () { st.bid = +x.dataset.pb; st.error = ''; st.step = 1; dibujar(); }; });
  document.querySelectorAll('.sheet [data-sv]').forEach(function (x) {
    x.onclick = function () {
      var id = +x.dataset.sv, i = st.svs.indexOf(id);
      if (i > -1) st.svs.splice(i, 1); else if (st.svs.length < 4) st.svs.push(id);
      st.error = ''; st.hora = null; dibujar();
      var b2 = document.querySelector('.sheet [data-sv="' + id + '"]'); if (b2) b2.focus({ preventScroll: true });
    };
  });
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
  if (q('k-b3')) q('k-b3').onclick = function () { st.nombre = q('f-n').value; st.tel = q('f-t').value; st.acepta = q('f-a').checked; st.step = 2; dibujar(); };
  /* Formato del celular mientras se escribe: 300 123 4567 */
  if (q('f-t')) q('f-t').addEventListener('input', function (e) { var v = formatoCelular(e.target.value); if (v !== e.target.value) e.target.value = v; });
  if (q('k-ok')) q('k-ok').onclick = confirmar;
  if (q('k-d')) q('k-d').onclick = async function () { cerrarReserva(); try { await cargarOcupacionHoy(); } catch (e) { } renderC(); };
  if (celebrar) confetti(document.querySelector('.sheet'));
  /* Foco: al cambiar de paso, el teclado y el lector de pantalla arrancan en el contenido nuevo */
  if (dir || st.recienAbierto) {
    st.recienAbierto = false;
    var objetivo = document.querySelector('.sh-body .alert') || document.querySelector('.sh-body .lbl') || document.querySelector('.sh-body .receipt') || q('k-c');
    if (objetivo) { if (!objetivo.matches('button,input,a')) objetivo.setAttribute('tabindex', '-1'); objetivo.focus({ preventScroll: true }); }
  }
}
document.addEventListener('keydown', function (e) {
  if (!st) return;
  if (e.key === 'Escape') cerrarReserva();
  else atraparFoco(document.querySelector('.sheet'), e);
});

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
      '<button class="btn btn-ink" id="reintentar">Intentar de nuevo</button></div></div>';
    document.getElementById('reintentar').onclick = function () { location.reload(); };
  }
}
/* Refresca los turnos libres cuando el cliente vuelve a la pestaña */
document.addEventListener('visibilitychange', async function () {
  if (document.visibilityState === 'visible' && !st && DB.barberos.length) {
    try { await cargarOcupacionHoy(); renderC(); } catch (e) { }
  }
});
iniciar();
