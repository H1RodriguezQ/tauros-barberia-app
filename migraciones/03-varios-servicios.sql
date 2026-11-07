-- =====================================================================
--  Migración 03 · Varios servicios en una misma cita
--  Ej.: "Corte clásico + Cejas". La cita dura la suma de los servicios.
--  - citas.servicio_id sigue siendo el servicio principal (el primero).
--  - citas.servicios_extra guarda los demás.
--  - reservar_cita_multi() valida y guarda; reservar_cita() se mantiene igual.
--  Se puede ejecutar más de una vez.
--  Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- =====================================================================
alter table public.citas add column if not exists servicios_extra bigint[] not null default '{}';
alter table public.citas drop constraint if exists citas_max_extras;
alter table public.citas add constraint citas_max_extras check (cardinality(servicios_extra) <= 3);

drop function if exists public.reservar_cita_multi(bigint, bigint[], date, time, text, text, boolean);
create function public.reservar_cita_multi(
  p_barbero   bigint,
  p_servicios bigint[],
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
  v_n         int := coalesce(cardinality(p_servicios), 0);
  v_duracion  int;
  v_horario   public.horarios%rowtype;
  v_fin       time;
  v_id        bigint;
begin
  -- 1. Datos del cliente
  if char_length(v_nombre) < 2 or char_length(v_nombre) > 80 or v_nombre !~ '[[:alpha:]]' then
    raise exception 'NOMBRE_INVALIDO';
  end if;
  if char_length(v_tel) = 12 and left(v_tel, 2) = '57' then v_tel := substr(v_tel, 3); end if;
  if v_tel !~ '^3[0-9]{9}$' then raise exception 'CONTACTO_INVALIDO'; end if;
  if coalesce(p_acepta, false) is not true then raise exception 'AUTORIZACION_REQUERIDA'; end if;

  -- 2. Freno contra abuso
  perform pg_advisory_xact_lock(hashtext('reserva:' || v_tel));
  if (select count(*) from public.citas c
      where c.cliente_contacto = v_tel and c.estado = 'confirmada'
        and (c.fecha + c.hora_inicio) > v_ahora) >= 2 then
    raise exception 'LIMITE_RESERVAS';
  end if;
  if (select count(*) from public.citas c where c.creado_en > now() - interval '10 minutes') >= 30 then
    raise exception 'DEMASIADAS_SOLICITUDES';
  end if;

  -- 3. Fecha
  if p_fecha < v_ahora::date or p_fecha > v_ahora::date + 60 or (p_fecha + p_hora) <= v_ahora then
    raise exception 'FECHA_INVALIDA';
  end if;

  -- 4. Servicios: de 1 a 4, sin repetir, todos activos. La duración es la suma.
  if v_n < 1 or v_n > 4 or (select count(distinct x) from unnest(p_servicios) x) <> v_n then
    raise exception 'SERVICIO_NO_DISPONIBLE';
  end if;
  select count(*), sum(s.duracion) into strict v_n, v_duracion
  from public.servicios s where s.id = any(p_servicios) and s.activo;
  if v_n <> cardinality(p_servicios) then raise exception 'SERVICIO_NO_DISPONIBLE'; end if;

  -- 5. Barbero y horario
  if not exists (select 1 from public.barberos b where b.id = p_barbero and b.activo) then
    raise exception 'BARBERO_NO_DISPONIBLE';
  end if;
  select * into v_horario from public.horarios h
  where h.barbero_id = p_barbero and h.dia_semana = extract(dow from p_fecha) and h.activo;
  v_fin := p_hora + make_interval(mins => v_duracion);
  if not found or p_hora < v_horario.hora_inicio or v_fin > v_horario.hora_fin or v_fin <= p_hora then
    raise exception 'FUERA_DE_HORARIO';
  end if;

  -- 6. Guardar (citas_sin_cruce impide la doble reserva)
  begin
    insert into public.citas (barbero_id, servicio_id, servicios_extra, cliente_nombre, cliente_contacto,
                              fecha, hora_inicio, hora_fin, estado, autorizacion_datos)
    values (p_barbero, p_servicios[1], coalesce(p_servicios[2:], '{}'), v_nombre, v_tel,
            p_fecha, p_hora, v_fin, 'confirmada', now())
    returning citas.id into v_id;
  exception when exclusion_violation then
    raise exception 'HORARIO_OCUPADO';
  end;

  return query select v_id, p_fecha, p_hora, v_fin;
end;
$$;

revoke all on function public.reservar_cita_multi(bigint, bigint[], date, time, text, text, boolean) from public, anon, authenticated;
grant execute on function public.reservar_cita_multi(bigint, bigint[], date, time, text, text, boolean) to anon, authenticated;
