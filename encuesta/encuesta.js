/* =====================================================================
   Encuesta de opinión · formulario (módulo aparte de la app de citas)
   Usa la misma conexión pública de js/config.js, pero solo llama a las
   funciones de la encuesta: no toca tablas de la barbería.
   ===================================================================== */
var sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
var CLAVE = 'tauros-encuesta-enviada';
var $ = function (id) { return document.getElementById(id); };

function yaRespondio() { try { return localStorage.getItem(CLAVE) === '1'; } catch (e) { return false; } }
function marcarRespondida() { try { localStorage.setItem(CLAVE, '1'); } catch (e) { } }

function pantallaGracias(repetida) {
  var app = $('app');
  var header = app.querySelector('header').outerHTML;
  app.innerHTML = header +
    '<div class="gracias" role="status">' +
    '<div class="ok" aria-hidden="true">✓</div>' +
    '<h1>' + (repetida ? 'Ya nos diste tu opinión' : '¡Gracias por tu opinión!') + '</h1>' +
    '<p class="intro">' + (repetida ? 'Solo se puede responder una vez desde este dispositivo.' : 'La recibimos. Mira cómo van los resultados en vivo.') + '</p>' +
    '<div class="acc"><a class="btn btn-gold" href="/encuesta/resultados">Ver resultados en vivo</a>' +
    '<a class="btn btn-line" href="/">Ir al sitio de Tauros</a></div></div>';
}

/* Estrellas: se iluminan todas hasta la elegida */
var estrellas = document.querySelectorAll('#estrellas label');
function pintarEstrellas(n) { estrellas.forEach(function (l, i) { l.classList.toggle('on', i < n); }); }
document.querySelectorAll('input[name="calificacion"]').forEach(function (r) {
  r.addEventListener('change', function () { pintarEstrellas(+r.value); $('e-calificacion').textContent = ''; });
});
['facilidad', 'usaria'].forEach(function (n) {
  document.querySelectorAll('input[name="' + n + '"]').forEach(function (r) { r.addEventListener('change', function () { $('e-' + n).textContent = ''; }); });
});
$('comentario').addEventListener('input', function (e) { $('cuenta').textContent = e.target.value.length; });

function valor(nombre) { var x = document.querySelector('input[name="' + nombre + '"]:checked'); return x ? x.value : null; }

$('f').addEventListener('submit', async function (e) {
  e.preventDefault();
  var cal = valor('calificacion'), fac = valor('facilidad'), usa = valor('usaria');
  var falta = false;
  if (!cal) { $('e-calificacion').textContent = 'Elige de 1 a 5 estrellas.'; falta = falta || 'calificacion'; }
  if (!fac) { $('e-facilidad').textContent = 'Elige un número del 1 al 5.'; falta = falta || 'facilidad'; }
  if (!usa) { $('e-usaria').textContent = 'Elige una opción.'; falta = falta || 'usaria'; }
  if (falta) { var p = document.querySelector('input[name="' + falta + '"]'); if (p) p.focus(); return; }

  var gusto = Array.prototype.map.call(document.querySelectorAll('input[name="gusto"]:checked'), function (x) { return x.value; });
  var btn = $('enviar'); btn.disabled = true; btn.textContent = 'Enviando…'; $('e-general').textContent = '';
  var r = await sb.rpc('enviar_opinion', {
    p_calificacion: +cal, p_facilidad: +fac, p_usaria: usa, p_gusto: gusto,
    p_comentario: $('comentario').value.trim().slice(0, 300)
  });
  if (r.error) {
    console.error(r.error);
    $('e-general').textContent = /DEMASIADAS/.test(r.error.message || '') ? 'Muchas personas están respondiendo al tiempo. Intenta de nuevo en un minuto.' : 'No pudimos enviar tu opinión. Revisa tu conexión e intenta de nuevo.';
    btn.disabled = false; btn.textContent = 'Enviar opinión'; return;
  }
  marcarRespondida(); pantallaGracias(false); window.scrollTo(0, 0);
});

if (yaRespondio()) pantallaGracias(true);
