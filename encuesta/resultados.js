/* =====================================================================
   Encuesta de opinión · resultados en vivo
   - Los números agregados los puede ver cualquiera (se actualizan solos).
   - Los comentarios solo los ve el administrador de la barbería.
   ===================================================================== */
var sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
var $ = function (id) { return document.getElementById(id); };
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function barras(el, filas, total) {
  el.innerHTML = filas.map(function (f) {
    var pct = total ? Math.round(f[1] * 100 / total) : 0;
    return '<div class="barra"><span>' + esc(f[0]) + '</span><div class="t" role="img" aria-label="' + esc(f[0]) + ': ' + f[1] + ' (' + pct + '%)"><i style="width:' + pct + '%"></i></div><b>' + f[1] + '</b></div>';
  }).join('');
}

async function cargar() {
  var r = await sb.rpc('resultados_encuesta');
  if (r.error) { $('actualizado').textContent = 'Sin conexión, reintentando…'; return; }
  var d = r.data, t = d.total;
  $('r-total').textContent = t;
  $('r-prom').innerHTML = (t ? String(d.promedio).replace('.', ',') : '–') + '<small> / 5</small>';
  $('r-fac').innerHTML = (t ? String(d.facilidad).replace('.', ',') : '–') + '<small> / 5</small>';
  var llenas = Math.round(d.promedio || 0);
  $('r-est').textContent = t ? '★★★★★'.slice(0, llenas) + '☆☆☆☆☆'.slice(0, 5 - llenas) : '';
  barras($('r-dist'), [5, 4, 3, 2, 1].map(function (n) { return [n + ' ★', d.estrellas[n - 1]]; }), t);
  barras($('r-usaria'), [['Sí', d.usaria.si], ['Tal vez', d.usaria.tal_vez], ['No', d.usaria.no]], t);
  barras($('r-gusto'), [['Diseño', d.gusto.diseno], ['Rapidez', d.gusto.rapidez], ['Facilidad', d.gusto.facilidad], ['Celular', d.gusto.celular], ['Seguridad', d.gusto.seguridad]], t);
  $('actualizado').textContent = 'En vivo · ' + new Date().toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
}

/* Comentarios: solo con la sesión del administrador */
async function comentarios() {
  var s = (await sb.auth.getSession()).data.session;
  var es = s ? (await sb.rpc('es_admin')).data === true : false;
  var box = $('r-com');
  if (!es) {
    box.innerHTML = '<p class="vacio">Los comentarios solo los ve el administrador de la barbería.</p>' +
      '<form class="login" id="lg" novalidate><label class="vh" for="lm">Correo</label><input id="lm" type="email" placeholder="Correo del administrador" autocomplete="username">' +
      '<label class="vh" for="lp">Contraseña</label><input id="lp" type="password" placeholder="Contraseña" autocomplete="current-password">' +
      '<button class="btn btn-line" type="submit">Ver comentarios</button><p class="err" id="le" aria-live="polite"></p></form>';
    $('lg').addEventListener('submit', async function (e) {
      e.preventDefault();
      var r = await sb.auth.signInWithPassword({ email: $('lm').value.trim(), password: $('lp').value });
      if (r.error) { $('le').textContent = 'Correo o contraseña incorrectos.'; return; }
      comentarios();
    });
    return;
  }
  var r = await sb.from('encuesta_respuestas').select('calificacion, comentario, creado_en').not('comentario', 'is', null).order('creado_en', { ascending: false }).limit(100);
  if (r.error || !r.data.length) { box.innerHTML = '<p class="vacio">Todavía no hay comentarios.</p>'; return; }
  box.innerHTML = '<div class="coment">' + r.data.map(function (c) {
    return '<p><span>' + '★'.repeat(c.calificacion) + ' · ' + new Date(c.creado_en).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) + '</span>' + esc(c.comentario) + '</p>';
  }).join('') + '</div>';
}

cargar(); comentarios();
setInterval(function () { if (document.visibilityState === 'visible') { cargar(); } }, 5000);
