-- ============================================================
-- Медиацентр школы №71 — схема базы данных Supabase
-- Выполнить один раз: Supabase → SQL Editor → вставить → Run.
-- Скрипт идемпотентный: повторный запуск ничего не сломает.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Мероприятия ----------
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 200),
  description  text not null default '' check (char_length(description) <= 5000),
  starts_at    timestamptz not null,
  location     text not null default '' check (char_length(location) <= 200),
  link_url     text check (link_url is null or link_url ~* '^https://'),
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists events_starts_at_idx on public.events (starts_at);

-- ---------- Фотоархивы (ссылки на альбомы ВК) ----------
create table if not exists public.albums (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 200),
  url          text not null check (url ~* '^https://'),
  cover_url    text check (cover_url is null or cover_url ~* '^https://'),
  album_date   date,
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists albums_date_idx on public.albums (album_date desc nulls last);

-- ---------- Формы ----------
create table if not exists public.forms (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,60}$'),
  title         text not null check (char_length(title) between 1 and 200),
  description   text not null default '' check (char_length(description) <= 3000),
  fields        jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array'),
  is_open       boolean not null default true,
  closes_at     timestamptz,
  max_responses integer check (max_responses is null or max_responses > 0),
  success_text  text not null default 'Спасибо! Ответ записан.' check (char_length(success_text) <= 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- Ответы на формы ----------
create table if not exists public.form_responses (
  id           uuid primary key default gen_random_uuid(),
  form_id      uuid not null references public.forms(id) on delete cascade,
  data         jsonb not null check (jsonb_typeof(data) = 'object'),
  -- уникальный токен отправки: повторная отправка того же ответа
  -- (обрыв сети, двойной клик) не создаст дубль
  client_token uuid not null unique,
  -- хеш IP с секретной солью (сам IP не хранится — анонимность)
  ip_hash      text not null,
  created_at   timestamptz not null default now()
);
create index if not exists form_responses_form_idx on public.form_responses (form_id, created_at desc);
create index if not exists form_responses_ip_idx   on public.form_responses (ip_hash, created_at desc);

-- ---------- Попытки входа в админку (защита от перебора) ----------
create table if not exists public.admin_login_attempts (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  success    boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_login_ip_idx on public.admin_login_attempts (ip_hash, created_at desc);

-- ============================================================
-- БЕЗОПАСНОСТЬ: включаем RLS и НЕ создаём ни одной политики.
-- Это значит, что публичный (anon) ключ Supabase не может ни читать,
-- ни писать ничего. Весь доступ идёт только через сервер сайта
-- с service_role ключом, где каждая операция проверяется.
-- ============================================================
alter table public.events               enable row level security;
alter table public.albums               enable row level security;
alter table public.forms                enable row level security;
alter table public.form_responses       enable row level security;
alter table public.admin_login_attempts enable row level security;

revoke all on public.events, public.albums, public.forms,
              public.form_responses, public.admin_login_attempts
  from anon, authenticated;

-- ============================================================
-- Атомарная отправка ответа: проверка, лимиты и запись
-- в одной транзакции. Блокировка строки формы гарантирует,
-- что лимит ответов не будет превышен даже при сотнях
-- одновременных отправок.
-- Возвращает: ok | duplicate | not_found | closed | full | rate_limited
-- ============================================================
create or replace function public.submit_form_response(
  p_slug         text,
  p_data         jsonb,
  p_client_token uuid,
  p_ip_hash      text,
  p_rate_limit   integer default 120,
  p_rate_window  interval default interval '10 minutes'
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form  public.forms%rowtype;
  v_count integer;
begin
  -- повтор той же отправки — считаем успехом, не дублируем
  if exists (select 1 from form_responses where client_token = p_client_token) then
    return 'duplicate';
  end if;

  select * into v_form from forms where slug = p_slug for share;
  if not found then
    return 'not_found';
  end if;

  if not v_form.is_open or (v_form.closes_at is not null and v_form.closes_at <= now()) then
    return 'closed';
  end if;

  select count(*) into v_count
    from form_responses
   where ip_hash = p_ip_hash
     and form_id = v_form.id
     and created_at > now() - p_rate_window;
  if v_count >= p_rate_limit then
    return 'rate_limited';
  end if;

  if v_form.max_responses is not null then
    -- сериализуем проверку лимита для конкретной формы
    perform pg_advisory_xact_lock(hashtext(v_form.id::text));
    select count(*) into v_count from form_responses where form_id = v_form.id;
    if v_count >= v_form.max_responses then
      return 'full';
    end if;
  end if;

  insert into form_responses (form_id, data, client_token, ip_hash)
  values (v_form.id, p_data, p_client_token, p_ip_hash)
  on conflict (client_token) do nothing;

  return 'ok';
end;
$$;

revoke all on function public.submit_form_response(text, jsonb, uuid, text, integer, interval) from public, anon, authenticated;
grant execute on function public.submit_form_response(text, jsonb, uuid, text, integer, interval) to service_role;

-- Сводка по количеству ответов для админки
create or replace view public.form_stats with (security_invoker = true) as
  select f.id as form_id, count(r.id)::int as responses, max(r.created_at) as last_response_at
    from public.forms f
    left join public.form_responses r on r.form_id = f.id
   group by f.id;
revoke all on public.form_stats from anon, authenticated;

-- ---------- Пример формы (можно удалить в админке) ----------
insert into public.forms (slug, title, description, fields)
values (
  'disco-songs',
  'Песни для дискотеки',
  'Предложи трек для ближайшей школьной дискотеки. Форма анонимная — мы не собираем имена.',
  '[
    {"id":"artist","type":"text","label":"Исполнитель","required":true,"maxLength":100},
    {"id":"song","type":"text","label":"Название песни","required":true,"maxLength":150},
    {"id":"class","type":"select","label":"Твоя параллель","required":false,"options":["5–6 классы","7–8 классы","9 классы","10–11 классы"]},
    {"id":"comment","type":"textarea","label":"Комментарий","required":false,"maxLength":500,"placeholder":"Например: ссылка на трек или почему именно он"}
  ]'::jsonb
)
on conflict (slug) do nothing;
