/*
 * JasoDatos
 * Hardening de códigos de acceso y verificación de prueba
 *
 * Objetivos:
 * - El PIN de acceso nunca se almacena, ni siquiera hasheado, en el navegador.
 * - Los intentos fallidos se contabilizan del lado del servidor.
 * - La activación del trial y la creación/actualización de la suscripción son atómicas.
 *
 * Ejecutar en Supabase antes de desplegar el código que depende de estas funciones.
 */

create table if not exists public.business_access_challenges (
  token_hash text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  slug text not null,
  email text not null,
  code_hash text not null,
  failed_attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint business_access_challenges_failed_attempts_check
    check (failed_attempts >= 0 and failed_attempts <= 5)
);

create index if not exists business_access_challenges_business_id_idx
  on public.business_access_challenges (business_id);

create index if not exists business_access_challenges_expires_at_idx
  on public.business_access_challenges (expires_at);

alter table public.business_access_challenges
  enable row level security;

revoke all on table public.business_access_challenges from public;
revoke all on table public.business_access_challenges from anon;
revoke all on table public.business_access_challenges from authenticated;

grant select, insert, update, delete
  on table public.business_access_challenges
  to service_role;

alter table public.businesses
  add column if not exists email_verification_failed_attempts integer not null default 0;

alter table public.businesses
  drop constraint if exists businesses_email_verification_failed_attempts_check;

alter table public.businesses
  add constraint businesses_email_verification_failed_attempts_check
  check (
    email_verification_failed_attempts >= 0
    and email_verification_failed_attempts <= 5
  );


/* ============================================================
 * Validación atómica del código de acceso a un negocio
 * ============================================================
 */

create or replace function public.validate_business_access_challenge(
  p_token_hash text,
  p_code_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_challenge public.business_access_challenges%rowtype;
  v_attempts integer;
begin
  select *
  into v_challenge
  from public.business_access_challenges
  where token_hash = p_token_hash
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'reason', 'invalid'
    );
  end if;

  if v_challenge.consumed_at is not null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'consumed'
    );
  end if;

  if v_challenge.expires_at <= now() then
    return jsonb_build_object(
      'ok', false,
      'reason', 'expired'
    );
  end if;

  if v_challenge.failed_attempts >= 5 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'attempts_exceeded'
    );
  end if;

  if v_challenge.code_hash <> p_code_hash then
    v_attempts := least(v_challenge.failed_attempts + 1, 5);

    update public.business_access_challenges
    set failed_attempts = v_attempts
    where token_hash = p_token_hash;

    return jsonb_build_object(
      'ok', false,
      'reason',
        case
          when v_attempts >= 5 then 'attempts_exceeded'
          else 'invalid_code'
        end,
      'attempts_remaining', greatest(0, 5 - v_attempts)
    );
  end if;

  update public.business_access_challenges
  set consumed_at = now()
  where token_hash = p_token_hash;

  return jsonb_build_object(
    'ok', true,
    'business_id', v_challenge.business_id,
    'slug', v_challenge.slug,
    'email', v_challenge.email
  );
end;
$$;

revoke all
on function public.validate_business_access_challenge(text, text)
from public;

revoke all
on function public.validate_business_access_challenge(text, text)
from anon;

revoke all
on function public.validate_business_access_challenge(text, text)
from authenticated;

grant execute
on function public.validate_business_access_challenge(text, text)
to service_role;


/* ============================================================
 * Verificación y activación atómica del trial
 * ============================================================
 */

create or replace function public.verify_trial_and_activate_atomic(
  p_slug text,
  p_code_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_business_id uuid;
  v_business_slug text;
  v_plan text;
  v_email_verified_at timestamptz;
  v_code_hash text;
  v_code_expires_at timestamptz;
  v_failed_attempts integer;
  v_now timestamptz;
  v_trial_ends_at timestamptz;
  v_attempts integer;
begin
  select
    id,
    slug,
    plan,
    email_verified_at,
    email_verification_code_hash,
    email_verification_expires_at,
    email_verification_failed_attempts
  into
    v_business_id,
    v_business_slug,
    v_plan,
    v_email_verified_at,
    v_code_hash,
    v_code_expires_at,
    v_failed_attempts
  from public.businesses
  where slug = p_slug
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'reason', 'not_found'
    );
  end if;

  if v_email_verified_at is not null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'already_verified'
    );
  end if;

  if v_code_hash is null
     or v_code_expires_at is null
     or v_code_expires_at <= now() then
    return jsonb_build_object(
      'ok', false,
      'reason', 'expired'
    );
  end if;

  if v_failed_attempts >= 5 then
    return jsonb_build_object(
      'ok', false,
      'reason', 'attempts_exceeded'
    );
  end if;

  if v_code_hash <> p_code_hash then
    v_attempts := least(v_failed_attempts + 1, 5);

    update public.businesses
    set email_verification_failed_attempts = v_attempts
    where id = v_business_id;

    return jsonb_build_object(
      'ok', false,
      'reason',
        case
          when v_attempts >= 5 then 'attempts_exceeded'
          else 'invalid_code'
        end,
      'attempts_remaining', greatest(0, 5 - v_attempts)
    );
  end if;

  v_now := now();
  v_trial_ends_at := v_now + interval '3 days';

  update public.businesses
  set
    status = 'trial',
    trial_started_at = v_now,
    trial_ends_at = v_trial_ends_at,
    email_verified_at = v_now,
    email_verification_code_hash = null,
    email_verification_expires_at = null,
    email_verification_failed_attempts = 0
  where id = v_business_id;

  insert into public.subscriptions (
    business_id,
    plan,
    billing_status,
    trial_started_at,
    trial_ends_at,
    current_period_starts_at,
    current_period_ends_at
  )
  values (
    v_business_id,
    coalesce(v_plan, 'ultra'),
    'trial',
    v_now,
    v_trial_ends_at,
    v_now,
    v_trial_ends_at
  )
  on conflict (business_id)
  do update
  set
    plan = excluded.plan,
    billing_status = excluded.billing_status,
    trial_started_at = excluded.trial_started_at,
    trial_ends_at = excluded.trial_ends_at,
    current_period_starts_at = excluded.current_period_starts_at,
    current_period_ends_at = excluded.current_period_ends_at;

  return jsonb_build_object(
    'ok', true,
    'business_id', v_business_id,
    'slug', v_business_slug,
    'trial_ends_at', v_trial_ends_at
  );
end;
$$;

revoke all
on function public.verify_trial_and_activate_atomic(text, text)
from public;

revoke all
on function public.verify_trial_and_activate_atomic(text, text)
from anon;

revoke all
on function public.verify_trial_and_activate_atomic(text, text)
from authenticated;

grant execute
on function public.verify_trial_and_activate_atomic(text, text)
to service_role;
