-- =====================================================================
--  ENCUESTA DE OPINIÓN · Tauros Barbería (módulo aparte)
--  No modifica ninguna tabla de la aplicación de la barbería.
--
--  Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
--  Se puede volver a ejecutar (borra y crea de nuevo SOLO la encuesta).
-- =====================================================================

drop function if exists public.enviar_opinion(smallint, smallint, text, text[], text);
drop function if exists public.resultados_encuesta();
drop table if exists public.encuesta_respuestas cascade;

-- Respuestas anónimas: no se guarda nombre, celular ni correo.
create table public.encuesta_respuestas (
  id           bigint generated always as identity primary key,
  calificacion smallint not null check (calificacion between 1 and 5),   -- ¿Qué te pareció el sitio?
  facilidad    smallint not null check (facilidad between 1 and 5),      -- ¿Qué tan fácil fue usarlo?
  usaria       text not null check (usaria in ('si', 'tal_vez', 'no')),  -- ¿Lo usarías para reservar?
  gusto        text[] not null default '{}'
               check (gusto <@ array['diseno', 'rapidez', 'facilidad', 'celular', 'seguridad']::text[]),
  comentario   text check (comentario is null or char_length(comentario) <= 300),
  creado_en    timestamptz not null default now()
);
create index encuesta_creado_idx on public.encuesta_respuestas (creado_en);

-- Nadie lee ni escribe la tabla directamente: todo pasa por las funciones de abajo.
alter table public.encuesta_respuestas enable row level security;
-- Solo el administrador de la barbería puede leer los comentarios completos.
create policy "admin lee encuesta" on public.encuesta_respuestas
  for select to authenticated using (public.es_admin());

-- Enviar una respuesta (con freno contra envíos masivos)
create function public.enviar_opinion(
  p_calificacion smallint,
  p_facilidad    smallint,
  p_usaria       text,
  p_gusto        text[],
  p_comentario   text
)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare v_id bigint;
begin
  if (select count(*) from public.encuesta_respuestas where creado_en > now() - interval '1 minute') >= 60 then
    raise exception 'DEMASIADAS_SOLICITUDES';
  end if;
  insert into public.encuesta_respuestas (calificacion, facilidad, usaria, gusto, comentario)
  values (p_calificacion, p_facilidad, p_usaria, coalesce(p_gusto, '{}'),
          nullif(left(trim(coalesce(p_comentario, '')), 300), ''))
  returning id into v_id;
  return v_id;
end;
$$;

-- Resultados agregados (sin comentarios): los puede ver cualquiera, en vivo.
create function public.resultados_encuesta()
returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'total',        count(*),
    'promedio',     round(coalesce(avg(calificacion), 0)::numeric, 1),
    'facilidad',    round(coalesce(avg(facilidad), 0)::numeric, 1),
    'estrellas',    json_build_array(
                      count(*) filter (where calificacion = 1), count(*) filter (where calificacion = 2),
                      count(*) filter (where calificacion = 3), count(*) filter (where calificacion = 4),
                      count(*) filter (where calificacion = 5)),
    'usaria',       json_build_object(
                      'si', count(*) filter (where usaria = 'si'),
                      'tal_vez', count(*) filter (where usaria = 'tal_vez'),
                      'no', count(*) filter (where usaria = 'no')),
    'gusto',        json_build_object(
                      'diseno',    count(*) filter (where 'diseno' = any(gusto)),
                      'rapidez',   count(*) filter (where 'rapidez' = any(gusto)),
                      'facilidad', count(*) filter (where 'facilidad' = any(gusto)),
                      'celular',   count(*) filter (where 'celular' = any(gusto)),
                      'seguridad', count(*) filter (where 'seguridad' = any(gusto)))
  )
  from public.encuesta_respuestas;
$$;

revoke all on function public.enviar_opinion(smallint, smallint, text, text[], text) from public, anon, authenticated;
revoke all on function public.resultados_encuesta() from public, anon, authenticated;
grant execute on function public.enviar_opinion(smallint, smallint, text, text[], text) to anon, authenticated;
grant execute on function public.resultados_encuesta() to anon, authenticated;
