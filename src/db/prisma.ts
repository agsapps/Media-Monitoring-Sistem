import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const host = process.env.CUSTOM_SQL_HOST || '127.0.0.1';
const port = process.env.CUSTOM_SQL_PORT || '5432';
const user = process.env.CUSTOM_SQL_USER || 'media_monitoring';
const password = process.env.CUSTOM_SQL_PASSWORD || '';
const database = process.env.CUSTOM_SQL_DATABASE || 'media_monitoring';

const connectionString =
  `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({
  adapter,
});
