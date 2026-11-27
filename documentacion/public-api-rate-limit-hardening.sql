/*
 * JasoDatos
 * Rate limiting server-side para endpoints públicos sensibles.
 *
 * Las claves se guardan hasheadas. La aplicación no persiste
 * direcciones IP ni correos en texto plano dentro de esta tabla.
 */

create table if not exists public.public_api_rate_limits (
  action text not null,
  key_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (action, key_hash, window_start),
  constraint public_api_rate_limits_request_count_check
    check (request_count >= 0)
);

create index if not exists public_api_rate_limits_expires_at_idx
  on public.public_api_rate_limits (expires_at);

alter table public.public_api_rate_limits
  enable row level security;

revoke all on table public.public_api_rate_limits from public;
revoke all on table public.public_api_rate_limits from anon;
revoke all on table public.public_api_rate_limits from authenticated;

grant select, insert, update, delete
  on table public.public_api_rate_limits
  to service_role;

create or replace function public.consume_public_api_rate_limit(
  p_action text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_epoch bigint;
  v_window_start timestamptz;
  v_expires_at timestamptz;
  v_count integer;
  v_retry_after integer;
begin
  if nullif(trim(p_action), '') is null
     or nullif(trim(p_key_hash), '') is null
     or p_limit < 1
     or p_window_seconds < 1 then
    raise exception 'Parámetros de rate limit inválidos.';
  end if;

  v_epoch :=
    floor(extract(epoch from v_now) / p_window_seconds)
    * p_window_seconds;

  v_window_start := to_timestamp(v_epoch);
  v_expires_at :=
    v_window_start
    + make_interval(secs => p_window_seconds);

  insert into public.public_api_rate_limits (
    action,
    key_hash,
    window_start,
    request_count,
    expires_at,
    updated_at
  )
  values (
    trim(p_action),
    trim(p_key_hash),
    v_window_start,
    1,
    v_expires_at,
    v_now
  )
  on conflict (action, key_hash, window_start)
  do update
  set
    request_count =
      public.public_api_rate_limits.request_count + 1,
    updated_at = excluded.updated_at
  returning request_count
  into v_count;

  v_retry_after :=
    greatest(
      1,
      ceil(
        extract(
          epoch from (v_expires_at - v_now)
        )
      )::integer
    );

  /*
   * Limpieza oportunista. No afecta la decisión del request actual.
   */
  delete from public.public_api_rate_limits
  where expires_at < v_now - interval '1 hour';

  return jsonb_build_object(
    'ok', true,
    'allowed', v_count <= p_limit,
    'count', v_count,
    'limit', p_limit,
    'retry_after_seconds',
      case
        when v_count <= p_limit then 0
        else v_retry_after
      end
  );
end;
$$;

revoke all
on function public.consume_public_api_rate_limit(
  text,
  text,
  integer,
  integer
)
from public;

revoke all
on function public.consume_public_api_rate_limit(
  text,
  text,
  integer,
  integer
)
from anon;

revoke all
on function public.consume_public_api_rate_limit(
  text,
  text,
  integer,
  integer
)
from authenticated;

grant execute
on function public.consume_public_api_rate_limit(
  text,
  text,
  integer,
  integer
)
to service_role;
