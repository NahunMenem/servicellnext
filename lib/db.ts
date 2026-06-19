import { Pool, types, type QueryResultRow } from "pg";

declare global {
  var __servicellPool: Pool | undefined;
  var __servicellPoolKey: string | undefined;
  var __servicellPgTypesConfigured: boolean | undefined;
}

const PG_TIMESTAMP_OID = 1114;
const ARGENTINA_OFFSET = "-03:00";
const DEFAULT_SCHEMA = "public";

function configurePgTypes() {
  if (global.__servicellPgTypesConfigured) {
    return;
  }

  types.setTypeParser(PG_TIMESTAMP_OID, (value) => {
    if (!value) return value;
    return new Date(String(value).replace(" ", "T") + ARGENTINA_OFFSET);
  });

  global.__servicellPgTypesConfigured = true;
}

function getDatabaseUrl() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL no esta configurada. Crea .env.local basado en .env.example y reinicia Next."
    );
  }
  return connectionString;
}

function getDatabaseSchema() {
  const schema = process.env.DB_SCHEMA?.trim() || DEFAULT_SCHEMA;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error(
      "DB_SCHEMA invalido. Usa solo letras, numeros y guion bajo, por ejemplo: alejandro_vega."
    );
  }
  return schema;
}

function buildPgOptions(schema: string) {
  return `-c timezone=America/Argentina/Buenos_Aires -c search_path=${schema},public`;
}

export function getPool() {
  configurePgTypes();

  const connectionString = getDatabaseUrl();
  const schema = getDatabaseSchema();
  const poolKey = `${connectionString}|${schema}`;

  if (!global.__servicellPool || global.__servicellPoolKey !== poolKey) {
    global.__servicellPool = new Pool({
      connectionString,
      options: buildPgOptions(schema),
      ssl: connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false }
    });
    global.__servicellPoolKey = poolKey;
  }

  return global.__servicellPool;
}

export async function sql<T extends QueryResultRow = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
) {
  return getPool().query<T>(query, params);
}
