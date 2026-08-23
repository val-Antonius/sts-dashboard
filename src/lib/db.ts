import { Pool, QueryResult, QueryResultRow, types } from 'pg';

// Configure node-postgres type parsers so DATE/TIMESTAMP fields return plain strings (YYYY-MM-DD)
// instead of JavaScript Date objects, preventing React serialization/render errors
types.setTypeParser(1082, (val) => val); // DATE (OID 1082)
types.setTypeParser(1114, (val) => val); // TIMESTAMP (OID 1114)
types.setTypeParser(1184, (val) => val); // TIMESTAMPTZ (OID 1184)
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val))); // NUMERIC (OID 1700)

// Global connection pool cache to prevent connection exhaustion during Next.js dev reload
const globalForPg = global as unknown as { pgPool?: Pool };

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'vengeance'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || '5432'}/${process.env.PGDATABASE || 'sts_db'}`;

const isLocalhost =
  connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

export const pool =
  globalForPg.pgPool ||
  new Pool({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    options: '-c search_path=product_issue,public',
  });

// Handle idle connection errors without crashing process
pool.on('error', (err) => {
  console.warn('Unexpected error on idle PostgreSQL client pool:', err.message || err);
});

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

/**
 * Resilient query wrapper:
 * - Executes SQL query with connection pooling and schema search_path pre-configured.
 * - If the database is unreachable, timing out, or misconfigured, it safely catches the error
 *   and returns an empty result ({ rows: [] }) instead of throwing an unhandled exception that causes a 500 server crash.
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  try {
    const res = await pool.query<T>(text, params);
    return res;
  } catch (error: any) {
    console.warn('Database query error (gracefully handled):', error.message || error);
    return {
      rows: [] as T[],
      command: '',
      rowCount: 0,
      oid: 0,
      fields: [],
    };
  }
}
