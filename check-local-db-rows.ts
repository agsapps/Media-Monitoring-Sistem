import pkg from 'pg';
const { Client } = pkg;

async function checkLocalRows() {
  const host = process.env.CUSTOM_SQL_HOST;
  let port = process.env.CUSTOM_SQL_PORT ? parseInt(process.env.CUSTOM_SQL_PORT, 10) : 5432;

  if (host && host.startsWith('/')) {
    port = 5432;
  }

  const client = new Client({
    host,
    port,
    user: process.env.CUSTOM_SQL_USER,
    password: process.env.CUSTOM_SQL_PASSWORD,
    database: process.env.CUSTOM_SQL_DB_NAME,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    const tables = ['users', 'categories', 'medias', 'settings', 'logs', 'keywords', 'highlights', 'news', 'social_news', 'ai_token_usage'];
    console.log('--- Current Local Native Cloud SQL Row Counts ---');
    for (const table of tables) {
      const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`${table}: ${res.rows[0].count} rows`);
    }
    await client.end();
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

checkLocalRows();
