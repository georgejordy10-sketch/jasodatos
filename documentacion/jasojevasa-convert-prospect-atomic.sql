/*
 * JasoDatos / JasoJevasa
 * Conversión atómica de prospecto a cliente.
 *
 * Ejecutar en Supabase. La función queda disponible únicamente
 * para service_role y mantiene prospect, business y subscription
 * dentro de una sola transacción PostgreSQL.
 */

create or replace function public.admin_convert_prospect_atomic(
  p_prospect_id uuid,
  p_plan text,
  p_status text,
  p_slug_base text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_prospect public.prospects%rowtype;
  v_business public.businesses%rowtype;
  v_updated_prospect public.prospects%rowtype;

  v_plan text;
  v_slug_base text;
  v_slug text;
  v_suffix integer := 0;

  v_email text;
  v_whatsapp_digits text;
  v_whatsapp text;

  v_now timestamptz := now();
  v_trial_ends_at timestamptz;
  v_period_ends_at timestamptz;
begin
  if p_status not in ('active', 'trial') then
    return jsonb_build_object(
      'ok', false,
      'reason', 'invalid_status',
      'error', 'Estado inválido para la conversión.'
    );
  end if;

  select *
  into v_prospect
  from public.prospects
  where id = p_prospect_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'reason', 'not_found',
      'error', 'Prospecto no encontrado.'
    );
  end if;

  if v_prospect.converted_business_id is not null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'already_converted',
      'error', 'Este prospecto ya fue convertido en cliente.'
    );
  end if;

  if v_prospect.pipeline_stage in (
    'perdido',
    'no_contactar',
    'fuera_de_perfil'
  ) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'blocked_stage',
      'error',
      'Este prospecto no puede convertirse porque está perdido, fuera de perfil o marcado como no contactar.'
    );
  end if;

  if nullif(trim(coalesce(v_prospect.business_name, '')), '') is null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'missing_business_name',
      'error', 'El prospecto no tiene nombre de negocio.'
    );
  end if;

  v_plan :=
    case
      when p_plan in ('basic', 'pro', 'ultra') then p_plan
      when v_prospect.recommended_plan in ('basic', 'pro', 'ultra')
        then v_prospect.recommended_plan
      else 'basic'
    end;

  v_email := lower(nullif(trim(coalesce(v_prospect.email, '')), ''));

  v_whatsapp_digits :=
    regexp_replace(coalesce(v_prospect.whatsapp, ''), '[^0-9]', '', 'g');

  v_whatsapp :=
    case
      when v_whatsapp_digits = '' then null
      when v_whatsapp_digits like '593%' then v_whatsapp_digits
      when left(v_whatsapp_digits, 1) = '0'
           and length(v_whatsapp_digits) = 10
        then '593' || substring(v_whatsapp_digits from 2)
      else v_whatsapp_digits
    end;

  if v_email is not null
     and exists (
       select 1
       from public.businesses b
       where lower(b.commercial_email) = v_email
     ) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'duplicate_email',
      'error', 'Ya existe un cliente con este correo comercial.'
    );
  end if;

  if v_whatsapp is not null
     and exists (
       select 1
       from public.businesses b
       where b.commercial_whatsapp = v_whatsapp
     ) then
    return jsonb_build_object(
      'ok', false,
      'reason', 'duplicate_whatsapp',
      'error', 'Ya existe un cliente con este WhatsApp comercial.'
    );
  end if;

  v_slug_base :=
    coalesce(
      nullif(trim(p_slug_base), ''),
      'negocio'
    );

  v_slug := v_slug_base;

  while exists (
    select 1
    from public.businesses b
    where b.slug = v_slug
  ) loop
    v_suffix := v_suffix + 1;
    v_slug := left(v_slug_base, 52) || '-' || v_suffix::text;

    if v_suffix > 100 then
      v_slug :=
        left(v_slug_base, 45)
        || '-'
        || replace(gen_random_uuid()::text, '-', '');
      exit;
    end if;
  end loop;

  insert into public.businesses (
    business_name,
    slug,
    plan,
    status,
    owner_name,
    owner_email,
    owner_whatsapp,
    commercial_email,
    commercial_whatsapp,
    ciudad,
    provincia,
    pais,
    commercial_notes,
    signup_source
  )
  values (
    trim(v_prospect.business_name),
    v_slug,
    v_plan,
    p_status,
    coalesce(
      nullif(trim(coalesce(v_prospect.contact_name, '')), ''),
      trim(v_prospect.business_name)
    ),
    v_email,
    v_whatsapp,
    v_email,
    v_whatsapp,
    nullif(trim(coalesce(v_prospect.city, '')), ''),
    nullif(trim(coalesce(v_prospect.province, '')), ''),
    coalesce(
      nullif(trim(coalesce(v_prospect.country, '')), ''),
      'Ecuador'
    ),
    coalesce(
      nullif(trim(coalesce(v_prospect.notes, '')), ''),
      'Cliente convertido desde JasoJevasa.'
    ),
    'jasojevasa'
  )
  returning *
  into v_business;

  v_trial_ends_at :=
    case
      when p_status = 'trial'
        then v_now + interval '7 days'
      else null
    end;

  v_period_ends_at :=
    case
      when p_status = 'active'
        then v_now + interval '30 days'
      else null
    end;

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
    v_business.id,
    v_plan,
    case
      when p_status = 'active' then 'active'
      else 'trial'
    end,
    case
      when p_status = 'trial' then v_now
      else null
    end,
    v_trial_ends_at,
    case
      when p_status = 'active' then v_now
      else null
    end,
    v_period_ends_at
  );

  update public.prospects
  set
    pipeline_stage = 'convertido_cliente',
    converted_business_id = v_business.id,
    converted_at = v_now
  where id = p_prospect_id
  returning *
  into v_updated_prospect;

  return jsonb_build_object(
    'ok', true,
    'business', jsonb_build_object(
      'id', v_business.id,
      'slug', v_business.slug,
      'business_name', v_business.business_name,
      'plan', v_business.plan,
      'status', v_business.status
    ),
    'prospect', to_jsonb(v_updated_prospect)
  );
end;
$$;

revoke all
on function public.admin_convert_prospect_atomic(uuid, text, text, text)
from public;

revoke all
on function public.admin_convert_prospect_atomic(uuid, text, text, text)
from anon;

revoke all
on function public.admin_convert_prospect_atomic(uuid, text, text, text)
from authenticated;

grant execute
on function public.admin_convert_prospect_atomic(uuid, text, text, text)
to service_role;
