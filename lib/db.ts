import { Pool, type QueryResultRow } from "pg";

declare global {
  var __servicellPool: Pool | undefined;
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

export function getPool() {
  if (!global.__servicellPool) {
    const connectionString = getDatabaseUrl();
    global.__servicellPool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost")
        ? false
        : { rejectUnauthorized: false }
    });
  }

  return global.__servicellPool;
}

export async function sql<T extends QueryResultRow = Record<string, unknown>>(
  query: string,
  params: unknown[] = []
) {
  return getPool().query<T>(query, params);
}
