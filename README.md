# Tauros Barbería · Sistema de agendamiento de citas

Aplicación web para que los clientes de **Tauros Barbería** (Bucaramanga) reserven su turno en línea, viendo en tiempo real qué horas tiene libres cada barbero, y para que el administrador gestione barberos, horarios, servicios y la agenda del día.

Proyecto académico · Universidad de Santander.

## Problema que resuelve

La barbería agendaba de forma manual (llamadas y papel). Eso causaba **citas dobles** (dos clientes con el mismo barbero a la misma hora), clientes que no sabían qué horas había libres y mucha carga para el administrador.

## Funcionalidades

**Módulo cliente** (`/`)
- Ver los barberos con su silla, especialidad y turnos libres de hoy (RF-01, RF-02).
- Carta de servicios con precio y duración.
- Reservar en 5 pasos: barbero → servicio → día → hora → datos (RF-03, RF-04, RF-05).
- Horas libres en verde y ocupadas en gris, calculadas según la duración del servicio.
- Comprobante en pantalla con número de reserva (RF-06).

**Módulo administrador** (`/admin`)
- Acceso con correo y contraseña (RF-07).
- Agenda del día por barbero, con filtros por fecha y barbero, que se actualiza sola cuando entra una reserva (RF-11).
- Marcar citas como atendidas o canceladas (si se cancela, el turno vuelve a quedar libre).
- Registrar, editar y asignar barberos a sillas (RF-08, RF-09).
- Activar o desactivar barberos: los inactivos no aparecen para reservar (RF-12).
- Editar el horario semanal de cada barbero (RF-10).
- Editar precio, duración y visibilidad de los servicios.

## Tecnologías

| Tecnología | Uso |
|---|---|
| HTML5, CSS3, JavaScript (ES2017) | Interfaz y lógica del cliente, sin frameworks |
| Supabase (PostgreSQL + Auth + Realtime) | Base de datos, inicio de sesión del administrador y avisos en tiempo real |
| GitHub | Control de versiones |
| Vercel | Publicación con despliegue automático en cada `git push` |

## Estructura

```
tauros-barberia-app/
├── index.html        Página del cliente
├── admin.html        Panel de administración (se abre en /admin)
├── css/estilos.css   Estilos compartidos
├── js/
│   ├── config.js     URL y clave pública de Supabase + datos del negocio
│   ├── ui.js         Utilidades, ilustraciones, confeti y avisos
│   ├── api.js        Toda la comunicación con Supabase
│   ├── cliente.js    Página pública y flujo de reserva
│   └── admin.js      Panel del administrador
├── img/logo.svg
├── supabase.sql      Tablas, reglas de seguridad, funciones y datos iniciales
└── vercel.json       URLs limpias (/admin) y cabeceras de seguridad
```

## Cómo ponerlo a funcionar

### 1. Base de datos (Supabase)
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor → New query**, pega todo el contenido de `supabase.sql` y presiona **Run**.
3. En **Authentication → Users → Add user**, crea el usuario administrador (marca *Auto Confirm User*).
4. En **SQL Editor** conviértelo en administrador (cambia el correo):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'tu-correo@ejemplo.com';
   ```
5. En **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up**.
6. En **Project Settings → API**, copia la *Project URL* y la *publishable key* y ponlas en `js/config.js`.

### 2. Probar en tu computador
Abre la carpeta en Visual Studio Code y usa la extensión **Live Server** sobre `index.html`. El panel está en `admin.html`.

### 3. Publicar (GitHub + Vercel)
1. Sube esta carpeta a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repositorio. *Framework Preset*: **Other**, sin comando de build.
3. Cada `git push` publica una versión nueva automáticamente.

## Seguridad

- La clave de `config.js` es la **publishable key**: es pública por diseño (siempre queda visible en el navegador en una app sin servidor propio). Lo que protege los datos son las reglas **Row Level Security** de `supabase.sql`.
- Un visitante solo puede **leer** barberos, sillas, horarios y servicios, y **reservar** a través de la función `reservar_cita`, que valida todo en el servidor. **No puede ver** nombres ni teléfonos de otros clientes.
- Solo los usuarios de la tabla `admins` pueden modificar datos o ver las citas.
- Nunca se usa la clave *secret / service_role* en el código.

## Decisiones técnicas y problemas resueltos

1. **Supabase es relacional (PostgreSQL), no NoSQL.** El documento proponía colecciones JSON; se modelaron como tablas con los mismos campos, relaciones y validaciones.
2. **Condición de carrera (doble reserva).** En lugar de solo verificar antes de guardar, la tabla `citas` tiene una restricción de exclusión (`citas_sin_cruce`) que impide que un barbero tenga dos citas que se crucen en el tiempo. Si dos clientes confirman a la vez, la base de datos acepta una y rechaza la otra, y la página le pide al segundo que elija otra hora.
3. **Variables de entorno en un sitio estático.** Un sitio HTML/JS sin paso de compilación no puede leer las variables de entorno de Vercel, así que la clave pública va en `config.js` y la seguridad se garantiza con RLS.
4. **Acceso del administrador.** En vez de una contraseña escrita en el código (visible para cualquiera), se usa Supabase Auth con un usuario real y la tabla `admins`.
5. **Duración por servicio.** Se agregó la tabla `servicios` (en el documento era una mejora futura): un "Corte + barba" ocupa 60 minutos y el sistema solo ofrece horas donde cabe completo.
6. **Silla y barbero.** La relación se guarda solo en `barberos.silla_id` para que nunca quede desincronizada.

## Datos de ejemplo

Los barberos, servicios, precios, dirección, teléfono, cifras (calificación, cortes al año) y las opiniones son **de ejemplo**. Cámbialos en `supabase.sql`, en el panel `/admin` y en `js/config.js` antes de usarlo con clientes reales.
