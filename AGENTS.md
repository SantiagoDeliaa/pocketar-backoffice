# AGENTS.md — pocketar-backoffice

Instrucciones para cualquier agente que trabaje en este repositorio.
Este repo es **sólo el front y el server del panel de administración**.

---

## Invariantes duros

1. **Vocabulario legal.** Nunca *subasta* ni *remate*, en ningún string, comentario ni
   documento. Aprobado: *puja, oferta, lote, publicación, cierre*. Es una restricción legal
   (Ley 20.266), no una preferencia de estilo. Aplica con más fuerza a los textos de
   `staff.motivos_rechazo`, porque **los lee el vendedor**.
2. **Idioma.** Todo el código, los comentarios y los textos de producto en **español
   argentino, voseo**. Este archivo está en inglés a propósito, igual que en `PocketarApp`.
3. **Acá no hay migraciones.** El esquema completo de la base se versiona en `C:\PocketarApp`
   (D-12 + D-57). Si tu tarea necesita una tabla, una columna o una RPC, se escribe **allá**.
   Un archivo `.sql` de migración en este repo es un error.
4. **El `service_role` nunca sale del server** (D-59). `lib/supabase/admin.ts` no se importa
   jamás desde un Componente de Cliente. Ninguna variable con la clave lleva el prefijo
   `NEXT_PUBLIC_`.
5. **Ninguna escritura directa sobre una tabla de negocio** (D-58). Toda mutación es una
   llamada a una RPC `staff.fn_*`, que muta y audita en la misma transacción. Un
   `.update()`, `.insert()` o `.delete()` sobre `auctions`, `users`, `reports` o cualquier
   tabla de `public` es un error de revisión, no una decisión de estilo.
6. **Las tres barreras** (spec §3.3) se mantienen las tres: middleware, revalidación en la
   Server Action con `exigirStaff()`, y `staff.es_staff()` adentro de la RPC. No se saltea
   ninguna "porque la anterior ya chequeó".
7. **No inventar rutas, tablas, columnas ni decisiones.** Lo que el spec no resuelve se
   registra como decisión abierta y se sube. No se supone.

---

## Fuentes de verdad

Precedencia, de mayor a menor:

| # | Fuente | Dónde |
|---|---|---|
| 1 | Product Spec | `C:\PocketarApp\docs\referencias\originales\spec-producto-full.md` |
| 2 | Spec del backoffice y Fase 7 | `C:\PocketarApp\docs\backoffice-arquitectura-y-plan.md` |
| 3 | Master Plan | `C:\PocketarApp\docs\plan-iteracion-app.md` §8, Fase 7 |
| 4 | Convenciones | el código de este repo |

El kit visual de la app (`app_kit/APP-IDENTITY.md`) orienta los tokens de color y tipografía.
**No es requisito de producto acá**: esto es una herramienta interna y prioriza densidad de
información y velocidad de operación por encima del pulido visual.

---

## Estructura

```
app/            Rutas (App Router). Server Components por defecto.
  login/        Única ruta pública, junto con /auth
lib/staff.ts    exigirStaff() — la segunda barrera
lib/supabase/
  server.ts     Cliente con la sesión del staff. El de uso normal
  admin.ts      service_role. Lecturas privilegiadas, Auth Admin API, borrado de imágenes y envío externo posterior a una RPC exitosa
middleware.ts   Primera barrera
```

---

## Estado actual

**Bloque 3 implementado localmente, sin commit ni despliegue.** Existen inicio operativo, cola de
revisión, detalle con asignación, resolución y listado de publicaciones activas. Las lecturas
privilegiadas están en `lib/datos/revision.ts`; el catálogo de motivos y nombres de revisores se
obtiene mediante el wrapper público de sesión. Las mutaciones siguen pasando sólo por RPC.

**Requiere los contratos de Bloque 1 y Prompt 1 en el entorno objetivo.** El login y las pantallas
requieren el claim `pocketar_staff`, `fn_staff_sesion_activa()` y
`fn_staff_catalogo_revision()`; si esos contratos no están disponibles, el acceso o el rechazo
quedan cerrados de forma segura.

---

## Validación antes de cerrar una tarea

- `npm run typecheck` en verde.
- `npm run build` en verde.
- Revisión de que no se agregó ninguna escritura directa a tabla de negocio.
- Revisión de que `admin.ts` no quedó importado desde un Componente de Cliente.
