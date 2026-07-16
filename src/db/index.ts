import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.ts';

let globalForceNoSsl = false;

export interface QueryLogEntry {
  timestamp: string;
  query: string;
  params?: any[];
  duration: number;
  status: 'SUCCESS' | 'FAILED';
  error?: string;
}

export const queryHistory: QueryLogEntry[] = [];

export const addQueryLog = (query: string, params: any[] | undefined, duration: number, status: 'SUCCESS' | 'FAILED', error?: string) => {
  queryHistory.unshift({
    timestamp: new Date().toISOString(),
    query,
    params,
    duration,
    status,
    error
  });
  if (queryHistory.length > 50) {
    queryHistory.pop();
  }
};

/**
 * Utility helper function to manage the PostgreSQL database connection string.
 * This function automatically appends or updates the `sslmode=require` parameter
 * inside the connection string to ensure all database queries use an encrypted connection.
 * 
 * @param connString The input PostgreSQL connection string
 * @param forceNoSsl Optional flag to force disable SSL (defaults to false)
 * @returns The secured connection string with the correct sslmode parameter
 */
export const enforceSslConnectionString = (connString: string, forceNoSsl = false): string => {
  if (!connString) return connString;

  const targetMode = forceNoSsl ? 'disable' : 'require';
  try {
    const isPostgresql = connString.startsWith('postgresql://');
    const isPostgres = connString.startsWith('postgres://');
    if (isPostgresql || isPostgres) {
      const protocol = isPostgresql ? 'postgresql://' : 'postgres://';
      const cleanedUrl = connString.replace(protocol, 'http://');
      const parsedUrl = new URL(cleanedUrl);
      parsedUrl.searchParams.set('sslmode', targetMode);
      return parsedUrl.toString().replace('http://', protocol);
    } else {
      const urlObj = new URL(connString);
      urlObj.searchParams.set('sslmode', targetMode);
      return urlObj.toString();
    }
  } catch (e) {
    if (connString.includes('sslmode=')) {
      return connString.replace(/sslmode=[^&]+/g, `sslmode=${targetMode}`);
    } else {
      const separator = connString.includes('?') ? '&' : '?';
      return `${connString}${separator}sslmode=${targetMode}`;
    }
  }
};

export const createPool = (forceNoSsl = false) => {
  let connectionString = process.env.CUSTOM_SQL_URL;
  let host = process.env.CUSTOM_SQL_HOST;
  const portStr = process.env.CUSTOM_SQL_PORT;
  let port = portStr ? parseInt(portStr, 10) : 5432;

  // Matikan fallback ke Cloud SQL bawaan: jika tidak ada konfigurasi kustom, buat dummy pool
  if (!connectionString && !host) {
    console.log('[Database] PostgreSQL kustom tidak dikonfigurasi. Koneksi ke Cloud SQL bawaan dinonaktifkan.');
    return new Pool({
      host: 'localhost',
      port: 9999,
      user: 'disabled',
      password: 'disabled',
      database: 'disabled',
      max: 1,
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 1000
    });
  }

  // 1. Initial parse of connection string to find host/port
  if (connectionString) {
    try {
      const isPostgresql = connectionString.startsWith('postgresql://');
      const isPostgres = connectionString.startsWith('postgres://');
      if (isPostgresql || isPostgres) {
        const protocol = isPostgresql ? 'postgresql://' : 'postgres://';
        const cleanedUrl = connectionString.replace(protocol, 'http://');
        const parsedUrl = new URL(cleanedUrl);
        host = parsedUrl.hostname;
        if (parsedUrl.port) {
          port = parseInt(parsedUrl.port, 10);
        }
      } else {
        const urlObj = new URL(connectionString);
        host = urlObj.hostname;
        if (urlObj.port) {
          port = parseInt(urlObj.port, 10);
        }
      }
    } catch (e) {
      // Fallback manual regex/string manipulation if URL parser fails
      const match = connectionString.match(/@([^/:]+)/);
      if (match) {
        host = match[1];
      }
    }
  }

  // For Unix Domain Socket connections, node-postgres looks for a socket file
  // named .s.PGSQL.<port>. The Cloud SQL proxy in Cloud Run exposes the socket
  // under .s.PGSQL.5432, so we force port 5432 when host starts with a slash.
  if (host && host.startsWith('/')) {
    port = 5432;
  }

  // Support explicit SSL configuration via environment variables
  const envSsl = process.env.CUSTOM_SQL_SSL;
  const hasExplicitSsl = envSsl !== undefined;
  const sslEnabled = envSsl === 'true' || envSsl === 'yes' || envSsl === '1';

  // Auto-detect and enable SSL for hosted PostgreSQL services (e.g. Neon, Supabase, AWS RDS)
  const isLocal = !host || host.startsWith('/') || host.includes('localhost') || host.includes('127.0.0.1');

  // Default to non-SSL if the user explicitly configured CUSTOM_SQL_SSL as false, or if standard pgsslmode is disable/no
  const pgSslMode = process.env.PGSSLMODE;
  const forceDisableSsl = forceNoSsl || globalForceNoSsl || (hasExplicitSsl && !sslEnabled) || pgSslMode === 'disable' || pgSslMode === 'no';

  const useSsl = !isLocal && !forceDisableSsl;
  const ssl = useSsl ? { rejectUnauthorized: false } : undefined;

  // 2. Adjust connection string parameters dynamically based on calculated useSsl using the helper utility
  if (connectionString) {
    connectionString = enforceSslConnectionString(connectionString, !useSsl);
  }

  const poolConfig: any = {
    connectionTimeoutMillis: 15000,
    ssl,
  };

  if (connectionString) {
    poolConfig.connectionString = connectionString;
  } else {
    poolConfig.host = host;
    poolConfig.port = port;
    poolConfig.user = process.env.CUSTOM_SQL_USER;
    poolConfig.password = process.env.CUSTOM_SQL_PASSWORD;
    poolConfig.database = process.env.CUSTOM_SQL_DB_NAME;
  }

  const newPool = new Pool(poolConfig);

  // Intercept newPool.query to record query history
  const originalQuery = newPool.query;
  newPool.query = function (this: any, ...args: any[]) {
    const start = Date.now();
    let queryText = '';
    let queryValues: any[] | undefined = undefined;
    
    if (typeof args[0] === 'string') {
      queryText = args[0];
      if (Array.isArray(args[1])) {
        queryValues = args[1];
      }
    } else if (args[0] && typeof args[0] === 'object') {
      queryText = args[0].text || '';
      queryValues = args[0].values;
    }

    // Determine if last argument is a callback function
    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'function') {
      const callback = lastArg;
      args[args.length - 1] = function(this: any, err: any, result: any) {
        const duration = Date.now() - start;
        if (err) {
          addQueryLog(queryText, queryValues, duration, 'FAILED', err.message);
        } else {
          addQueryLog(queryText, queryValues, duration, 'SUCCESS');
        }
        return callback.apply(this, arguments as any);
      };
      return originalQuery.apply(this, args as any);
    }

    // Promise style
    const promise = originalQuery.apply(this, args as any);
    if (promise && typeof promise.then === 'function') {
      return promise.then(
        (result: any) => {
          const duration = Date.now() - start;
          addQueryLog(queryText, queryValues, duration, 'SUCCESS');
          return result;
        },
        (err: any) => {
          const duration = Date.now() - start;
          addQueryLog(queryText, queryValues, duration, 'FAILED', err.message);
          throw err;
        }
      );
    }
    return promise;
  } as any;

  return newPool;
};

export let pool = createPool();

pool.on('error', (err: any) => {
  if (err.message && err.message.includes('does not support SSL connections') && !globalForceNoSsl) {
    console.log('[Database] Protocol adjustment: switching connection pool to standard mode.');
    globalForceNoSsl = true;
    refreshDatabaseConnection();
  } else {
    console.warn('[Database] Note:', err.message);
  }
});

export let dbInstance = drizzle(pool, { schema });

let sslTested = false;

// Proactively test and verify the connection, falling back to non-SSL if the server rejects SSL
export const ensureConnection = async (): Promise<boolean> => {
  if (sslTested) return !globalForceNoSsl;
  try {
    const client = await pool.connect();
    client.release();
    sslTested = true;
    console.log(`[Database] Protocol initialized (SSL: ${!globalForceNoSsl})`);
    return true;
  } catch (err: any) {
    if (err.message && err.message.includes('does not support SSL connections') && !globalForceNoSsl) {
      console.log('[Database] Protocol adjustment: Server requested standard mode. Rebuilding database pool...');
      globalForceNoSsl = true;
      refreshDatabaseConnection();
      sslTested = true;
      // Re-verify after fallback
      try {
        const client2 = await pool.connect();
        client2.release();
        console.log('[Database] Protocol successfully configured for standard mode.');
        return true;
      } catch (err2: any) {
        console.error('[Database] Connection alert: check standard configuration:', err2.message);
        throw err2;
      }
    } else {
      sslTested = true;
      console.error('[Database] Connection alert: check settings:', err.message);
      throw err;
    }
  }
};

// Refresh database connection on the fly with updated environment variables
export const refreshDatabaseConnection = (forceNoSsl = false): boolean => {
  try {
    if (forceNoSsl) {
      globalForceNoSsl = true;
    }
    sslTested = false; // reset test flag to allow re-testing
    console.log(`[Database] Rebuilding connection pool with latest credentials (SSL: ${!globalForceNoSsl})...`);
    // Close existing pool to free up connections
    const oldPool = pool;
    setTimeout(() => {
      oldPool.end().catch((err) => console.error('[Database] Closed old pool connection:', err.message));
    }, 1000);

    pool = createPool();
    pool.on('error', (err: any) => {
      if (err.message && err.message.includes('does not support SSL connections') && !globalForceNoSsl) {
        console.log('[Database] Protocol adjustment: switching connection pool to standard mode.');
        globalForceNoSsl = true;
        refreshDatabaseConnection();
      } else {
        console.warn('[Database] Note:', err.message);
      }
    });

    dbInstance = drizzle(pool, { schema });
    console.log('[Database] Database connection pool successfully updated!');
    return true;
  } catch (err: any) {
    console.error('[Database] Reconnection info:', err.message);
    return false;
  }
};

// Export db as a Proxy that forwards all operations to dbInstance.
// This allows other modules to import { db } once, while the underlying pool changes.
export const db = new Proxy({} as any, {
  get(target, prop, receiver) {
    return Reflect.get(dbInstance, prop, receiver);
  },
  set(target, prop, value, receiver) {
    return Reflect.set(dbInstance, prop, value, receiver);
  }
});

