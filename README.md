# Pocketar · Backoffice

Panel de administración de Pocketar. Es el tercero de los tres repositorios del proyecto:

| Repositorio | Contiene |
|---|---|
| `Pocketar` | Landing |
| `PocketarApp` | App mobile Expo **y el esquema completo de la base** |
| `pocketar-backoffice` | **Este.** Front y server del panel. Sin migraciones |

La especificación vive en `PocketarApp/docs/backoffice-arquitectura-y-plan.md`.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # completar las dos claves
npm run dev
```

La clave `SUPABASE_SERVICE_ROLE_KEY` no se commitea nunca y no se comparte por chat: se carga
a mano en `.env.local` y en las variables de entorno del proyecto de Vercel.

## Estado

Scaffold: login, middleware de staff y capa de acceso a Supabase.

**Nadie puede entrar todavía**, y está bien: el claim `pocketar_staff` lo emite un Auth Hook
que se crea en el Bloque 1 de la Fase 7, en el repositorio `PocketarApp`. Hasta entonces el
login rechaza toda cuenta.

## Despliegue

Proyecto de Vercel propio, dentro de la misma cuenta donde vive la landing. Framework Next.js,
root directory la raíz del repo. Las tres variables de `.env.example` se cargan en el proyecto.
