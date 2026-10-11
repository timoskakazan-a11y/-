-- ============================================================
-- Доступ сервера сайта БЕЗ service_role ключа.
-- Сервер ходит в API с публичным (publishable/anon) ключом и
-- дополнительно передаёт заголовок x-mc71-key с секретом.
-- RLS пускает к данным ТОЛЬКО запросы с верным секретом.
-- Секрет лежит в схеме private, которая не доступна через API.
-- Выполнять после schema.sql. Идемпотентно.
-- ============================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.server_secret (
  id     boolean primary key default true check (id),
  secret text not null check (char_length(secret) >= 32)
);
revoke all on private.server_secret from public, anon, authenticated;

create or replace function public.is_server()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from private.server_secret s
     where s.secret = coalesce(
       nullif(current_setting('request.headers', true), '')::json ->> 'x-mc71-key', '')
  );
$$;
revoke all on function public.is_server() from public;
grant execute on function public.is_server() to anon, authenticated, service_role;

-- Права на таблицы даём anon, но RLS ограничивает их проверкой секрета
grant select, insert, update, delete
  on public.events, public.albums, public.forms, public.form_responses, public.admin_login_attempts
  to anon;
grant select on public.form_stats to anon;
grant usage on all sequences in schema public to anon;

do $$
declare t text;
begin
  foreach t in array array['events','albums','forms','form_responses','admin_login_attempts'] loop
    execute format('drop policy if exists server_only on public.%I', t);
    execute format(
      'create policy server_only on public.%I for all to anon using ((select public.is_server())) with check ((select public.is_server()))', t);
  end loop;
end $$;

-- Отправка ответа: тоже только с секретом
create or replace function public.submit_form_response_checked(
  p_slug text, p_data jsonb, p_client_token uuid, p_ip_hash text
) returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_server() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return public.submit_form_response(p_slug, p_data, p_client_token, p_ip_hash);
end;
$$;
revoke all on function public.submit_form_response_checked(text, jsonb, uuid, text) from public;
grant execute on function public.submit_form_response_checked(text, jsonb, uuid, text) to anon, service_role;

-- Секрет генерируется один раз; посмотреть: select secret from private.server_secret;
-- Его значение кладётся в Vercel как SUPABASE_SERVER_SECRET.
insert into private.server_secret (secret)
values (encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;
