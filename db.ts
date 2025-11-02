import { Pool, QueryResult, QueryResultRow } from 'pg';

// Mock query function for testing (can be set externally)
let mockQueryFn: ((text: string, params?: any[]) => Promise<QueryResult<any>>) | null = null;

export function setMockQuery(fn: ((text: string, params?: any[]) => Promise<QueryResult<any>>) | null) {
  mockQueryFn = fn;
}

// Database configuration from environment variables
// Supports both connection string (DATABASE_URL) and individual components
const DATABASE_URL = process.env.DATABASE_URL;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_NAME = process.env.DB_NAME || 'terrence';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);

// Create connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    // Use connection string if provided (Supabase/cloud), otherwise use individual components
    if (DATABASE_URL) {
      pool = new Pool({
        connectionString: DATABASE_URL,
        // Supabase requires SSL
        ssl: DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    } else {
      pool = new Pool({
        host: DB_HOST,
        database: DB_NAME,
        user: DB_USER,
        password: DB_PASSWORD,
        port: DB_PORT,
        // Enable SSL if connecting to Supabase host
        ssl: DB_HOST.includes('supabase') ? { rejectUnauthorized: false } : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }
  }
  return pool;
}

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  // Use mock if set (for testing)
  if (mockQueryFn) {
    return mockQueryFn(text, params) as Promise<QueryResult<T>>;
  }
  
  const dbPool = getPool();
  return dbPool.query<T>(text, params);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

