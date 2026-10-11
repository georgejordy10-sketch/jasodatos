/*
 * JasoDatos
 * Hardening atómico de estado, plan y facturación
 *
 * Objetivo:
 * Mantener sincronizadas las tablas:
 *
 *   public.businesses
 *   public.subscriptions
 *
 * Las operaciones administrativas de cambio de estado,
 * cambio de plan y renovación se ejecutan dentro de una
 * única transacción PostgreSQL.
 *
 * Las funciones están diseñadas para ser llamadas únicamente
 * por el backend de JasoDatos mediante SUPABASE_SERVICE_ROLE_KEY.
 *
 * Dependencia confirmada en producción:
 *
 *   subscriptions_business_id_key
 *
 * garantiza UNIQUE (business_id).
 */


/* ============================================================
 * 1. CAMBIO ATÓMICO DE ESTADO DEL NEGOCIO
 * ============================================================
 */

create or replace function public.admin_set_business_status_atomic(
  p_business_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan text;
  v_billing_status text;
begin
  if p_status not in (
    'active',
    'trial',
    'suspended',
    'inactive'
  ) then
    raise exception
      'Estado inválido: %',
      p_status;
  end if;

  /*
   * Bloqueamos la fila del negocio para serializar
   * operaciones administrativas concurrentes.
   */
  select plan
  into v_plan
  from public.businesses
  where id = p_business_id
  for update;

  if not found then
    raise exception
      'Negocio no encontrado: %',
      p_business_id;
  end if;

  v_billing_status :=
    case p_status
      when 'active' then 'active'
      when 'trial' then 'trial'
      when 'suspended' then 'past_due'
      when 'inactive' then 'canceled'
    end;

  update public.businesses
  set status = p_status
  where id = p_business_id;

  /*
   * business_id posee una restricción UNIQUE.
   * Si todavía no existe la suscripción, se crea.
   * Si ya existe, únicamente cambia billing_status.
   */
  insert into public.subscriptions (
    business_id,
    plan,
    billing_status
  )
  values (
    p_business_id,
    v_plan,
    v_billing_status
  )
  on conflict (business_id)
  do update
  set
    billing_status =
      excluded.billing_status;

  return jsonb_build_object(
    'ok',
      true,
    'status',
      p_status,
    'billing_status',
      v_billing_status
  );
end;
$$;


/* ============================================================
 * 2. CAMBIO / RENOVACIÓN ATÓMICA DE PLAN
 * ============================================================
 */

create or replace function public.admin_update_business_plan_atomic(
  p_business_id uuid,
  p_plan text,
  p_action text default 'change_plan'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing_billing_status text;
  v_existing_period_start timestamptz;
  v_existing_period_end timestamptz;

  v_now timestamptz;
  v_period_start timestamptz;
  v_period_end timestamptz;

  v_can_extend boolean := false;
begin
  if p_plan not in (
    'basic',
    'pro',
    'ultra'
  ) then
    raise exception
      'Plan inválido: %',
      p_plan;
  end if;

  if p_action not in (
    'change_plan',
    'renew'
  ) then
    raise exception
      'Acción inválida: %',
      p_action;
  end if;

  /*
   * Todas las operaciones administrativas del mismo
   * negocio se serializan sobre esta fila.
   */
  perform 1
  from public.businesses
  where id = p_business_id
  for update;

  if not found then
    raise exception
      'Negocio no encontrado: %',
      p_business_id;
  end if;


  /* ----------------------------------------------------------
   * CAMBIO DE PLAN
   * ----------------------------------------------------------
   *
   * No modifica el estado comercial ni la vigencia.
   * Solo sincroniza el plan entre businesses y subscriptions.
   */

  if p_action = 'change_plan' then
    update public.businesses
    set plan = p_plan
    where id = p_business_id;

    insert into public.subscriptions (
      business_id,
      plan,
      billing_status
    )
    values (
      p_business_id,
      p_plan,
      'manual'
    )
    on conflict (business_id)
    do update
    set
      plan =
        excluded.plan;

    return jsonb_build_object(
      'ok',
        true,
      'action',
        'change_plan',
      'plan',
        p_plan
    );
  end if;


  /* ----------------------------------------------------------
   * RENOVACIÓN
   * ----------------------------------------------------------
   */

  v_now :=
    now();

  select
    billing_status,
    current_period_starts_at,
    current_period_ends_at
  into
    v_existing_billing_status,
    v_existing_period_start,
    v_existing_period_end
  from public.subscriptions
  where business_id =
    p_business_id;

  /*
   * Si existe un período pagado activo y todavía vigente,
   * los 30 días nuevos se agregan al final de ese período.
   *
   * De esta forma una renovación anticipada no elimina
   * los días que el cliente todavía tenía disponibles.
   */
  v_can_extend :=
    v_existing_billing_status = 'active'
    and v_existing_period_end is not null
    and v_existing_period_end > v_now;

  if v_can_extend then
    v_period_end :=
      v_existing_period_end
      + interval '30 days';

    v_period_start :=
      coalesce(
        v_existing_period_start,
        v_now
      );
  else
    /*
     * Primera renovación, prueba gratuita,
     * período vencido o facturación no activa:
     * el nuevo período empieza ahora.
     */
    v_period_start :=
      v_now;

    v_period_end :=
      v_now
      + interval '30 days';
  end if;

  update public.businesses
  set
    plan = p_plan,
    status = 'active'
  where id =
    p_business_id;

  insert into public.subscriptions (
    business_id,
    plan,
    billing_status,
    trial_ends_at,
    current_period_starts_at,
    current_period_ends_at
  )
  values (
    p_business_id,
    p_plan,
    'active',
    null,
    v_period_start,
    v_period_end
  )
  on conflict (business_id)
  do update
  set
    plan =
      excluded.plan,
    billing_status =
      excluded.billing_status,
    trial_ends_at =
      null,
    current_period_starts_at =
      excluded.current_period_starts_at,
    current_period_ends_at =
      excluded.current_period_ends_at;

  return jsonb_build_object(
    'ok',
      true,
    'action',
      'renew',
    'plan',
      p_plan,
    'status',
      'active',
    'billing_status',
      'active',
    'current_period_starts_at',
      v_period_start,
    'current_period_ends_at',
      v_period_end,
    'extended_existing_period',
      v_can_extend
  );
end;
$$;


/* ============================================================
 * 3. PERMISOS
 * ============================================================
 *
 * Los RPC administrativos no deben ser ejecutables directamente
 * por usuarios anónimos ni por usuarios autenticados.
 */

revoke all
on function public.admin_set_business_status_atomic(
  uuid,
  text
)
from public;

revoke all
on function public.admin_set_business_status_atomic(
  uuid,
  text
)
from anon;

revoke all
on function public.admin_set_business_status_atomic(
  uuid,
  text
)
from authenticated;

grant execute
on function public.admin_set_business_status_atomic(
  uuid,
  text
)
to service_role;


revoke all
on function public.admin_update_business_plan_atomic(
  uuid,
  text,
  text
)
from public;

revoke all
on function public.admin_update_business_plan_atomic(
  uuid,
  text,
  text
)
from anon;

revoke all
on function public.admin_update_business_plan_atomic(
  uuid,
  text,
  text
)
from authenticated;

grant execute
on function public.admin_update_business_plan_atomic(
  uuid,
  text,
  text
)
to service_role;


/* ============================================================
 * 4. VERIFICACIÓN
 * ============================================================
 *
 * Debe devolver exactamente dos funciones.
 */

select
  p.proname as function_name,
  pg_get_function_identity_arguments(
    p.oid
  ) as arguments
from pg_proc p
join pg_namespace n
  on n.oid =
    p.pronamespace
where n.nspname =
  'public'
  and p.proname in (
    'admin_set_business_status_atomic',
    'admin_update_business_plan_atomic'
  )
order by
  p.proname;


/*
 * Debe devolver cero filas.
 */

select
  business_id,
  count(*) as cantidad
from public.subscriptions
group by
  business_id
having count(*) > 1;