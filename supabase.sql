-- =====================================================================
--  TAUROS BARBERÍA · Sistema de agendamiento de citas
--  Script de base de datos para Supabase (PostgreSQL)
--
--  Cómo usarlo:
--    1. En Supabase abre  SQL Editor  →  New query
--    2. Pega TODO este archivo y presiona  Run
--    3. Sigue los pasos del final (crear el usuario administrador)
--
--  Se puede volver a ejecutar: borra las tablas y las crea de nuevo
--  (¡ojo! también borra las citas que existan).
-- =====================================================================

-- Necesaria para la regla anti doble reserva (rangos de tiempo por barbero).
-- Se instala en el esquema "extensions" (no en "public"), como recomienda Supabase.
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;
set search_path = public, extensions;

-- ---------------------------------------------------------------------
-- 0. Limpieza (para poder ejecutar el script varias veces)
-- ---------------------------------------------------------------------
drop function if exists public.reservar_cita(bigint, bigint, date, time, text, text);
drop function if exists public.reservar_cita(bigint, bigint, date, time, text, text, boolean);
drop function if exists public.horas_ocupadas(bigint, date);
drop table if exists public.citas      cascade;
drop table if exists public.horarios   cascade;
drop table if exists public.barberos   cascade;
drop table if exists public.sillas     cascade;
drop table if exists public.servicios  cascade;
drop table if exists public.admins     cascade;
drop function if exists public.es_admin();

-- ---------------------------------------------------------------------
-- 1. TABLAS
-- ---------------------------------------------------------------------

-- Sillas físicas de la barbería
create table public.sillas (
  id        text primary key,                 -- ej: 'silla_1'
  numero    smallint not null unique,         -- ej: 1
  nombre    text not null,                    -- ej: 'Silla 1'
  activa    boolean not null default true
);

-- Barberos. Cada barbero se asigna a una silla (máximo uno por silla).
-- Nota: el documento propone guardar la relación en las dos tablas
-- (sillas.barbero_id y barberos.silla_id). Aquí se guarda solo en
-- barberos.silla_id para que nunca queden desincronizadas.
create table public.barberos (
  id            bigint generated always as identity primary key,
  nombre        text not null check (char_length(nombre) between 3 and 80),
  apodo         text,
  especialidad  text not null default 'Barbero',
  silla_id      text unique references public.sillas(id) on delete set null,
  activo        boolean not null default true,     -- RF-12: disponible / no disponible
  foto_url      text,
  anios         smallint check (anios >= 0),
  frase         text,
  creado_en     timestamptz not null default now()
);

-- Horario de trabajo por día de la semana (RF-10)
-- dia_semana: 0 = domingo, 1 = lunes … 6 = sábado (igual que JavaScript)
create table public.horarios (
  id             bigint generated always as identity primary key,
  barbero_id     bigint not null references public.barberos(id) on delete cascade,
  dia_semana     smallint not null check (dia_semana between 0 and 6),
  hora_inicio    time not null,
  hora_fin       time not null,
  duracion_slot  smallint not null default 30 check (duracion_slot between 10 and 120),
  activo         boolean not null default true,
  unique (barbero_id, dia_semana),
  check (hora_fin > hora_inicio)
);

-- Carta de servicios con precio y duración
create table public.servicios (
  id           bigint generated always as identity primary key,
  categoria    text not null check (categoria in ('cortes','barba','extras')),
  nombre       text not null,
  descripcion  text,
  precio       integer not null check (precio >= 0),   -- en pesos colombianos
  duracion     smallint not null check (duracion between 10 and 240), -- minutos
  etiqueta     text,                                    -- ej: 'El más pedido'
  activo       boolean not null default true,
  orden        smallint not null default 0
);

-- Citas agendadas por los clientes
create table public.citas (
  id                bigint generated always as identity primary key,
  barbero_id        bigint not null references public.barberos(id) on delete restrict,
  servicio_id       bigint not null references public.servicios(id) on delete restrict,
  cliente_nombre    text not null check (char_length(trim(cliente_nombre)) between 2 and 80),
  -- Celular colombiano obligatorio, guardado solo con dígitos: 3XXXXXXXXX
  cliente_contacto  text not null check (cliente_contacto ~ '^3[0-9]{9}$'),
  -- Momento en que el cliente autorizó el tratamiento de sus datos (Ley 1581 de 2012)
  autorizacion_datos timestamptz not null,
  fecha             date not null,
  hora_inicio       time not null,
  hora_fin          time not null,
  estado            text not null default 'confirmada'
                    check (estado in ('confirmada','cancelada','completada')),
  creado_en         timestamptz not null default now(),
  check (hora_fin > hora_inicio),

  -- REGLA ANTI DOBLE RESERVA (resuelve la "condición de carrera"):
  -- un mismo barbero no puede tener dos citas activas que se crucen en el tiempo.
  -- La base de datos rechaza la segunda aunque dos clientes confirmen a la vez.
  constraint citas_sin_cruce exclude using gist (
    barbero_id with =,
    tsrange(fecha + hora_inicio, fecha + hora_fin) with &&
  ) where (estado <> 'cancelada')
);

create index citas_fecha_idx on public.citas (fecha, barbero_id);
create index citas_contacto_idx on public.citas (cliente_contacto, fecha);
create index citas_creado_idx on public.citas (creado_en);

-- Usuarios que pueden entrar al panel /admin
create table public.admins (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  creado_en timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. FUNCIONES
-- ---------------------------------------------------------------------

-- ¿El usuario que hace la petición es administrador?
create function public.es_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Horas ocupadas de un barbero en una fecha.
-- Devuelve SOLO las horas (sin nombres ni teléfonos de otros clientes),
-- así el visitante puede pintar la grilla verde/gris sin ver datos privados.
create function public.horas_ocupadas(p_barbero bigint, p_fecha date)
returns table (hora_inicio time, hora_fin time)
language sql stable security definer set search_path = public
as $$
  select c.hora_inicio, c.hora_fin
  from public.citas c
  where c.barbero_id = p_barbero
    and c.fecha = p_fecha
    and c.estado <> 'cancelada'
  order by c.hora_inicio;
$$;

-- Reservar una cita (lo usa el cliente desde la página).
-- Valida todo en el servidor; el cliente no puede saltarse las reglas.
-- Errores posibles (para mostrar mensajes claros en la página):
--   NOMBRE_INVALIDO, CONTACTO_INVALIDO, AUTORIZACION_REQUERIDA,
--   FECHA_INVALIDA, SERVICIO_NO_DISPONIBLE, BARBERO_NO_DISPONIBLE,
--   FUERA_DE_HORARIO, HORARIO_OCUPADO,
--   LIMITE_RESERVAS (máx. 2 citas futuras por celular),
--   DEMASIADAS_SOLICITUDES (freno contra reservas masivas automáticas)
create function public.reservar_cita(
  p_barbero   bigint,
  p_servicio  bigint,
  p_fecha     date,
  p_hora      time,
  p_nombre    text,
  p_contacto  text,
  p_acepta    boolean
)
returns table (id bigint, fecha date, hora_inicio time, hora_fin time)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_ahora     timestamp := (now() at time zone 'America/Bogota');
  v_nombre    text := regexp_replace(trim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
  v_tel       text := regexp_replace(coalesce(p_contacto, ''), '[^0-9]', '', 'g');
  v_duracion  smallint;
  v_horario   public.horarios%rowtype;
  v_fin       time;
  v_id        bigint;
begin
  -- 1. Datos del cliente
  if char_length(v_nombre) < 2 or char_length(v_nombre) > 80 or v_nombre !~ '[[:alpha:]]' then
    raise exception 'NOMBRE_INVALIDO';
  end if;
  if char_length(v_tel) = 12 and left(v_tel, 2) = '57' then v_tel := substr(v_tel, 3); end if;  -- +57
  if v_tel !~ '^3[0-9]{9}$' then
    raise exception 'CONTACTO_INVALIDO';
  end if;
  if coalesce(p_acepta, false) is not true then
    raise exception 'AUTORIZACION_REQUERIDA';
  end if;

  -- 2. Freno contra abuso: un solo proceso a la vez por celular y límites de cantidad
  perform pg_advisory_xact_lock(hashtext('reserva:' || v_tel));
  if (select count(*) from public.citas c
      where c.cliente_contacto = v_tel and c.estado = 'confirmada'
        and (c.fecha + c.hora_inicio) > v_ahora) >= 2 then
    raise exception 'LIMITE_RESERVAS';
  end if;
  if (select count(*) from public.citas c where c.creado_en > now() - interval '10 minutes') >= 30 then
    raise exception 'DEMASIADAS_SOLICITUDES';
  end if;

  -- 3. Fecha, servicio, barbero y horario
  if p_fecha < v_ahora::date or p_fecha > v_ahora::date + 60
     or (p_fecha + p_hora) <= v_ahora then
    raise exception 'FECHA_INVALIDA';
  end if;

  select s.duracion into v_duracion
  from public.servicios s where s.id = p_servicio and s.activo;
  if not found then raise exception 'SERVICIO_NO_DISPONIBLE'; end if;

  if not exists (select 1 from public.barberos b where b.id = p_barbero and b.activo) then
    raise exception 'BARBERO_NO_DISPONIBLE';
  end if;

  select * into v_horario from public.horarios h
  where h.barbero_id = p_barbero
    and h.dia_semana = extract(dow from p_fecha)
    and h.activo;
  v_fin := p_hora + make_interval(mins => v_duracion);
  if not found or p_hora < v_horario.hora_inicio or v_fin > v_horario.hora_fin
     or v_fin <= p_hora then
    raise exception 'FUERA_DE_HORARIO';
  end if;

  -- 4. Guardar (la restricción citas_sin_cruce impide la doble reserva)
  begin
    insert into public.citas (barbero_id, servicio_id, cliente_nombre, cliente_contacto,
                              fecha, hora_inicio, hora_fin, estado, autorizacion_datos)
    values (p_barbero, p_servicio, v_nombre, v_tel,
            p_fecha, p_hora, v_fin, 'confirmada', now())
    returning citas.id into v_id;
  exception when exclusion_violation then
    raise exception 'HORARIO_OCUPADO';
  end;

  return query select v_id, p_fecha, p_hora, v_fin;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. SEGURIDAD (Row Level Security)
--    Visitante (anon): puede LEER sillas, barberos, horarios y servicios,
--                      y RESERVAR solo a través de reservar_cita().
--                      No puede ver las citas de otros clientes.
--    Administrador:    puede leer y modificar todo.
-- ---------------------------------------------------------------------
alter table public.sillas    enable row level security;
alter table public.barberos  enable row level security;
alter table public.horarios  enable row level security;
alter table public.servicios enable row level security;
alter table public.citas     enable row level security;
alter table public.admins    enable row level security;

-- Lectura pública del catálogo
create policy "lectura publica" on public.sillas    for select using (true);
create policy "lectura publica" on public.barberos  for select using (true);
create policy "lectura publica" on public.horarios  for select using (true);
create policy "lectura publica" on public.servicios for select using (true);

-- Administrador: control total
create policy "admin todo" on public.sillas    for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "admin todo" on public.barberos  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "admin todo" on public.horarios  for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "admin todo" on public.servicios for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "admin todo" on public.citas     for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy "admin se ve" on public.admins   for select to authenticated using (user_id = auth.uid());

-- Permisos de las funciones
-- Permisos de las funciones (principio de mínimo privilegio).
-- horas_ocupadas y reservar_cita son SECURITY DEFINER a propósito: son la ÚNICA puerta
-- del visitante a la tabla citas, devuelven solo lo necesario y validan todo.
revoke all on function public.horas_ocupadas(bigint, date) from public, anon, authenticated;
revoke all on function public.reservar_cita(bigint, bigint, date, time, text, text, boolean) from public, anon, authenticated;
revoke all on function public.es_admin() from public, anon, authenticated;
grant execute on function public.horas_ocupadas(bigint, date) to anon, authenticated;
grant execute on function public.reservar_cita(bigint, bigint, date, time, text, text, boolean) to anon, authenticated;
grant execute on function public.es_admin() to authenticated;   -- el visitante anónimo no la necesita

-- Tiempo real: la agenda del administrador se actualiza sola cuando entra
-- una cita. (Las reglas de seguridad aplican: solo el admin recibe avisos.)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'citas') then
    alter publication supabase_realtime add table public.citas;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. DATOS INICIALES (de ejemplo: cámbialos por los reales)
-- ---------------------------------------------------------------------
insert into public.sillas (id, numero, nombre) values
  ('silla_1', 1, 'Silla 1'),
  ('silla_2', 2, 'Silla 2'),
  ('silla_3', 3, 'Silla 3'),
  ('silla_4', 4, 'Silla 4');

insert into public.barberos (nombre, apodo, especialidad, silla_id, activo, anios, frase) values
  ('Carlos Rodríguez', 'El Profe', 'Cortes clásicos y fade',            'silla_1', true,  9, 'Si sales sin mirarte dos veces al espejo, vuelve que te lo arreglo.'),
  ('Andrés Gómez',     'Barbas',   'Barba, perfilado y toalla caliente','silla_2', true,  6, 'La barba se cuida como una planta: paciencia y buena navaja.'),
  ('Julián Pérez',     'Juli',     'Diseños y freestyle',               'silla_3', true,  4, 'Tráeme una foto o una idea loca. Las dos me sirven.'),
  ('Mateo Suárez',     'Teo',      'Corte infantil y tintes',           'silla_4', false, 3, 'Los niños salen contentos y los papás también.');

-- Horarios: L-V según barbero, sábado 8:00-14:00, domingo cerrado
insert into public.horarios (barbero_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo)
select b.id, d.dia,
       case when d.dia = 6 then time '08:00' else x.ini end,
       case when d.dia = 6 then time '14:00' else x.fin end,
       30,
       d.dia = any (x.dias)
from public.barberos b
join (values
  ('Carlos Rodríguez', time '09:00', time '18:00', array[1,2,3,4,5,6]),
  ('Andrés Gómez',     time '10:00', time '19:00', array[2,3,4,5,6]),
  ('Julián Pérez',     time '09:00', time '17:00', array[1,3,5,6]),
  ('Mateo Suárez',     time '09:00', time '18:00', array[1,2,3,4,5])
) as x(nombre, ini, fin, dias) on x.nombre = b.nombre
cross join generate_series(0, 6) as d(dia);

insert into public.servicios (categoria, nombre, descripcion, precio, duracion, etiqueta, orden) values
  ('cortes', 'Corte clásico',               'Tijera y máquina, lavado y peinado.',                 25000, 30, null,            1),
  ('cortes', 'Fade / degradado',            'Bajo, medio o alto, con perfilado a navaja.',         30000, 45, 'El más pedido', 2),
  ('cortes', 'Corte para niño',             'Hasta 12 años, con paciencia incluida.',              20000, 30, null,            3),
  ('cortes', 'Diseño o línea',              'Rayas, figuras o freestyle. Se suma al corte.',       10000, 15, null,            4),
  ('barba',  'Arreglo de barba',            'Forma, rebaje y perfilado con navaja.',               18000, 30, null,            5),
  ('barba',  'Afeitado con toalla caliente','Ritual completo: toalla, espuma, navaja y loción.',   25000, 45, null,            6),
  ('barba',  'Corte + barba',               'El combo de siempre, a mejor precio.',                40000, 60, 'Combo',         7),
  ('extras', 'Cejas',                       'Limpieza y forma con navaja o cuchilla.',              8000, 15, null,            8),
  ('extras', 'Mascarilla negra',            'Limpieza de puntos negros en nariz y frente.',        15000, 20, null,            9),
  ('extras', 'Tinte o cubre canas',         'Color uniforme para cabello o barba.',                45000, 60, null,           10);

-- =====================================================================
--  DESPUÉS DE EJECUTAR ESTE SCRIPT:
--
--  A) Crea el usuario administrador:
--     Authentication → Users → Add user → Create new user
--     (correo + contraseña, marca "Auto Confirm User")
--
--  B) Conviértelo en administrador. Ejecuta esto en SQL Editor
--     cambiando el correo por el que usaste:
--
--       insert into public.admins (user_id)
--       select id from auth.users where email = 'admin@taurosbarberia.com';
--
--  C) Desactiva el registro público para que nadie más cree cuentas:
--     Authentication → Sign In / Providers → desactiva "Allow new users to sign up"
-- =====================================================================
