import { sql } from "@/lib/db";

export type AuditLogItem = {
  id: number;
  username: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  detail: string | null;
  created_at: Date;
};

type AuditPayload = {
  username: string;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  summary: string;
  detail?: string | null;
};

type Queryable = {
  query: (query: string, params?: unknown[]) => Promise<unknown>;
};

export async function ensureAuditSchema() {
  await sql(`
    CREATE TABLE IF NOT EXISTS auditoria (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NULL,
      summary TEXT NOT NULL,
      detail TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function execute(queryable: Queryable | undefined, query: string, params: unknown[]) {
  if (queryable) {
    await queryable.query(query, params);
    return;
  }

  await sql(query, params);
}

export async function logAudit(payload: AuditPayload, queryable?: Queryable) {
  await ensureAuditSchema();
  await execute(
    queryable,
    `
      INSERT INTO auditoria (username, action, entity_type, entity_id, summary, detail)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [
      payload.username,
      payload.action,
      payload.entityType,
      payload.entityId == null ? null : String(payload.entityId),
      payload.summary,
      payload.detail ?? null
    ]
  );
}

export async function getRecentAuditLogs(limit = 20) {
  await ensureAuditSchema();
  const { rows } = await sql<AuditLogItem>(
    `
      SELECT id, username, action, entity_type, entity_id, summary, detail, created_at
      FROM auditoria
      ORDER BY created_at DESC, id DESC
      LIMIT $1
    `,
    [limit]
  );

  return rows;
}

export async function getAuditLogs({
  page = 1,
  limit = 20,
  username = "",
  action = "",
  entityType = "",
  fechaDesde = "",
  fechaHasta = ""
}: {
  page?: number;
  limit?: number;
  username?: string;
  action?: string;
  entityType?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  await ensureAuditSchema();
  const offset = Math.max(page - 1, 0) * limit;
  const params = [
    username.trim(),
    action.trim(),
    entityType.trim(),
    fechaDesde.trim(),
    fechaHasta.trim(),
    limit + 1,
    offset
  ];
  const { rows } = await sql<AuditLogItem>(
    `
      SELECT id, username, action, entity_type, entity_id, summary, detail, created_at
      FROM auditoria
      WHERE ($1 = '' OR username ILIKE '%' || $1 || '%')
        AND ($2 = '' OR action = $2)
        AND ($3 = '' OR entity_type = $3)
        AND ($4 = '' OR DATE(created_at) >= $4::date)
        AND ($5 = '' OR DATE(created_at) <= $5::date)
      ORDER BY created_at DESC, id DESC
      LIMIT $6 OFFSET $7
    `,
    params
  );

  return {
    items: rows.slice(0, limit),
    hasNext: rows.length > limit
  };
}
