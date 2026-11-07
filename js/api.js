/* =====================================================================
   Tauros Barbería · api.js
   Toda la comunicación con Supabase vive aquí. El resto de archivos
   solo llama a estas funciones, así es fácil de entender y de cambiar.
   ===================================================================== */

var sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

/* Datos en memoria (se llenan con cargarCatalogo) */
var DB = { sillas: [], barberos: [], horarios: [], servicios: [] };

/* Ocupación por barbero y fecha: OCC['3|2026-11-06'] = [{ini:600, fin:645}, ...] */
var OCC = {};

/* Estilo de ilustración para cada barbero mientras no tenga foto */
var LOOKS = [
  { skin: 0, hair: 'fade', beard: true, bg: '#efdcb4' },
  { skin: 1, hair: 'rapado', beard: true, bg: '#e7d5bd' },
  { skin: 2, hair: 'rizo', mustache: true, bg: '#f2e6cf' },
  { skin: 3, hair: 'peinado', bg: '#e9d9c1' },
  { skin: 0, hair: 'pompa', bg: '#f0dcc4' },
  { skin: 1, hair: 'buzz', mustache: true, bg: '#e6dccb' }
];

function hhmm(t) { return t ? String(t).slice(0, 5) : t; }

/* ---------- Lectura del catálogo (lo puede leer cualquiera) ---------- */
async function cargarCatalogo() {
  var r = await Promise.all([
    sb.from('sillas').select('*').order('numero'),
    sb.from('barberos').select('*').order('id'),
    sb.from('horarios').select('*'),
    sb.from('servicios').select('*').order('orden')
  ]);
  r.forEach(function (x) { if (x.error) throw x.error; });

  // La columna instagram llega con la migración 02; si aún no existe, el campo se oculta en el panel
  DB.tieneInstagram = !!(r[1].data[0] && 'instagram' in r[1].data[0]);
  DB.sillas = r[0].data.map(function (s) { return Object.assign({}, s, { n: s.numero }); });
  DB.barberos = r[1].data.map(function (b, i) {
    return Object.assign({}, b, {
      // ilustracion (opcional, migración 04) elige el peinado del dibujo; si no, se asigna uno por orden
      look: b.ilustracion ? Object.assign({}, LOOKS[i % LOOKS.length], { hair: b.ilustracion, beard: false, mustache: false }) : LOOKS[i % LOOKS.length],
      instagram: usuarioInstagram(b.instagram),
      quote: b.frase || '',
      pide: (b.especialidad || '').split(/,| y /).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 2)
    });
  });
  DB.horarios = r[2].data.map(function (h) { return Object.assign({}, h, { hora_inicio: hhmm(h.hora_inicio), hora_fin: hhmm(h.hora_fin) }); });
  DB.servicios = r[3].data.map(function (s) {
    return { id: s.id, cat: s.categoria, nombre: s.nombre, desc: s.descripcion || '', precio: s.precio, dur: s.duracion, tag: s.etiqueta, activo: s.activo, orden: s.orden };
  });
  return DB;
}

/* Atajos de búsqueda */
function B(id) { return DB.barberos.find(function (b) { return b.id === id; }); }
function S(b) { return DB.sillas.find(function (s) { return s.id === b.silla_id; }) || { n: 0, nombre: 'Sin silla' }; }
function SV(id) { return DB.servicios.find(function (s) { return s.id === id; }); }
/* Servicios de una cita: el principal más los extra (migración 03) */
function serviciosDeCita(c) { return [c.servicio_id].concat(c.servicios_extra || []).map(SV).filter(Boolean); }
function hor(bid, fecha) {
  var d = new Date(fecha + 'T12:00').getDay();
  return DB.horarios.find(function (h) { return h.barbero_id === bid && h.dia_semana === d; });
}

/* ---------- Disponibilidad ---------- */
/* Pide a la base de datos SOLO las horas ocupadas (sin datos de clientes) */
async function cargarOcupadas(bid, fecha, forzar) {
  var k = bid + '|' + fecha;
  if (OCC[k] && !forzar) return OCC[k];
  var r = await sb.rpc('horas_ocupadas', { p_barbero: bid, p_fecha: fecha });
  if (r.error) throw r.error;
  OCC[k] = r.data.map(function (c) { return { ini: m2(hhmm(c.hora_inicio)), fin: m2(hhmm(c.hora_fin)) }; });
  return OCC[k];
}

function choca(bid, fecha, ini, fin) {
  return (OCC[bid + '|' + fecha] || []).some(function (c) { return c.ini < fin && ini < c.fin; });
}

/* Genera los turnos de un día. Un turno está libre si el servicio cabe
   completo antes de la hora de salida y no se cruza con otra cita. */
function slots(bid, fecha, dur) {
  var h = hor(bid, fecha), b = B(bid);
  if (!h || !h.activo || !b || !b.activo) return [];
  dur = dur || 30;
  var paso = h.duracion_slot || 30, now = new Date(), mn = now.getHours() * 60 + now.getMinutes(), out = [];
  for (var m = m2(h.hora_inicio); m + paso <= m2(h.hora_fin); m += paso) {
    if (fecha === HOYS && m <= mn) continue;
    out.push({ h: h2(m), libre: m + dur <= m2(h.hora_fin) && !choca(bid, fecha, m, m + dur) });
  }
  return out;
}

/* ---------- Reservar (cliente) ---------- */
var ERRORES = {
  HORARIO_OCUPADO: 'Alguien acaba de tomar esa hora. Elige otra.',
  BARBERO_NO_DISPONIBLE: 'Este barbero ya no está recibiendo citas. Elige otro.',
  FUERA_DE_HORARIO: 'Ese servicio no alcanza a terminar antes de que el barbero salga. Elige una hora más temprano.',
  FECHA_INVALIDA: 'Esa hora ya pasó. Elige otra.',
  SERVICIO_NO_DISPONIBLE: 'Ese servicio ya no está disponible.',
  NOMBRE_INVALIDO: 'Escribe tu nombre para apartar el turno.',
  CONTACTO_INVALIDO: 'Escribe un celular colombiano válido de 10 dígitos que empiece por 3.',
  AUTORIZACION_REQUERIDA: 'Para reservar necesitamos que autorices el uso de tus datos.',
  LIMITE_RESERVAS: 'Ya tienes 2 citas pendientes con este celular. Si necesitas otra, llámanos.',
  DEMASIADAS_SOLICITUDES: 'Estamos recibiendo muchas reservas en este momento. Intenta de nuevo en unos minutos.',
  VARIOS_NO_DISPONIBLE: 'Por ahora solo se puede reservar un servicio a la vez. Deja uno y agrega el otro en la barbería.'
};
function codigoError(e) {
  var msg = (e && (e.message || e.details)) || '';
  return Object.keys(ERRORES).find(function (k) { return msg.indexOf(k) > -1; }) || null;
}

async function reservar(bid, servicios, fecha, hora, nombre, contacto, acepta) {
  servicios = [].concat(servicios);
  var datos = { p_barbero: bid, p_fecha: fecha, p_hora: hora, p_nombre: nombre, p_contacto: contacto, p_acepta: acepta === true };
  var r;
  if (servicios.length === 1) r = await sb.rpc('reservar_cita', Object.assign({ p_servicio: servicios[0] }, datos));
  else {
    r = await sb.rpc('reservar_cita_multi', Object.assign({ p_servicios: servicios }, datos));
    // Si la base de datos aún no tiene la migración 03, se avisa en vez de fallar en silencio
    if (r.error && r.error.code === 'PGRST202') r.error = { message: 'VARIOS_NO_DISPONIBLE' };
  }
  if (r.error) throw r.error;
  var c = r.data[0];
  return { id: c.id, fecha: c.fecha, hora_inicio: hhmm(c.hora_inicio), hora_fin: hhmm(c.hora_fin) };
}

/* ---------- Administrador ---------- */
async function sesionActual() { var r = await sb.auth.getSession(); return r.data.session; }

async function entrar(correo, clave) {
  var r = await sb.auth.signInWithPassword({ email: correo, password: clave });
  if (r.error) throw r.error;
  var a = await sb.rpc('es_admin');
  if (a.error) throw a.error;
  if (!a.data) { await sb.auth.signOut(); throw new Error('NO_ADMIN'); }
  return r.data.session;
}
async function esAdmin() { var a = await sb.rpc('es_admin'); return !a.error && a.data === true; }
async function salir() { await sb.auth.signOut(); }
async function cambiarClave(nueva) {
  var r = await sb.auth.updateUser({ password: nueva });
  if (r.error) throw r.error;
}

/* Celular colombiano: deja solo dígitos y quita el +57 */
function normalizarCelular(t) {
  var d = String(t || '').replace(/\D/g, '');
  if (d.length === 12 && d.indexOf('57') === 0) d = d.slice(2);
  return d;
}
function celularValido(t) { return /^3\d{9}$/.test(normalizarCelular(t)); }
function formatoCelular(t) {
  var d = normalizarCelular(t).slice(0, 10);
  return d.length > 6 ? d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6) : d.length > 3 ? d.slice(0, 3) + ' ' + d.slice(3) : d;
}

async function citasDelDia(fecha) {
  var r = await sb.from('citas').select('*').eq('fecha', fecha).order('hora_inicio');
  if (r.error) throw r.error;
  return r.data.map(function (c) { return Object.assign({}, c, { hora_inicio: hhmm(c.hora_inicio), hora_fin: hhmm(c.hora_fin) }); });
}
async function cambiarEstadoCita(id, estado) {
  var r = await sb.from('citas').update({ estado: estado }).eq('id', id);
  if (r.error) throw r.error;
}

async function cambiarDisponibilidad(bid, activo) {
  var r = await sb.from('barberos').update({ activo: activo }).eq('id', bid);
  if (r.error) throw r.error;
}

/* Crea o edita un barbero y lo asigna a una silla.
   sillaId puede ser 'nueva' para crear la siguiente silla. */
async function guardarBarbero(datos, sillaId) {
  var r;
  if (sillaId === 'nueva') {
    var n = DB.sillas.reduce(function (m, s) { return Math.max(m, s.numero); }, 0) + 1;
    r = await sb.from('sillas').insert({ id: 'silla_' + n, numero: n, nombre: 'Silla ' + n });
    if (r.error) throw r.error;
    sillaId = 'silla_' + n;
  }
  // Si la silla ya la tiene otro barbero, se la quitamos primero
  var otro = DB.barberos.find(function (b) { return b.silla_id === sillaId && b.id !== datos.id; });
  if (otro) { r = await sb.from('barberos').update({ silla_id: null }).eq('id', otro.id); if (r.error) throw r.error; }

  var fila = { nombre: datos.nombre, especialidad: datos.especialidad, apodo: datos.apodo || null, foto_url: datos.foto_url || null, silla_id: sillaId };
  if (DB.tieneInstagram) fila.instagram = usuarioInstagram(datos.instagram);
  if (datos.id) {
    r = await sb.from('barberos').update(fila).eq('id', datos.id);
    if (r.error) throw r.error;
  } else {
    r = await sb.from('barberos').insert(fila).select('id').single();
    if (r.error) throw r.error;
    // Horario por defecto: lunes a viernes 9:00–18:00, sábado 8:00–14:00
    var filas = [0, 1, 2, 3, 4, 5, 6].map(function (d) {
      return { barbero_id: r.data.id, dia_semana: d, hora_inicio: d === 6 ? '08:00' : '09:00', hora_fin: d === 6 ? '14:00' : '18:00', duracion_slot: 30, activo: d !== 0 };
    });
    var h = await sb.from('horarios').insert(filas);
    if (h.error) throw h.error;
  }
}

async function guardarHorarios(filas) {
  var r = await sb.from('horarios').upsert(filas, { onConflict: 'barbero_id,dia_semana' });
  if (r.error) throw r.error;
}

async function guardarServicio(id, cambios) {
  var r = await sb.from('servicios').update(cambios).eq('id', id);
  if (r.error) throw r.error;
}

/* Avisa cuando entra o cambia una cita (para la agenda del administrador) */
function escucharCitas(alCambiar) {
  return sb.channel('citas-admin')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, alCambiar)
    .subscribe();
}

/* Instagram: acepta "@usuario", "usuario" o el enlace del perfil y guarda solo el usuario */
function usuarioInstagram(v) {
  v = String(v || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0];
  return /^[A-Za-z0-9._]{1,30}$/.test(v) ? v : null;
}
