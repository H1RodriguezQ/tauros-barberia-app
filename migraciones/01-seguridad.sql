-- =====================================================================
--  Migración 01 · Seguridad (aplicar sobre una base creada con la versión
--  anterior de supabase.sql). Las instalaciones nuevas NO la necesitan:
--  supabase.sql ya incluye todo esto.
--
--  - Mueve btree_gist al esquema "extensions"
--  - Celular obligatorio y válido (Colombia) + autorización de datos (Ley 1581)
--  - Límites contra reservas masivas
--  - es_admin() deja de estar disponible para visitantes anónimos
-- =====================================================================
create schema if not exists extensions;
alter extension btree_gist set schema extensions;
set search_path = public, extensions;

alter table public.citas add column if not exists autorizacion_datos timestamptz;

-- Normaliza los celulares existentes que ya eran válidos (deja solo dígitos, quita +57)
update public.citas
set cliente_contacto = right(regexp_replace(cliente_contacto, '[^0-9]', '', 'g'), 10)
where regexp_replace(cliente_contacto, '[^0-9]', '', 'g') ~ '^(57)?3[0-9]{9}$';

-- Reglas nuevas. NOT VALID: se exigen a partir de ahora sin bloquear las citas de prueba antiguas.
alter table public.citas drop constraint if exists citas_cliente_contacto_check;
alter table public.citas drop constraint if exists citas_contacto_valido;
alter table public.citas drop constraint if exists citas_autorizacion_requerida;
alter table public.citas add constraint citas_contacto_valido
  check (cliente_contacto ~ '^3[0-9]{9}$') not valid;
alter table public.citas add constraint citas_autorizacion_requerida
  check (autorizacion_datos is not null) not valid;

create index if not exists citas_contacto_idx on public.citas (cliente_contacto, fecha);
create index if not exists citas_creado_idx on public.citas (creado_en);

drop function if exists public.reservar_cita(bigint, bigint, date, time, text, text);
drop function if exists public.reservar_cita(bigint, bigint, date, time, text, text, boolean);

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

revoke all on function public.horas_ocupadas(bigint, date) from public, anon, authenticated;
revoke all on function public.reservar_cita(bigint, bigint, date, time, text, text, boolean) from public, anon, authenticated;
revoke all on function public.es_admin() from public, anon, authenticated;
grant execute on function public.horas_ocupadas(bigint, date) to anon, authenticated;
grant execute on function public.reservar_cita(bigint, bigint, date, time, text, text, boolean) to anon, authenticated;
grant execute on function public.es_admin() to authenticated;
