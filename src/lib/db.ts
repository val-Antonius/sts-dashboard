import { Pool, QueryResult, QueryResultRow } from 'pg';

// Global connection pool cache to prevent connection exhaustion in Next.js dev reload
const globalForPg = global as unknown as { pgPool?: Pool };

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'vengeance'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'sts_db'}`;

export const pool =
  globalForPg.pgPool ||
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    // Set default search path to product_issue
    await client.query('SET search_path TO product_issue, public');
    const res = await client.query<T>(text, params);
    return res;
  } finally {
    client.release();
  }
}
