-- =====================================================================
--  Migración 04 · Nueva barbera: Valentina Ríos "Vale" (silla 5)
--  - Agrega el campo opcional "ilustracion" (peinado del dibujo cuando no hay foto).
--  - Crea la silla 5, la barbera y su horario (lun–vie 9–6, sáb 8–2).
--  Se puede ejecutar más de una vez (no duplica).
--  Cómo usarlo: Supabase → SQL Editor → New query → pegar todo → Run.
-- =====================================================================
alter table public.barberos add column if not exists ilustracion text;
alter table public.barberos drop constraint if exists barberos_ilustracion_valida;
alter table public.barberos add constraint barberos_ilustracion_valida
  check (ilustracion is null or ilustracion in ('fade','rizo','peinado','rapado','buzz','pompa','mohicano','clasico','diseno','rizofade','largo'));

insert into public.sillas (id, numero, nombre, activa)
values ('silla_5', 5, 'Silla 5', true)
on conflict (id) do nothing;

insert into public.barberos (nombre, apodo, especialidad, silla_id, activo, anios, frase, ilustracion)
select 'Valentina Ríos', 'Vale', 'Fade, cejas y diseños', 'silla_5', true, 6,
       'El detalle es lo que se nota.', 'largo'
where not exists (select 1 from public.barberos where nombre = 'Valentina Ríos');

insert into public.horarios (barbero_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo)
select b.id, d, case when d = 6 then '08:00'::time else '09:00'::time end,
       case when d = 6 then '14:00'::time else '18:00'::time end, 30, d <> 0
from public.barberos b, generate_series(0, 6) d
where b.nombre = 'Valentina Ríos'
on conflict (barbero_id, dia_semana) do nothing;
