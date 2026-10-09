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

## Producción en Dokploy

1. Crear un servicio **Docker Compose** conectado a este repositorio. Usar
   `docker-compose.prod.yml` como Compose Path, con la raíz del repositorio como
   contexto. Seleccionar Docker Compose, no Docker Stack.
2. Copiar el contenido del `.env` de la raíz en **Environment** de Dokploy.
   El archivo local contiene secretos generados y está ignorado por Git;
   `.env.prod.example` sirve como plantilla para otras instalaciones.
   Sustituir `agenda.example.com` y `api-agenda.example.com` por los dominios reales.
3. En **Domains**, asignar el dominio web al servicio `web`, puerto `80`, y
   el dominio de la API al servicio `api`, puerto `8787`. En ambos casos usar
   ruta `/` y HTTPS. Dokploy genera las etiquetas de Traefik.
4. Usar subdominios del mismo dominio base (por ejemplo, `agenda.midominio.com`
   y `api-agenda.midominio.com`): la sesión actual usa cookies `SameSite=Lax`.
   `WEB_ORIGIN` debe coincidir con el origen HTTPS de la web, sin barra final;
   `VITE_API_URL` debe ser la URL HTTPS de la API, sin añadir `/api` ni barra final.
5. Desplegar. Al cambiar `VITE_API_URL`, reconstruir la web: Vite incorpora esa
   variable durante la compilación. No incluir contraseñas en variables `VITE_*`.

Los Dockerfiles de producción están en `apps/api/Dockerfile.prod` y
`apps/web/Dockerfile.prod`. Usan Corepack y el pnpm fijado en `package.json`,
con instalaciones `--frozen-lockfile` basadas en el lockfile de la raíz.
La API ejecuta Node como usuario sin privilegios y la web sirve la SPA con Nginx.

La red externa `dokploy-network` debe existir en el servidor de Dokploy.
Web y API se conectan a ella; la API y PostgreSQL comparten además la red privada
`backend`. No se publican puertos del host. Esta configuración usa la red normal
de Dokploy; dejar desactivada la opción **Isolated Deployments**.

PostgreSQL guarda sus datos en `postgres_data` y ejecuta los SQL de
`apps/api/db` solo cuando el volumen está vacío. En una base ya inicializada,
cambiar variables o scripts no cambia las credenciales ni aplica migraciones.
Las variables R2 pueden quedar vacías para arrancar; para subir archivos se
necesitan las credenciales, el bucket y la URL pública, además de permitir el
origen web en el CORS del bucket de Cloudflare R2.

Validación de la configuración y arranque manual en un servidor con esa red:

```bash
docker compose --env-file .env -f docker-compose.prod.yml config --quiet
docker compose --env-file .env -f docker-compose.prod.yml up -d --build
```

## Estructura

- `apps/web`: frontend migrado desde la aplicación original, conservando sus pantallas, estilos y rutas.
- `apps/api`: API Fastify con JWT, PostgreSQL y URLs firmadas para Cloudflare R2.
- `apps/api/db/schema.sql`: esquema inicial independiente de Supabase.

El directorio `apps/web/supabase` se conserva únicamente como referencia histórica de la migración; no se instala ni se ejecuta ninguna dependencia de Supabase. El adaptador en `apps/web/src/lib/supabase.ts` mantiene temporalmente la interfaz que usan los servicios existentes, pero delega las operaciones a `VITE_API_URL`.
