import { db, pool } from './index.ts';
import {
  users as sqlUsers,
  categories as sqlCategories,
  medias as sqlMedias,
  settings as sqlSettings,
  keywords as sqlKeywords,
  highlights as sqlHighlights,
  news as sqlNews,
  socialNews as sqlSocialNews
} from './schema.ts';
import { sql } from 'drizzle-orm';

const EXTERNAL_BASE_URL = 'https://media-monitoring-745708369616.asia-southeast1.run.app';

async function syncFromExternal() {
  console.log('Starting data integration from external Media Monitoring server...');
  console.log(`Source URL: ${EXTERNAL_BASE_URL}`);

  // Helper for batching with conflict handling
  const batchInsert = async (table: any, items: any[], tableName: string) => {
    if (!items || items.length === 0) return;
    const batchSize = 100;
    console.log(`Syncing ${items.length} items to ${tableName}...`);
    let inserted = 0;
    for (let i = 0; i < items.length; i += batchSize) {
      const chunk = items.slice(i, i + batchSize);
      try {
        await db.insert(table).values(chunk).onConflictDoNothing();
        inserted += chunk.length;
      } catch (err: any) {
        console.error(`Error inserting chunk [${i}-${i + batchSize}] into ${tableName}:`, err.message);
      }
    }
    console.log(`Completed ${tableName} sync: added/checked ${inserted} items.`);
  };

  // 1. Settings (Key-Value map)
  try {
    console.log('Fetching settings...');
    const settingsRes = await fetch(`${EXTERNAL_BASE_URL}/api/settings`);
    if (settingsRes.ok) {
      const settingsObj = await settingsRes.json();
      const mappedSettings = Object.entries(settingsObj).map(([key, val]) => ({
        key,
        value: typeof val === 'object' ? JSON.stringify(val) : String(val),
      }));
      
      console.log(`Syncing ${mappedSettings.length} setting keys...`);
      for (const item of mappedSettings) {
        await db.insert(sqlSettings)
          .values(item)
          .onConflictDoUpdate({
            target: sqlSettings.key,
            set: { value: item.value }
          });
      }
      console.log('Completed settings sync.');
    } else {
      console.warn('Failed to fetch settings, status:', settingsRes.status);
    }
  } catch (err: any) {
    console.error('Error syncing settings:', err.message);
  }

  // 2. Categories
  try {
    console.log('Fetching categories...');
    const res = await fetch(`${EXTERNAL_BASE_URL}/api/categories`);
    if (res.ok) {
      const items = await res.json();
      const mapped = items.map((item: any) => ({
        id: item.id,
        color: item.color || null,
        slug: item.slug || null,
        name: item.name,
      }));
      await batchInsert(sqlCategories, mapped, 'categories');
    }
  } catch (err: any) {
    console.error('Error syncing categories:', err.message);
  }

  // 3. Medias
  try {
    console.log('Fetching medias...');
    const res = await fetch(`${EXTERNAL_BASE_URL}/api/medias`);
    if (res.ok) {
      const items = await res.json();
      const mapped = items.map((item: any) => ({
        id: item.id,
        date: item.date || null,
        name: item.name,
        provinsi: item.provinsi || null,
        type: item.type || null,
        reach: item.reach || null,
      }));
      await batchInsert(sqlMedias, mapped, 'medias');
    }
  } catch (err: any) {
    console.error('Error syncing medias:', err.message);
  }

  // 4. Keywords
  try {
    console.log('Fetching keywords...');
    const res = await fetch(`${EXTERNAL_BASE_URL}/api/keywords`);
    if (res.ok) {
      const items = await res.json();
      const mapped = items.map((item: any) => ({
        id: item.id,
        text: item.text,
        active: typeof item.active === 'boolean' ? item.active : true,
        createdAt: item.createdAt || null,
      }));
      await batchInsert(sqlKeywords, mapped, 'keywords');
    }
  } catch (err: any) {
    console.error('Error syncing keywords:', err.message);
  }

  // 5. Highlights
  try {
    console.log('Fetching highlights...');
    const res = await fetch(`${EXTERNAL_BASE_URL}/api/highlights`);
    if (res.ok) {
      const items = await res.json();
      const mapped = items.map((item: any) => ({
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
      await batchInsert(sqlHighlights, mapped, 'highlights');
    }
  } catch (err: any) {
    console.error('Error syncing highlights:', err.message);
  }

  // 6. News (Primary target)
  try {
    console.log('Fetching news (this might take some time as it contains 13k+ items)...');
    const res = await fetch(`${EXTERNAL_BASE_URL}/api/news`);
    if (res.ok) {
      const items = await res.json();
      const mapped = items.map((item: any) => ({
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
        unixTime: typeof item._unixTime === 'number' ? item._unixTime : (typeof item.unixTime === 'number' ? item.unixTime : null),
        createdTime: typeof item._createdTime === 'number' ? item._createdTime : (typeof item.createdTime === 'number' ? item.createdTime : null),
        isGeneric: typeof item._isGeneric === 'boolean' ? item._isGeneric : (typeof item.isGeneric === 'boolean' ? item.isGeneric : null),
      }));
      await batchInsert(sqlNews, mapped, 'news');
    }
  } catch (err: any) {
    console.error('Error syncing news:', err.message);
  }

  // 7. Social News
  try {
    console.log('Fetching social news (this might take some time as it contains 23k+ items)...');
    const res = await fetch(`${EXTERNAL_BASE_URL}/api/social-news`);
    if (res.ok) {
      const items = await res.json();
      const mapped = items.map((item: any) => ({
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
      await batchInsert(sqlSocialNews, mapped, 'social_news');
    }
  } catch (err: any) {
    console.error('Error syncing social news:', err.message);
  }

  console.log('🎉 Data integration completed successfully!');
}

syncFromExternal()
  .catch((err) => {
    console.error('Integration process failed:', err);
  })
  .finally(() => {
    pool.end();
  });
