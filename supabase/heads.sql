-- ============================================================
-- Команда (педагоги, кураторы), старосты и ежемесячные отчёты.
-- Выполнять после schema.sql и server_access.sql. Идемпотентно.
-- Весь доступ — только через сервер сайта (RLS server_only).
-- ============================================================

-- Педагоги и кураторы: вход по личному коду доступа
create table if not exists public.staff (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null check (char_length(full_name) between 2 and 120),
  position      text not null default '' check (char_length(position) <= 120),
  -- разделы: forms, events, albums, reports, heads
  permissions   text[] not null default '{}',
  -- классы и параллели, которые видит сотрудник ('5А', '6'); пусто — все
  classes       text[] not null default '{}',
  code_hash     text not null unique,
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);

-- Старосты: вход по логину и паролю
create table if not exists public.class_heads (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null check (char_length(full_name) between 2 and 120),
  class_name    text not null check (class_name ~ '^([1-9]|1[01])[А-ЯЁ]?$'),
  login         text not null unique check (login ~ '^[a-z0-9._-]{3,40}$'),
  password_hash text not null,
  is_active     boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists class_heads_class_idx on public.class_heads (class_name);

-- Отчётный период (обычно месяц) со сроком сдачи
create table if not exists public.report_periods (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 120),
  month      date not null,
  deadline   timestamptz not null,
  is_open    boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists report_periods_month_idx on public.report_periods (month desc);

-- Отчёт класса за период: один на класс (два старосты правят один отчёт)
create table if not exists public.class_reports (
  id           uuid primary key default gen_random_uuid(),
  period_id    uuid not null references public.report_periods(id) on delete cascade,
  class_name   text not null,
  head_id      uuid references public.class_heads(id) on delete set null,
  status       text not null default 'draft' check (status in ('draft', 'submitted')),
  submitted_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (period_id, class_name)
);
create index if not exists class_reports_head_idx on public.class_reports (head_id);

-- Строки отчёта: на какие мероприятия ходил класс
create table if not exists public.report_items (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references public.class_reports(id) on delete cascade,
  position     int not null default 0,
  event_date   date not null,
  title        text not null check (char_length(title) between 1 and 200),
  participants int not null check (participants between 1 and 60),
  note         text not null default '' check (char_length(note) <= 500),
  event_id     uuid references public.events(id) on delete set null
);
create index if not exists report_items_report_idx on public.report_items (report_id, position);
create index if not exists report_items_event_idx on public.report_items (event_id);

-- Журнал входа: для старост ограничиваем попытки по логину, а не по IP
-- (вся школа может сидеть за одним IP)
alter table public.admin_login_attempts add column if not exists subject text;
create index if not exists admin_login_subject_idx on public.admin_login_attempts (subject, created_at desc);

-- RLS: пускаем только сервер сайта
alter table public.staff          enable row level security;
alter table public.class_heads    enable row level security;
alter table public.report_periods enable row level security;
alter table public.class_reports  enable row level security;
alter table public.report_items   enable row level security;

revoke all on public.staff, public.class_heads, public.report_periods, public.class_reports, public.report_items
  from public, anon, authenticated;
grant select, insert, update, delete
  on public.staff, public.class_heads, public.report_periods, public.class_reports, public.report_items
  to anon;

do $$
declare t text;
begin
  foreach t in array array['staff','class_heads','report_periods','class_reports','report_items'] loop
    execute format('drop policy if exists server_only on public.%I', t);
    execute format(
      'create policy server_only on public.%I for all to anon using ((select public.is_server())) with check ((select public.is_server()))', t);
  end loop;
end $$;

-- Замена строк отчёта (вызывается из save_class_report в той же транзакции)
create or replace function public.report_replace_items(r uuid, p_items jsonb) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.report_items where report_id = r;
  insert into public.report_items (report_id, position, event_date, title, participants, note, event_id)
  select r, (x.ord - 1)::int,
         (x.item->>'event_date')::date,
         left(btrim(x.item->>'title'), 200),
         (x.item->>'participants')::int,
         left(coalesce(x.item->>'note', ''), 500),
         nullif(x.item->>'event_id', '')::uuid
    from jsonb_array_elements(p_items) with ordinality as x(item, ord);
end;
$$;
revoke all on function public.report_replace_items(uuid, jsonb) from public, anon, authenticated;

-- Сохранение отчёта целиком, атомарно.
-- Проверяет, что период открыт и срок не прошёл, и что отчёт никто не
-- изменил с момента, когда староста его загрузил (p_expected).
-- Возвращает {status: ok|closed|late|conflict|not_found, updated_at}
create or replace function public.save_class_report(
  p_period uuid, p_class text, p_head uuid, p_items jsonb, p_submit boolean, p_expected timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period public.report_periods;
  v_report public.class_reports;
  v_now timestamptz := clock_timestamp();
begin
  select * into v_period from public.report_periods where id = p_period for share;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if not v_period.is_open then return jsonb_build_object('status', 'closed'); end if;
  if v_now > v_period.deadline then return jsonb_build_object('status', 'late'); end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 100 then
    raise exception 'bad items' using errcode = '22023';
  end if;

  select * into v_report from public.class_reports
   where period_id = p_period and class_name = p_class for update;

  if found then
    if p_expected is not null and v_report.updated_at <> p_expected then
      return jsonb_build_object('status', 'conflict', 'updated_at', v_report.updated_at);
    end if;
    update public.class_reports
       set head_id = p_head,
           status = case when p_submit then 'submitted' else status end,
           submitted_at = case when p_submit then v_now else submitted_at end,
           updated_at = v_now
     where id = v_report.id
     returning * into v_report;
  else
    insert into public.class_reports (period_id, class_name, head_id, status, submitted_at, updated_at)
    values (p_period, p_class, p_head,
            case when p_submit then 'submitted' else 'draft' end,
            case when p_submit then v_now end, v_now)
    returning * into v_report;
  end if;

  perform public.report_replace_items(v_report.id, p_items);

  return jsonb_build_object('status', 'ok', 'updated_at', v_report.updated_at);
end;
$$;
revoke all on function public.save_class_report(uuid, text, uuid, jsonb, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.save_class_report(uuid, text, uuid, jsonb, boolean, timestamptz) to service_role;

create or replace function public.save_class_report_checked(
  p_period uuid, p_class text, p_head uuid, p_items jsonb, p_submit boolean, p_expected timestamptz
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_server() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return public.save_class_report(p_period, p_class, p_head, p_items, p_submit, p_expected);
end;
$$;
revoke all on function public.save_class_report_checked(uuid, text, uuid, jsonb, boolean, timestamptz) from public, authenticated;
grant execute on function public.save_class_report_checked(uuid, text, uuid, jsonb, boolean, timestamptz) to anon, service_role;
