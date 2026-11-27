/*
 * JasoDatos
 * Hardening adicional detectado por Supabase Advisors.
 *
 * - Las vistas de automatización dejan de ejecutarse con privilegios
 *   del creador y quedan disponibles únicamente para service_role.
 * - Los triggers fijan search_path.
 * - Se agrega el índice faltante para business_memberships.user_id.
 */

alter view public.automation_overdue_actions
  set (security_invoker = true);

alter view public.automation_hot_prospects
  set (security_invoker = true);

alter view public.automation_converted_clients
  set (security_invoker = true);

alter view public.automation_pending_new_prospects
  set (security_invoker = true);

revoke all on public.automation_overdue_actions
  from public, anon, authenticated, service_role;

revoke all on public.automation_hot_prospects
  from public, anon, authenticated, service_role;

revoke all on public.automation_converted_clients
  from public, anon, authenticated, service_role;

revoke all on public.automation_pending_new_prospects
  from public, anon, authenticated, service_role;

grant select on public.automation_overdue_actions
  to service_role;

grant select on public.automation_hot_prospects
  to service_role;

grant select on public.automation_converted_clients
  to service_role;

grant select on public.automation_pending_new_prospects
  to service_role;

alter function public.set_updated_at()
  set search_path = public, pg_temp;

alter function public.log_prospect_commercial_events()
  set search_path = public, pg_temp;

create index if not exists business_memberships_user_id_idx
  on public.business_memberships (user_id);
