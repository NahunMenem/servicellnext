# Servicell Next

Migracion del sistema original en Flask a una base moderna en Next.js App Router.

## Incluye

- Login por cookie usando la tabla `usuarios`
- Dashboard con ventas, egresos, costo, ganancia y stock
- Registro de ventas con carrito y pago dividido
- Gestion de productos y stock
- Caja por medios de pago
- Egresos
- Reparaciones con orden, estados, comprobante y firma
- Mercaderia fallada
- Reportes de ultimas ventas, productos mas vendidos y productos por agotarse
- Exportacion a Excel
- Integracion externa para facturacion via `FACTURADOR_URL`

## Variables de entorno

Copiar `.env.example` a `.env.local` y completar:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/servicell
DB_SCHEMA=public
SESSION_SECRET=change-this-secret
FACTURADOR_URL=
MONITOREO_API_URL=
MONITOREO_API_TOKEN=
MONITOREO_CONSULTAS_PATH=/monitoreo/consultas
MONITOREO_MEDICOS_PATH=/monitoreo/medicos
NEXT_PUBLIC_APP_NAME=Servicell
```

## Base de datos

El archivo [db/schema.sql](/c:/Users/turko/Downloads/servicellrailway-main/servicellrailway-main/db/schema.sql) contiene la estructura esperada.

## Desarrollo

```bash
npm install
npm run dev
```

## Produccion

```bash
npm run build
npm run start
```

## Deploy En Railway

1. Subir este repo a GitHub.
2. Crear un proyecto nuevo en Railway y conectar el repositorio.
3. Agregar un servicio PostgreSQL dentro del proyecto.
4. Configurar variables de entorno en el servicio web:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_SCHEMA=public
SESSION_SECRET=una-clave-larga-y-segura
FACTURADOR_URL=
NEXT_PUBLIC_APP_NAME=Servicell
```

5. Cargar la estructura de base usando `db/schema.sql` o restaurar una base existente.
6. Deployar. Railway va a usar `railway.toml` para correr `npm run start`.

## Segundo Cliente En La Misma Base

Para crear otra instancia del sistema usando la misma base PostgreSQL, crear primero las mismas tablas dentro de otro schema. Ejemplo: `alejandro_vega`.

En el servicio Railway de Alejandro Vega usar las mismas variables, cambiando estas dos:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
DB_SCHEMA=alejandro_vega
NEXT_PUBLIC_APP_NAME=Alejandro Vega
SESSION_SECRET=otra-clave-larga-y-segura
```

El sistema consulta tablas sin prefijo, pero PostgreSQL usa `DB_SCHEMA` como `search_path`. Asi Servicell puede seguir en `public` y Alejandro Vega en `alejandro_vega` sin mezclar ventas, stock, reparaciones ni caja.

## Nota

La carpeta y archivos de Flask se dejaron intactos para facilitar comparacion y migracion gradual.
