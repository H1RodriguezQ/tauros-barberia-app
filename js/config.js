/* =====================================================================
   Tauros Barbería · config.js
   Datos de conexión y del negocio. Es el ÚNICO archivo que hay que
   editar para conectar otra base de datos o cambiar los datos del local.

   Sobre la clave: la "publishable key" (antes llamada "anon key") es
   pública por diseño. Siempre termina visible en el navegador en una
   página sin servidor propio. Lo que protege los datos son las reglas
   Row Level Security definidas en supabase.sql.
   NUNCA pongas aquí la clave "secret" / "service_role".
   ===================================================================== */

var CONFIG = {
  SUPABASE_URL: 'https://dufmhxvgerqhzfbfsiin.supabase.co',
  SUPABASE_KEY: 'sb_publishable_03m7gMsMMOF5C9Gqi8jWkw_-WSprqKc'
};

/* Datos del negocio que se muestran en la página.
   Cambia estos valores por los reales de la barbería. */
var NEGOCIO = {
  nombre: 'Tauros Barbería',
  ciudad: 'Bucaramanga',
  direccion: 'Calle 35 # 27-18, barrio Centro',
  referencia: 'En pleno centro, a dos cuadras del parque Santander.',
  telefono: '607 634 0000',
  instagram: '@taurosbarberia',
  pagos: 'Efectivo, Nequi y tarjeta',
  minutosTolerancia: 10,
  // Cifras de prueba social. Reemplázalas por las reales o déjalas en null para ocultarlas.
  calificacion: '4,9',
  numOpiniones: 312,
  cortesAlAnio: '9.000+',
  aniosEnElBarrio: 9,
  // true mientras las opiniones sean de ejemplo (muestra un aviso debajo)
  opinionesDeEjemplo: true
};
