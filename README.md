# Agenda de sustentaciones EPG

Monorepo pnpm con frontend React/Vite y backend Fastify. La aplicación ya no depende de Supabase: los datos viven en PostgreSQL y los archivos se almacenan en Cloudflare R2 mediante URLs firmadas.

## Desarrollo

```bash
pnpm install
pnpm dev
```

Consulta `apps/api/.env.example` para configurar PostgreSQL y R2.

## Docker

```bash
copy .env.example .env
docker compose up --build
```

La interfaz estará disponible en `http://localhost:8081` y la API en `http://localhost:8787`. Para detener los servicios:

```bash
docker compose down
```

Para eliminar también los datos locales de PostgreSQL:

```bash
docker compose down -v
```

## Estructura

- `apps/web`: frontend migrado desde la aplicación original, conservando sus pantallas, estilos y rutas.
- `apps/api`: API Fastify con JWT, PostgreSQL y URLs firmadas para Cloudflare R2.
- `apps/api/db/schema.sql`: esquema inicial independiente de Supabase.

El directorio `apps/web/supabase` se conserva únicamente como referencia histórica de la migración; no se instala ni se ejecuta ninguna dependencia de Supabase. El adaptador en `apps/web/src/lib/supabase.ts` mantiene temporalmente la interfaz que usan los servicios existentes, pero delega las operaciones a `VITE_API_URL`.
