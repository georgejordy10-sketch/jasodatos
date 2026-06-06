\# Documento técnico corto — JasoJevasa



\## 1. Propósito del módulo



JasoJevasa es el módulo interno de captación, seguimiento y conversión comercial de JasoDatos.



Su objetivo es ayudar a controlar prospectos comerciales desde su creación hasta su posible conversión en cliente, permitiendo registrar estados, prioridades, responsables, próximas acciones y alertas internas de seguimiento.



JasoJevasa no es el producto vendido al cliente final. El producto comercial es JasoDatos. JasoJevasa funciona como motor interno de gestión comercial.



\---



\## 2. Separación conceptual



\- \*\*JasoDatos:\*\* producto SaaS para análisis comercial, carga de datos, dashboards, KPIs y recomendaciones.

\- \*\*JasoJevasa:\*\* módulo interno para gestionar prospectos, seguimiento comercial y conversión a clientes.

\- \*\*JasoAlix:\*\* asistente que explica recomendaciones o acciones comerciales generadas por el sistema.



\---



\## 3. Arquitectura general



El módulo opera con la siguiente arquitectura:



```txt

JasoJevasa en PWA

↓

Supabase

↓

Vistas SQL de automatización

↓

n8n

↓

Telegram interno

↓

automation\_logs

↓

Actualización de prospects

