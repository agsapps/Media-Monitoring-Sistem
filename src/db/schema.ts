import { pgTable, text, boolean, integer, doublePrecision, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  role: text('role').notNull(),
  status: text('status'),
  createdAt: text('created_at'),
  lastLogin: text('last_login'),
  passwordHash: text('password_hash'),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  color: text('color'),
  slug: text('slug'),
  name: text('name').notNull(),
});

export const medias = pgTable('medias', {
  id: text('id').primaryKey(),
  date: text('date'),
  name: text('name').notNull(),
  provinsi: text('provinsi'),
  type: text('type'),
  reach: text('reach'),
});

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const logs = pgTable('logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  username: text('username').notNull(),
  role: text('role'),
  action: text('action').notNull(),
  target: text('target'),
  timestamp: text('timestamp'),
});

export const keywords = pgTable('keywords', {
  id: text('id').primaryKey(),
  text: text('text').notNull(),
  active: boolean('active').default(true),
  createdAt: text('created_at'),
});

export const highlights = pgTable('highlights', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  summary: text('summary'),
  publishDate: text('publish_date'),
  publishTime: text('publish_time'),
  location: text('location'),
  categoryName: text('category_name'),
  mediaName: text('media_name'),
  link: text('link'),
  imageUrl: text('image_url'),
  sentiment: text('sentiment'),
  isPinned: boolean('is_pinned').default(false),
  orderIndex: integer('order_index').default(0),
  createdAt: text('created_at'),
});

export const news = pgTable('news', {
  id: text('id').primaryKey(),
  createdAt: text('created_at'),
  status: text('status'),
  publishDate: text('publish_date'),
  link: text('link'),
  updatedAt: text('updated_at'),
  mediaId: text('media_id'),
  tags: jsonb('tags').$type<string[]>(),
  title: text('title').notNull(),
  mediaName: text('media_name'),
  location: text('location'),
  summary: text('summary'),
  imageUrl: text('image_url'),
  categoryId: text('category_id'),
  publishTime: text('publish_time'),
  categoryName: text('category_name'),
  statusWaktu: text('status_waktu'),
  sentiment: text('sentiment'),
  isFeatured: boolean('is_featured'),
  unixTime: doublePrecision('unix_time'),
  createdTime: doublePrecision('created_time'),
  isGeneric: boolean('is_generic'),
});

export const socialNews = pgTable('social_news', {
  id: text('id').primaryKey(),
  lokasi: text('lokasi'),
  tanggalInput: text('tanggal_input'),
  caption: text('caption').notNull(),
  username: text('username').notNull(),
  ringkasan: text('ringkasan'),
  urgensi: text('urgensi'),
  analisis: text('analisis'),
  sentimen: text('sentimen'),
  kategori: text('kategori'),
  waktuPosting: text('waktu_posting'),
  createdAt: text('created_at'),
  updatedAt: text('updated_at'),
  link: text('link'),
  jenisSosmed: text('jenis_sosmed'),
});

export const aiTokenUsage = pgTable('ai_token_usage', {
  id: text('id').primaryKey(),
  model: text('model').notNull(),
  endpoint: text('endpoint').notNull(),
  promptTokens: integer('prompt_tokens').notNull(),
  completionTokens: integer('completion_tokens').notNull(),
  totalTokens: integer('total_tokens').notNull(),
  thoughtTokens: integer('thought_tokens').default(0),
  cachedTokens: integer('cached_tokens').default(0),
  toolUseTokens: integer('tool_use_tokens').default(0),
  timestamp: text('timestamp').notNull(),
});

