import * as fs from 'fs';
import * as path from 'path';
import { db, pool } from './index.ts';
import {
  users,
  categories,
  medias,
  settings,
  logs,
  keywords,
  highlights,
  news,
  socialNews
} from './schema.ts';

async function migrateAll() {
  console.log('Reading data/database.json...');
  const filePath = path.join(process.cwd(), 'data', 'database.json');
  if (!fs.existsSync(filePath)) {
    console.error('database.json not found!');
    return;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  const database = JSON.parse(raw);

  // Helper for batching
  const batchInsert = async (table: any, items: any[], tableName: string) => {
    if (!items || items.length === 0) return;
    const batchSize = 100;
    console.log(`Migrating ${items.length} items to ${tableName}...`);
    for (let i = 0; i < items.length; i += batchSize) {
      const chunk = items.slice(i, i + batchSize);
      try {
        await db.insert(table).values(chunk).onConflictDoNothing();
      } catch (err: any) {
        console.error(`Error inserting chunk [${i}-${i + batchSize}] into ${tableName}:`, err.message);
      }
    }
    console.log(`Completed ${tableName} migration.`);
  };

  // 1. Users
  const mappedUsers = (database.users || []).map((item: any) => ({
    id: item.id,
    username: item.username,
    name: item.name || item.username,
    email: item.email || null,
    role: item.role,
    status: item.status || null,
    createdAt: item.createdAt || null,
    lastLogin: item.lastLogin || null,
    passwordHash: item.passwordHash || null,
  }));
  await batchInsert(users, mappedUsers, 'users');

  // 2. Categories
  const mappedCategories = (database.categories || []).map((item: any) => ({
    id: item.id,
    color: item.color || null,
    slug: item.slug || null,
    name: item.name,
  }));
  await batchInsert(categories, mappedCategories, 'categories');

  // 3. Medias
  const mappedMedias = (database.medias || []).map((item: any) => ({
    id: item.id,
    date: item.date || null,
    name: item.name,
    provinsi: item.provinsi || null,
    type: item.type || null,
    reach: item.reach || null,
  }));
  await batchInsert(medias, mappedMedias, 'medias');

  // 4. Settings
  const mappedSettings = Object.entries(database.settings || {}).map(([key, val]) => ({
    key,
    value: typeof val === 'object' ? JSON.stringify(val) : String(val),
  }));
  await batchInsert(settings, mappedSettings, 'settings');

  // 5. Logs
  const mappedLogs = (database.logs || []).map((item: any) => ({
    id: item.id,
    userId: item.userId || null,
    username: item.username,
    role: item.role || null,
    action: item.action,
    target: item.target || null,
    timestamp: item.timestamp || null,
  }));
  await batchInsert(logs, mappedLogs, 'logs');

  // 6. Keywords
  const mappedKeywords = (database.keywords || []).map((item: any) => ({
    id: item.id,
    text: item.text,
    active: typeof item.active === 'boolean' ? item.active : true,
    createdAt: item.createdAt || null,
  }));
  await batchInsert(keywords, mappedKeywords, 'keywords');

  // 7. Highlights
  const mappedHighlights = (database.highlights || []).map((item: any) => ({
    id: item.id,
    title: item.title,
    summary: item.summary || null,
    publishDate: item.publishDate || null,
    publishTime: item.publishTime || null,
    location: item.location || null,
    categoryName: item.categoryName || null,
    mediaName: item.mediaName || null,
    link: item.link || null,
    imageUrl: item.imageUrl || null,
    sentiment: item.sentiment || null,
    isPinned: typeof item.isPinned === 'boolean' ? item.isPinned : false,
    orderIndex: typeof item.orderIndex === 'number' ? item.orderIndex : 0,
    createdAt: item.createdAt || null,
  }));
  await batchInsert(highlights, mappedHighlights, 'highlights');

  // 8. News
  const mappedNews = (database.news || []).map((item: any) => ({
    id: item.id,
    createdAt: item.createdAt || null,
    status: item.status || null,
    publishDate: item.publishDate || null,
    link: item.link || null,
    updatedAt: item.updatedAt || null,
    mediaId: item.mediaId || null,
    tags: Array.isArray(item.tags) ? item.tags : null,
    title: item.title,
    mediaName: item.mediaName || null,
    location: item.location || null,
    summary: item.summary || null,
    imageUrl: item.imageUrl || null,
    categoryId: item.categoryId || null,
    publishTime: item.publishTime || null,
    categoryName: item.categoryName || null,
    statusWaktu: item.statusWaktu || null,
    sentiment: item.sentiment || null,
    isFeatured: typeof item.isFeatured === 'boolean' ? item.isFeatured : null,
    unixTime: typeof item._unixTime === 'number' ? item._unixTime : null,
    createdTime: typeof item._createdTime === 'number' ? item._createdTime : null,
    isGeneric: typeof item._isGeneric === 'boolean' ? item._isGeneric : null,
  }));
  await batchInsert(news, mappedNews, 'news');

  // 9. Social News
  const mappedSocialNews = (database.socialNews || []).map((item: any) => ({
    id: item.id,
    lokasi: item.lokasi || null,
    tanggalInput: item.tanggalInput || null,
    caption: item.caption,
    username: item.username,
    ringkasan: item.ringkasan || null,
    urgensi: item.urgensi || null,
    analisis: typeof item.analisis === 'object' ? JSON.stringify(item.analisis) : (item.analisis || null),
    sentimen: item.sentimen || null,
    kategori: item.kategori || null,
    waktuPosting: item.waktuPosting || null,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    link: item.link || null,
    jenisSosmed: item.jenisSosmed || null,
  }));
  await batchInsert(socialNews, mappedSocialNews, 'social_news');

  console.log('All migrations completed!');
}

migrateAll()
  .catch((err) => {
    console.error('Migration failed:', err);
  })
  .finally(() => {
    pool.end();
  });
