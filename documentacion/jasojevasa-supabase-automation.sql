-- ============================================================
-- JasoJevasa - Supabase automation backup
-- Archivo documental de automatización interna
-- No contiene contraseñas, tokens ni claves privadas
-- ============================================================

-- Fecha de respaldo: 2026-06-08
-- Proyecto: JasoDatosPWA
-- Módulo: JasoJevasa
-- Canal de alertas: Telegram interno
-- Orquestador: n8n

-- ============================================================
-- 1. VISTAS DE AUTOMATIZACIÓN
-- ============================================================

-- Vista: public.automation_pending_new_prospects
-- Propósito:
-- Detecta prospectos nuevos pendientes de notificación interna.
-- Workflow n8n:
-- JasoJevasa - Nuevo prospecto alerta interna

-- Vista: public.automation_overdue_actions
-- Propósito:
-- Detecta prospectos con próxima acción vencida.
-- Workflow n8n:
-- JasoJevasa - Acción vencida alerta interna

-- Vista: public.automation_hot_prospects
-- Propósito:
-- Detecta prospectos interesados con temperatura comercial alta
-- y prioridad relevante.
-- Workflow n8n:
-- JasoJevasa - Prospecto caliente alerta interna

-- Vista: public.automation_converted_clients
-- Propósito:
-- Detecta prospectos convertidos en clientes.
-- Workflow n8n:
-- JasoJevasa - Cliente convertido alerta interna

-- Consulta de validación de vistas:
select
  schemaname,
  viewname,
  definition
from pg_views
where schemaname = 'public'
  and viewname in (
    'automation_pending_new_prospects',
    'automation_overdue_actions',
    'automation_hot_prospects',
    'automation_converted_clients'
  )
order by viewname;


-- ============================================================
-- 2. TABLAS DE AUTOMATIZACIÓN
-- ============================================================

-- Tabla: public.automation_logs
-- Propósito:
-- Registrar alertas procesadas por n8n y evitar duplicados mediante dedupe_key.

-- Tabla: public.prospect_events
-- Propósito:
-- Registrar eventos comerciales relevantes de los prospectos.

-- Tabla: public.prospects
-- Propósito:
-- Tabla principal de prospectos comerciales gestionados por JasoJevasa.
-- Incluye campos de automatización como:
-- automation_enabled
-- automation_status
-- last_automation_at
-- last_reminder_at
-- next_reminder_at
-- notification_count
-- last_notification_channel


-- ============================================================
-- 3. CONSULTA DE ESTRUCTURA DE TABLAS
-- ============================================================

select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'prospect_events',
    'automation_logs',
    'prospects'
  )
order by table_name, ordinal_position;


-- ============================================================
-- 4. TRIGGERS RELACIONADOS
-- ============================================================

select
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where trigger_schema = 'public'
  and event_object_table in ('prospects')
order by event_object_table, trigger_name;


-- ============================================================
-- 5. ÍNDICES RELACIONADOS
-- ============================================================

select
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'prospects',
    'prospect_events',
    'automation_logs'
  )
order by tablename, indexname;


-- ============================================================
-- 6. AUDITORÍA DE LOGS DE AUTOMATIZACIÓN
-- ============================================================

select
  id,
  workflow_name,
  event_type,
  channel,
  status,
  dedupe_key,
  prospect_id,
  business_id,
  processed_at,
  created_at
from public.automation_logs
order by created_at desc
limit 20;


-- ============================================================
-- 7. RESUMEN POR WORKFLOW
-- ============================================================

select
  workflow_name,
  event_type,
  channel,
  status,
  count(*) as total
from public.automation_logs
group by
  workflow_name,
  event_type,
  channel,
  status
order by workflow_name, status;


-- ============================================================
-- 8. PROSPECTOS PROCESADOS POR AUTOMATIZACIÓN
-- ============================================================

select
  business_name,
  pipeline_stage,
  lead_temperature,
  lead_priority,
  automation_enabled,
  automation_status,
  notification_count,
  last_notification_channel,
  last_automation_at,
  last_reminder_at,
  updated_at
from public.prospects
where notification_count > 0
order by updated_at desc
limit 20;


-- ============================================================
-- 9. DEDUPE KEYS USADAS
-- ============================================================

-- Nuevo prospecto:
-- new_prospect:<prospect_id>

-- Acción vencida:
-- overdue_action:<prospect_id>

-- Prospecto caliente:
-- hot_prospect:<prospect_id>:<pipeline_stage>

-- Cliente convertido:
-- converted_client:<converted_business_id>


-- ============================================================
-- 10. NOTA DE SEGURIDAD
-- ============================================================

-- Este archivo es documental.
-- No contiene passwords, tokens, service role keys ni connection strings.
-- Las credenciales reales se administran en Supabase, Vercel y n8n.