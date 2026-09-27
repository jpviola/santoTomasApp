# StoTomas AI — Guía para agentes

Sistema de disputas escolásticas multi-agente (Next.js 15 App Router, React 19, Tailwind 4, Prisma + PostgreSQL, Supabase auth opcional, GraphDB opcional). Ver `README.md` para la arquitectura completa.

## Convenciones

- Camino principal: `HomePageClient` → `useDebateManager` → `POST /api/debate/process` (NDJSON streaming) → `runDebate` (orquestador) → `runScholasticDebate` (generación single-pass).
- Fuentes: el moderador propone artículos de la Summa; `retrieveSourcesForDebate` los combina con el corpus curado y `hydrateAquinasSources` baja el texto real (EN/ES/LA). Nunca mostrar como cita textual algo con `kind: "summary"`.
- Modo aprendizaje: `/learn` (layout con `LearnProvider`), contenido en `src/data/learning/{es,en}.ts` (deben tener la misma estructura), tutor en `POST /api/learn/tutor`.
- i18n manual con diccionarios inline (`t = language === "es" ? {...} : {...}`) y `src/data/content.json`. No hay librería de i18n.
- Estilos: Tailwind con variables CSS del tema en la forma `bg-[var(--surface)]`; mantener esa sintaxis por consistencia.
- Validación con Zod en `src/lib/schemas/`; errores tipados en `src/lib/utils/errors.ts`.
- La DB y GraphDB son opcionales en dev: el código debe degradar con gracia si no están configuradas.

## Comandos

- `npm run dev` / `npm run build` / `npm test` / `npm run lint`
- Tras cambiar `prisma/schema.prisma`: `npx prisma generate` (cliente) y `npx prisma db push` (DB).
