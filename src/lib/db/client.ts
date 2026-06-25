import { Pool, type QueryResult } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL environment variable is required");
  pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
  return pool;
}

export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const client = getPool();
  return client.query<T>(text, params);
}

export async function getOne<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await query<T>(text, params);
  return result.rows[0] ?? null;
}

export async function getMany<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await query<T>(text, params);
  return result.rows;
}
