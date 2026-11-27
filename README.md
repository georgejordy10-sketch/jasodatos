# JasoDatos

JasoDatos es una aplicación web de inteligencia de negocios orientada a micro y pequeñas empresas. Convierte archivos comerciales de ventas e inventario en indicadores, comparativos, alertas y acciones explicables para apoyar la toma de decisiones.

## Stack

- Next.js 16
- React 19
- TypeScript
- Supabase
- Recharts
- SheetJS para lectura de archivos Excel
- ExcelJS Community para exportaciones
- jsPDF / html2canvas
- Papa Parse
- Vercel

## Estructura principal

- `src/app`: páginas, rutas API y endpoints públicos/administrativos.
- `src/core`: ingestión, perfiles, mapeo, normalización y lógica comercial.
- `src/features/upload`: flujo de carga, calidad, historial y persistencia local.
- `src/features/dashboard`: dashboard comercial, KPIs, gráficos, exportaciones y comparativos.
- `src/features/admin`: administración de negocios/clientes.
- `src/features/jasojevasa`: gestión comercial de prospectos.
- `src/lib`: autenticación, sesiones, Supabase y utilidades de seguridad.
- `documentacion`: SQL de hardening, documentación técnica y workflows relacionados.

## Variables de entorno

Crear un archivo local `.env.local`. Los archivos `.env*` están excluidos de Git.

Variables utilizadas por la aplicación:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAILS=
BUSINESS_ACCESS_SESSION_SECRET=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

### Reglas de seguridad

- `SUPABASE_SERVICE_ROLE_KEY` es exclusivamente server-side.
- `BUSINESS_ACCESS_SESSION_SECRET` debe tener al menos 32 bytes y no debe compartirse.
- Nunca versionar credenciales, tokens ni archivos `.env`.
- Los endpoints `/api/admin/*` requieren autenticación administrativa.
- Los accesos de negocio usan cookies HttpOnly firmadas y, tras aplicar las migraciones de hardening, challenges server-side.
- Los endpoints públicos sensibles incorporan rate limiting respaldado por Supabase tras aplicar la migración correspondiente.

## Desarrollo

Requisitos:

- Node.js 22 o superior
- npm

Instalación:

```bash
npm ci
npm run dev
```

La aplicación queda disponible normalmente en:

```text
http://localhost:3000
```

## Validación antes de integrar cambios

El Pull Request debe superar el workflow `Code quality`, que ejecuta:

```bash
npm ci
npm audit --omit=dev --audit-level=high
npm run lint
npx tsc --noEmit
npm run build
```

No se deben integrar cambios a `main` si alguno de estos pasos falla.

## Archivos de entrada

Formatos admitidos:

- CSV
- XLSX
- XLS

Protecciones actuales:

- tamaño máximo: 25 MB;
- máximo: 200.000 filas;
- validación y mapeo de columnas;
- reporte de calidad antes de procesar;
- consentimiento de procesamiento de datos;
- persistencia local de la sesión de análisis;
- historial sincronizable con Supabase para negocios autenticados.

## Seguridad de administración

Las rutas administrativas utilizan dos capas:

1. protección central mediante `src/proxy.ts`;
2. verificación server-side mediante `requireAdmin()` en las rutas sensibles.

Las operaciones de estado/plan usan RPC PostgreSQL atómicos. JasoJevasa dispone además de una migración para convertir prospectos a clientes dentro de una sola transacción.

## Migraciones de hardening

Los scripts de seguridad se encuentran en `documentacion/`.

Orden recomendado:

1. `admin-atomic-billing-hardening.sql`
2. `business-access-challenge-hardening.sql`
3. `public-api-rate-limit-hardening.sql`
4. `jasojevasa-convert-prospect-atomic.sql`
5. `supabase-security-advisor-hardening.sql`

Después de aplicar las migraciones deben verificarse:

- funciones RPC disponibles;
- permisos restringidos a `service_role`;
- RLS habilitado en tablas de challenges/rate limits;
- unicidad de `subscriptions.business_id`;
- ausencia de duplicados por negocio en suscripciones.

## Despliegue

Producción se despliega en Vercel. Las variables de entorno deben configurarse desde el entorno seguro del proyecto y no en el repositorio.

Antes de desplegar:

1. CI en verde.
2. Migraciones de Supabase aplicadas.
3. Variables de entorno completas.
4. Prueba manual de registro, recuperación, carga CSV/XLSX, dashboard, exportación y administración.

## Principios de producto

JasoDatos prioriza analítica explicable y reglas de negocio trazables. Los análisis comerciales se apoyan en indicadores como ventas, margen, stock, rotación, ABC/Pareto, variaciones y alertas determinísticas, evitando introducir modelos opacos donde no aporten valor.
