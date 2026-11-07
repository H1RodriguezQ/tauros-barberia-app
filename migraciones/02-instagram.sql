-- =====================================================================
--  Migración 02 · Instagram de cada barbero
--  Agrega un campo opcional para enlazar los trabajos de cada barbero.
--  Se guarda solo el usuario (sin @ ni enlace). Se puede ejecutar más de una vez.
--  Cómo usarlo: Supabase → SQL Editor → New query → pegar → Run.
-- =====================================================================
alter table public.barberos add column if not exists instagram text;
alter table public.barberos drop constraint if exists barberos_instagram_valido;
alter table public.barberos add constraint barberos_instagram_valido
  check (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$');
