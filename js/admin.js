/* =====================================================================
   Tauros Barbería · admin.js
   Panel del administrador (/admin): acceso con correo y contraseña,
   agenda del día, barberos, horarios y servicios.
   ===================================================================== */

var CATS = [{ id: 'cortes', t: 'Cortes' }, { id: 'barba', t: 'Barba' }, { id: 'extras', t: 'Extras' }];
var A = { tab: 'agenda', fecha: HOYS, fb: 'todos', hb: null, citas: [], correo: '', canal: null };
var V = function () { return document.getElementById('app'); };
var q = function (i) { return document.getElementById(i); };

function cerrarDlg() { q('layer').innerHTML = ''; }
function errorTexto(e) {
  console.error(e);
  if (e && e.code === '42501') return 'No tienes permiso para hacer este cambio. Vuelve a iniciar sesión.';
  return 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.';
}
/* Ejecuta una acción mostrando "Guardando…" en el botón y un aviso al final */
async function accion(btn, fn, okMsg) {
  var txt = btn ? btn.textContent : '';
  if (btn) { btn.classList.add('busy'); btn.textContent = 'Guardando…'; }
  try { await fn(); if (okMsg) toast(okMsg); return true; }
  catch (e) { toast(errorTexto(e)); return false; }
  finally { if (btn && document.body.contains(btn)) { btn.classList.remove('busy'); btn.textContent = txt; } }
}

/* ---------- Acceso ---------- */
function pantallaLogin(msg) {
  V().innerHTML = '<div class="login gut"><form id="lg" novalidate><a class="mark" href="/">' + logoSvg + '<b>Tauros</b><span>Panel</span></a>' +
    '<div><h1>Hola de nuevo</h1><p>Entra para ver la agenda de hoy.</p></div>' + (msg ? '<div class="form-err" role="alert">' + msg + '</div>' : '') +
    '<div class="field"><label for="l-m">Correo</label><input id="l-m" type="email" autocomplete="username" required></div>' +
    '<div class="field"><label for="l-p">Contraseña</label><input id="l-p" type="password" autocomplete="current-password" required></div>' +
    '<button class="btn btn-ink" type="submit" id="l-b">Entrar</button><p style="font-size:13px"><a class="lnk" href="/">← Volver a la página de la barbería</a></p></form></div>';
  q('l-m').focus();
  q('lg').addEventListener('submit', async function (e) {
    e.preventDefault();
    var m = q('l-m').value.trim(), p = q('l-p').value;
    if (!m || !p) { pantallaLogin('Escribe tu correo y tu contraseña.'); return; }
    q('l-b').classList.add('busy'); q('l-b').textContent = 'Entrando…';
    try { var s = await entrar(m, p); A.correo = s.user.email; await abrirPanel(); }
    catch (err) {
      var t = err.message === 'NO_ADMIN' ? 'Esta cuenta no tiene permiso de administrador.' :
        /Invalid login/i.test(err.message) ? 'Correo o contraseña incorrectos.' : 'No pudimos conectarnos. Revisa tu internet e intenta de nuevo.';
      pantallaLogin(t); q('l-m').value = m;
    }
  });
}

async function abrirPanel() {
  await cargarCatalogo();
  if (!A.hb && DB.barberos[0]) A.hb = DB.barberos[0].id;
  marco();
  /* Agenda en tiempo real: si un cliente reserva, la agenda se actualiza sola */
  if (!A.canal) A.canal = escucharCitas(async function (ev) {
    if (A.tab === 'agenda') { await cargarAgenda(); agenda(); }
    if (ev.eventType === 'INSERT') toast('Nueva cita: ' + ev.new.cliente_nombre + ' · ' + h12(String(ev.new.hora_inicio).slice(0, 5)));
  });
}

function marco() {
  var tabs = [['agenda', 'Agenda'], ['barberos', 'Barberos'], ['horarios', 'Horarios'], ['servicios', 'Servicios']];
  V().innerHTML = '<div class="abar gut"><div class="in"><a class="mark" href="/">' + logoSvg + '<b>Tauros</b><span>Panel</span></a><nav class="tabs" aria-label="Secciones del panel">' +
    tabs.map(function (t) { return '<button data-t="' + t[0] + '" aria-current="' + (A.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</nav>' +
    '<div class="user">' + esc(A.correo) + '<button class="lnk" id="pw">Cambiar contraseña</button><button class="lnk" id="out">Salir</button></div></div></div><main class="amain gut in" id="am"><p class="loading-line">Cargando…</p></main>';
  document.querySelectorAll('[data-t]').forEach(function (b) { b.onclick = function () { A.tab = b.dataset.t; marco(); }; });
  q('pw').onclick = dlgClave;
  q('out').onclick = async function () { await salir(); if (A.canal) { sb.removeChannel(A.canal); A.canal = null; } pantallaLogin(); };
  ({ agenda: async function () { await cargarAgenda(); agenda(); }, barberos: barb, horarios: hors, servicios: svcs })[A.tab]();
}

/* ---------- Cambiar contraseña ---------- */
function dlgClave() {
  q('layer').innerHTML = '<div class="dlg-bg" id="db"><form class="dlg" id="cf" role="dialog" aria-modal="true" aria-labelledby="cf-t" novalidate><h2 id="cf-t">Cambiar contraseña</h2>' +
    '<p style="margin:0;color:var(--mute);font-size:14px">Mínimo 10 caracteres, con letras mayúsculas, minúsculas y números.</p>' +
    '<div class="field"><label for="c-1">Nueva contraseña</label><input id="c-1" type="password" autocomplete="new-password" minlength="10" required></div>' +
    '<div class="field"><label for="c-2">Repite la contraseña</label><input id="c-2" type="password" autocomplete="new-password" minlength="10" required><span class="err" id="c-e" aria-live="polite"></span></div>' +
    '<div class="acts"><button type="button" class="btn btn-line" id="c-x">Cancelar</button><button class="btn btn-ink" type="submit" id="c-ok">Guardar</button></div></form></div>';
  q('c-1').focus();
  q('c-x').onclick = cerrarDlg; q('db').addEventListener('click', function (e) { if (e.target.id === 'db') cerrarDlg(); });
  q('cf').addEventListener('submit', async function (e) {
    e.preventDefault();
    var a = q('c-1').value, b = q('c-2').value;
    if (a.length < 10 || !/[a-z]/.test(a) || !/[A-Z]/.test(a) || !/[0-9]/.test(a)) { q('c-e').textContent = 'Usa al menos 10 caracteres con mayúsculas, minúsculas y números.'; return; }
    if (a !== b) { q('c-e').textContent = 'Las dos contraseñas no coinciden.'; return; }
    q('c-ok').classList.add('busy'); q('c-ok').textContent = 'Guardando…';
    try { await cambiarClave(a); cerrarDlg(); toast('Contraseña actualizada. Úsala la próxima vez que entres.'); }
    catch (err) {
      console.error(err);
      q('c-e').textContent = /weak|pwned|leaked|characters/i.test(err.message || '') ? 'Esa contraseña es muy débil. Prueba con una más larga y difícil de adivinar.' : 'No se pudo cambiar. Intenta de nuevo.';
      q('c-ok').classList.remove('busy'); q('c-ok').textContent = 'Guardar';
    }
  });
}

/* ---------- Agenda ---------- */
async function cargarAgenda() {
  try { A.citas = await citasDelDia(A.fecha); }
  catch (e) { A.citas = []; toast('No pudimos cargar las citas.'); }
}
function esNueva(c) { return c.estado === 'confirmada' && Date.now() - new Date(c.creado_en).getTime() < 3 * 3600 * 1000; }

function agenda() {
  if (!q('am')) return;
  var f = A.fecha, cols = DB.barberos.filter(function (b) { return A.fb === 'todos' || b.id === +A.fb; }), dayC = A.citas;
  var cnt = function (e) { return dayC.filter(function (c) { return c.estado === e; }).length; };
  var ing = dayC.filter(function (c) { return c.estado !== 'cancelada'; }).reduce(function (a, c) { var s = SV(c.servicio_id); return a + (s ? s.precio : 0); }, 0);
  /* La agenda va de la primera entrada a la última salida del día */
  var hs = cols.map(function (b) { return hor(b.id, f); }).filter(function (h) { return h && h.activo; });
  var start = hs.length ? Math.floor(Math.min.apply(null, hs.map(function (h) { return m2(h.hora_inicio); })) / 60) * 60 : 8 * 60;
  var end = hs.length ? Math.ceil(Math.max.apply(null, hs.map(function (h) { return m2(h.hora_fin); })) / 60) * 60 : 19 * 60;
  dayC.forEach(function (c) { start = Math.min(start, Math.floor(m2(c.hora_inicio) / 60) * 60); end = Math.max(end, Math.ceil(m2(c.hora_fin) / 60) * 60); });
  var step = 30, R = (end - start) / step, RH = 46;
  var g = '<div class="agenda" style="grid-template-columns:64px repeat(' + Math.max(cols.length, 1) + ',minmax(180px,1fr));grid-template-rows:auto repeat(' + R + ',' + RH + 'px)"><div class="ag-h" style="grid-column:1;grid-row:1"></div>';
  cols.forEach(function (b, i) {
    var h = hor(b.id, f), wk = b.activo && h && h.activo;
    g += '<div class="ag-h' + (wk ? '' : ' off') + '" style="grid-column:' + (i + 2) + ';grid-row:1">' + portrait(b, true) + '<div>' + esc(b.nombre) + '<small>' + (wk ? h12(h.hora_inicio) + ' – ' + h12(h.hora_fin) : (b.activo ? 'No trabaja este día' : 'De descanso')) + '</small></div></div>';
  });
  for (var r = 0; r < R; r++) {
    var t = start + r * step;
    g += '<div class="ag-t" style="grid-column:1;grid-row:' + (r + 2) + '">' + (t % 60 === 0 && r > 0 ? h12(h2(t)).replace(':00', '') : '') + '</div>';
    cols.forEach(function (b, i) { var h = hor(b.id, f), open = b.activo && h && h.activo && t >= m2(h.hora_inicio) && t < m2(h.hora_fin); g += '<div class="ag-c' + (open ? '' : ' closed') + '" style="grid-column:' + (i + 2) + ';grid-row:' + (r + 2) + '"></div>'; });
  }
  cols.forEach(function (b, i) {
    dayC.filter(function (c) { return c.barbero_id === b.id; }).sort(function (a) { return a.estado === 'cancelada' ? -1 : 1; }).forEach(function (c) {
      var r0 = Math.floor((m2(c.hora_inicio) - start) / step), span = Math.max(1, Math.ceil((m2(c.hora_fin) - m2(c.hora_inicio)) / step)), s = SV(c.servicio_id);
      if (r0 < 0 || r0 >= R) return;
      g += '<button class="appt ' + c.estado + (esNueva(c) ? ' nueva' : '') + '" data-c="' + c.id + '" style="grid-column:' + (i + 2) + ';grid-row:' + (r0 + 2) + ' / span ' + span + '"><b>' + esc(c.cliente_nombre) + '</b><span>' + esc(s ? s.nombre : 'Servicio') + ' · ' + h12(c.hora_inicio) + '</span></button>';
    });
  });
  var nm = new Date().getHours() * 60 + new Date().getMinutes();
  if (f === HOYS && nm >= start && nm < end) g += '<div class="nowline" data-off="' + ((nm - start) / step * RH) + '"></div>';
  g += '</div>';
  var d = new Date(f + 'T12:00');
  q('am').innerHTML = '<div class="ahead"><div><h1>Agenda</h1><p>Toca una cita para marcarla atendida o cancelarla. Se actualiza sola cuando entra una reserva.</p></div>' +
    '<div class="tools"><div class="dnav"><button id="dp" aria-label="Día anterior">‹</button><span class="cur">' + (f === HOYS ? 'Hoy, ' : '') + DC[d.getDay()] + ' ' + d.getDate() + ' ' + MES[d.getMonth()] + '</span><button id="dn" aria-label="Día siguiente">›</button>' + (f !== HOYS ? '<button id="dh">Hoy</button>' : '') + '</div>' +
    '<input type="date" id="fd" value="' + f + '" aria-label="Ir a una fecha" style="border:0;border-radius:999px;padding:7px 12px;background:var(--card)">' +
    '<select id="fb" aria-label="Filtrar por barbero"><option value="todos">Todos los barberos</option>' + DB.barberos.map(function (b) { return '<option value="' + b.id + '" ' + (String(b.id) === String(A.fb) ? 'selected' : '') + '>' + esc(b.nombre) + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="sumline"><span><b>' + cnt('confirmada') + '</b> por atender</span><span><b>' + cnt('completada') + '</b> atendidas</span><span><b>' + cnt('cancelada') + '</b> canceladas</span><span>Estimado del día <b>' + cop(ing) + '</b></span></div>' +
    '<div class="agenda-wrap">' + g + '</div>';
  var hh = document.querySelector('.ag-h'), nl = document.querySelector('.nowline'); if (hh && nl) nl.style.top = (hh.offsetHeight + +nl.dataset.off) + 'px';
  var ir = async function (fecha) { A.fecha = fecha; await cargarAgenda(); agenda(); };
  q('dp').onclick = function () { ir(iso(add(new Date(A.fecha + 'T12:00'), -1))); };
  q('dn').onclick = function () { ir(iso(add(new Date(A.fecha + 'T12:00'), 1))); };
  if (q('dh')) q('dh').onclick = function () { ir(HOYS); };
  q('fd').onchange = function (e) { if (e.target.value) ir(e.target.value); };
  q('fb').onchange = function (e) { A.fb = e.target.value; agenda(); };
  document.querySelectorAll('[data-c]').forEach(function (x) { x.onclick = function () { citaDlg(+x.dataset.c); }; });
}

function citaDlg(id) {
  var c = A.citas.find(function (x) { return x.id === id; }), b = B(c.barbero_id), sv = SV(c.servicio_id);
  q('layer').innerHTML = '<div class="dlg-bg" id="db"><div class="dlg" role="dialog" aria-modal="true" aria-label="Detalle de la cita"><h2>' + esc(c.cliente_nombre) + '</h2>' +
    '<dl class="recap"><dt>Servicio</dt><dd>' + esc(sv ? sv.nombre + ' · ' + cop(sv.precio) : '') + '</dd><dt>Barbero</dt><dd>' + esc(b ? b.nombre : '') + '</dd><dt>Día</dt><dd>' + fl(c.fecha) + '</dd><dt>Hora</dt><dd>' + h12(c.hora_inicio) + ' – ' + h12(c.hora_fin) + '</dd>' +
    '<dt>Celular</dt><dd>' + (c.cliente_contacto ? esc(formatoCelular(c.cliente_contacto) || c.cliente_contacto) : 'No dejó') + '</dd><dt>Estado</dt><dd>' + cap(c.estado) + '</dd><dt>Comprobante</dt><dd>TB-' + c.id + '</dd></dl>' +
    '<div class="acts">' + (c.estado === 'confirmada' ? '<button class="btn btn-red" id="x-c">Cancelar cita</button><button class="btn btn-ink" id="x-d">Marcar atendida</button>' : '<button class="btn btn-line" id="x-z">Cerrar</button>') + '</div></div></div>';
  q('db').addEventListener('click', function (e) { if (e.target.id === 'db') cerrarDlg(); });
  if (q('x-z')) q('x-z').onclick = cerrarDlg;
  var cambiar = async function (btn, estado, msg) {
    if (await accion(btn, function () { return cambiarEstadoCita(c.id, estado); }, msg)) { cerrarDlg(); await cargarAgenda(); agenda(); }
  };
  if (q('x-c')) q('x-c').onclick = function () { cambiar(q('x-c'), 'cancelada', 'Cita cancelada. El turno quedó libre.'); };
  if (q('x-d')) q('x-d').onclick = function () { cambiar(q('x-d'), 'completada', 'Cita marcada como atendida'); };
}

/* ---------- Barberos ---------- */
function barb() {
  var lista = DB.barberos.slice().sort(function (a, b) { return (S(a).n || 99) - (S(b).n || 99); });
  q('am').innerHTML = '<div class="ahead"><div><h1>Barberos</h1><p>Si apagas a alguien, deja de aparecer para los clientes.</p></div><button class="btn btn-ink" id="add">Agregar barbero</button></div>' +
    '<div class="card"><div class="tbl"><table class="t"><thead><tr><th>Barbero</th><th>Silla</th><th>Especialidad</th><th>Estado</th><th>Disponible</th><th></th></tr></thead><tbody>' +
    lista.map(function (b) {
      var s = S(b);
      return '<tr class="' + (b.activo ? '' : 'off') + '"><td><div class="bc">' + portrait(b, true) + '<div><b>' + esc(b.nombre) + '</b><span class="sub">' + esc(b.apodo || '') + '</span></div></div></td><td>' + (s.n ? 'Silla ' + pad2(s.n) : 'Sin silla') + '</td><td>' + esc(b.especialidad) + '</td>' +
        '<td><span class="state ' + (b.activo ? 'on' : 'off') + '">' + (b.activo ? 'Recibiendo citas' : 'De descanso') + '</span></td>' +
        '<td><button class="switch" role="switch" aria-checked="' + b.activo + '" data-sw="' + b.id + '" aria-label="Disponibilidad de ' + esc(b.nombre) + '"></button></td><td><button class="lnk" data-e="' + b.id + '">Editar</button></td></tr>';
    }).join('') + '</tbody></table></div><div class="cardfoot"><span>' + DB.barberos.length + ' barberos · ' + DB.sillas.length + ' sillas</span></div></div>';
  document.querySelectorAll('[data-sw]').forEach(function (x) {
    x.onclick = async function () {
      var b = B(+x.dataset.sw), nuevo = !b.activo;
      x.setAttribute('aria-checked', String(nuevo));
      if (await accion(null, function () { return cambiarDisponibilidad(b.id, nuevo); }, nuevo ? b.nombre + ' vuelve a recibir citas' : b.nombre + ' ya no aparece para los clientes')) { await cargarCatalogo(); }
      barb();
    };
  });
  document.querySelectorAll('[data-e]').forEach(function (x) { x.onclick = function () { bForm(B(+x.dataset.e)); }; });
  q('add').onclick = function () { bForm(null); };
}

function bForm(b) {
  var siguiente = DB.sillas.reduce(function (m, s) { return Math.max(m, s.numero); }, 0) + 1;
  q('layer').innerHTML = '<div class="dlg-bg" id="db"><form class="dlg" id="bf" role="dialog" aria-modal="true" aria-label="' + (b ? 'Editar barbero' : 'Nuevo barbero') + '" novalidate><h2>' + (b ? 'Editar barbero' : 'Nuevo barbero') + '</h2>' +
    '<div class="field"><label for="b-n">Nombre completo</label><input id="b-n" maxlength="80" value="' + esc(b ? b.nombre : '') + '"><span class="err" id="b-e"></span></div>' +
    '<div class="field"><label for="b-a">Apodo <small>(opcional)</small></label><input id="b-a" maxlength="30" value="' + esc(b && b.apodo ? b.apodo : '') + '" placeholder="Ej: El Profe"></div>' +
    '<div class="field"><label for="b-s">Especialidad</label><input id="b-s" maxlength="80" value="' + esc(b ? b.especialidad : '') + '" placeholder="Ej: Fade y barba"></div>' +
    '<div class="field"><label for="b-c">Silla</label><select id="b-c">' + DB.sillas.map(function (s) {
      var o = DB.barberos.find(function (x) { return x.silla_id === s.id; });
      return '<option value="' + s.id + '" ' + (b && b.silla_id === s.id ? 'selected' : '') + '>Silla ' + pad2(s.numero) + (o && (!b || o.id !== b.id) ? ' · ocupada por ' + esc(o.nombre.split(' ')[0]) : ' · libre') + '</option>';
    }).join('') + '<option value="nueva">Silla nueva (' + pad2(siguiente) + ')</option></select><span class="hint">Si eliges una silla ocupada, el otro barbero queda sin silla.</span></div>' +
    '<div class="field"><label for="b-f">Foto <small>(enlace a la imagen, opcional)</small></label><input id="b-f" type="url" value="' + esc(b && b.foto_url ? b.foto_url : '') + '" placeholder="https://"></div>' +
    (DB.tieneInstagram ? '<div class="field"><label for="b-i">Instagram <small>(opcional: usuario o enlace del perfil)</small></label><input id="b-i" maxlength="80" autocomplete="off" value="' + esc(b && b.instagram ? '@' + b.instagram : '') + '" placeholder="@usuario"></div>' : '') +
    '<div class="acts"><button type="button" class="btn btn-line" id="b-x">Cancelar</button><button class="btn btn-ink" type="submit" id="b-ok">Guardar</button></div></form></div>';
  q('b-n').focus();
  q('b-x').onclick = cerrarDlg; q('db').addEventListener('click', function (e) { if (e.target.id === 'db') cerrarDlg(); });
  q('bf').addEventListener('submit', async function (e) {
    e.preventDefault();
    var n = q('b-n').value.trim(), foto = q('b-f').value.trim();
    if (n.length < 3) { q('b-e').textContent = 'Escribe nombre y apellido.'; q('b-n').focus(); return; }
    if (foto && !/^https:\/\//.test(foto)) { q('b-e').textContent = 'La foto debe ser un enlace que empiece por https://'; return; }
    var ig = q('b-i') ? q('b-i').value.trim() : '';
    if (ig && !usuarioInstagram(ig)) { q('b-e').textContent = 'El Instagram no es válido. Escribe el usuario, por ejemplo @juli.barber'; q('b-i').focus(); return; }
    var datos = { id: b ? b.id : null, nombre: n, apodo: q('b-a').value.trim(), especialidad: q('b-s').value.trim() || 'Barbero', foto_url: foto, instagram: ig };
    if (await accion(q('b-ok'), function () { return guardarBarbero(datos, q('b-c').value); }, b ? 'Cambios guardados' : 'Barbero agregado con horario de lunes a sábado')) {
      cerrarDlg(); await cargarCatalogo(); barb();
    }
  });
}

/* ---------- Horarios ---------- */
function hors() {
  if (!A.hb && DB.barberos[0]) A.hb = DB.barberos[0].id;
  var filas = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
    var h = DB.horarios.find(function (x) { return x.barbero_id === A.hb && x.dia_semana === d; });
    return h ? Object.assign({}, h) : { barbero_id: A.hb, dia_semana: d, hora_inicio: '09:00', hora_fin: '18:00', duracion_slot: 30, activo: false };
  });
  var turnos = function (h) { return h.activo ? Math.floor((m2(h.hora_fin) - m2(h.hora_inicio)) / h.duracion_slot) : 0; };
  var pintar = function () {
    q('am').innerHTML = '<div class="ahead"><div><h1>Horarios</h1><p>Los turnos que ven los clientes salen de esta tabla.</p></div>' +
      '<div class="tools"><select id="hb" aria-label="Barbero">' + DB.barberos.map(function (b) { return '<option value="' + b.id + '" ' + (b.id === A.hb ? 'selected' : '') + '>' + esc(b.nombre) + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="card"><div class="tbl"><table class="t"><thead><tr><th>Día</th><th>Atiende</th><th>Entra</th><th>Sale</th><th>Cada turno</th><th>Turnos</th></tr></thead><tbody>' +
      filas.map(function (h, i) {
        var dis = h.activo ? '' : 'disabled';
        return '<tr class="' + (h.activo ? '' : 'off') + '"><td><b>' + cap(DIAS[h.dia_semana]) + '</b></td><td><button class="switch" role="switch" aria-checked="' + h.activo + '" data-hd="' + i + '" aria-label="Atiende el ' + DIAS[h.dia_semana] + '"></button></td>' +
          '<td><input type="time" id="hi' + i + '" value="' + h.hora_inicio + '" ' + dis + ' aria-label="Entrada del ' + DIAS[h.dia_semana] + '"></td><td><input type="time" id="hf' + i + '" value="' + h.hora_fin + '" ' + dis + ' aria-label="Salida del ' + DIAS[h.dia_semana] + '"></td>' +
          '<td><select id="hs' + i + '" ' + dis + ' aria-label="Duración del turno">' + [15, 20, 30, 45, 60].map(function (m) { return '<option value="' + m + '" ' + (m === h.duracion_slot ? 'selected' : '') + '>' + m + ' min</option>'; }).join('') + '</select></td><td class="mono">' + (h.activo ? turnos(h) : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div><div class="cardfoot"><span><b class="mono" style="color:var(--ink)">' + filas.reduce(function (a, h) { return a + turnos(h); }, 0) + '</b> turnos por semana</span><button class="btn btn-ink" id="hsv">Guardar horario</button></div></div>';
    q('hb').onchange = function (e) { A.hb = +e.target.value; hors(); };
    var leer = function () { filas.forEach(function (h, i) { if (!h.activo) return; h.hora_inicio = q('hi' + i).value; h.hora_fin = q('hf' + i).value; h.duracion_slot = +q('hs' + i).value; }); };
    document.querySelectorAll('[data-hd]').forEach(function (x) { x.onclick = function () { leer(); var h = filas[+x.dataset.hd]; h.activo = !h.activo; pintar(); }; });
    q('hsv').onclick = async function () {
      leer();
      if (filas.some(function (h) { return h.activo && (!h.hora_inicio || !h.hora_fin || m2(h.hora_fin) <= m2(h.hora_inicio)); })) { toast('Revisa los días: la salida debe ser después de la entrada.'); return; }
      var envio = filas.map(function (h) { return { barbero_id: h.barbero_id, dia_semana: h.dia_semana, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, duracion_slot: h.duracion_slot, activo: h.activo }; });
      if (await accion(q('hsv'), function () { return guardarHorarios(envio); }, 'Horario guardado')) { await cargarCatalogo(); hors(); }
    };
  };
  pintar();
}

/* ---------- Servicios ---------- */
function svcs() {
  q('am').innerHTML = '<div class="ahead"><div><h1>Servicios</h1><p>Lo que aparece en la carta de la página y al reservar.</p></div></div>' +
    '<div class="card"><div class="tbl"><table class="t"><thead><tr><th>Servicio</th><th>Categoría</th><th>Precio</th><th>Duración</th><th>Visible</th><th></th></tr></thead><tbody>' +
    DB.servicios.map(function (s) {
      return '<tr class="' + (s.activo ? '' : 'off') + '"><td><b>' + esc(s.nombre) + '</b><span class="sub">' + esc(s.desc) + '</span></td><td>' + (CATS.find(function (c) { return c.id === s.cat; }) || { t: '' }).t + '</td>' +
        '<td><input class="num" type="number" min="0" step="1000" id="sp' + s.id + '" value="' + s.precio + '" aria-label="Precio de ' + esc(s.nombre) + '"></td>' +
        '<td><select id="sd' + s.id + '" aria-label="Duración de ' + esc(s.nombre) + '">' + [10, 15, 20, 30, 45, 60, 90, 120].map(function (m) { return '<option ' + (m === s.dur ? 'selected' : '') + ' value="' + m + '">' + m + ' min</option>'; }).join('') + '</select></td>' +
        '<td><button class="switch" role="switch" aria-checked="' + s.activo + '" data-sa="' + s.id + '" aria-label="Mostrar ' + esc(s.nombre) + '"></button></td>' +
        '<td><button class="btn btn-ink btn-sm" data-ss="' + s.id + '">Guardar</button></td></tr>';
    }).join('') + '</tbody></table></div><div class="cardfoot"><span>' + DB.servicios.filter(function (s) { return s.activo; }).length + ' de ' + DB.servicios.length + ' servicios visibles</span></div></div>';
  document.querySelectorAll('[data-ss]').forEach(function (x) {
    x.onclick = async function () {
      var id = +x.dataset.ss, precio = parseInt(q('sp' + id).value, 10);
      if (isNaN(precio) || precio < 0) { toast('Escribe un precio válido.'); return; }
      if (await accion(x, function () { return guardarServicio(id, { precio: precio, duracion: +q('sd' + id).value }); }, 'Servicio actualizado')) { await cargarCatalogo(); svcs(); }
    };
  });
  document.querySelectorAll('[data-sa]').forEach(function (x) {
    x.onclick = async function () {
      var s = SV(+x.dataset.sa);
      if (await accion(null, function () { return guardarServicio(s.id, { activo: !s.activo }); }, s.activo ? 'Servicio oculto de la página' : 'Servicio visible en la página')) { await cargarCatalogo(); }
      svcs();
    };
  });
}

/* ---------- Arranque ---------- */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') cerrarDlg();
  else atraparFoco(document.querySelector('#layer .dlg'), e);
});
(async function () {
  try {
    var s = await sesionActual();
    if (s && await esAdmin()) { A.correo = s.user.email; await abrirPanel(); }
    else pantallaLogin();
  } catch (e) { console.error(e); pantallaLogin('No pudimos conectarnos. Revisa tu internet e intenta de nuevo.'); }
})();
