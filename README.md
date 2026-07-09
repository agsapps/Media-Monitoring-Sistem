# 📰 Media Intelligence Monitoring System

Sistem monitoring media dan analisis sentimen berita yang dibangun buat membantu tim PR dalam memantau pemberitaan harian, menganalisis sentimen, sampai menghasilkan buletin eksekutif secara otomatis. Semua proses analisisnya sudah dibantu oleh **Gemini AI** biar kerjanya lebih cepat dan nggak manual lagi.

> Dibangun pakai stack modern: Node.js + React 19 (Vite) + Express.js + Prisma + Gemini AI.

---

## ✨ Fitur Utama

### 📊 Dashboard Eksekutif
- Ringkasan total berita + tracker sentimen (Positif / Negatif / Netral) dalam bentuk persentase.
- Grafik kronologi harian, pie chart komposisi sentimen, dan bar chart media paling aktif.
- Ekspor data otomatis ke **Excel / CSV**.

### 🌐 Portal Publik
- Tampilan portal berita minimalis, tanpa perlu login buat pengunjung.
- Search engine + filter sticky (topik, sentimen, media).
- Halaman detail berita lengkap dengan thumbnail dan link sumber asli.
- Tombol share ke WhatsApp dan copy link.

### 📄 Generator Laporan PDF
- **Cetak per berita:** Kliping satu per satu lengkap dengan ringkasan & advis mitigasi.
- **Cetak kompilasi:** Gabungkan semua berita yang lolos filter jadi satu dokumen PDF rapi (cover elegan, logo, header, footer khusus).

### 🤖 Integrasi Gemini AI
Cukup masukkan judul atau URL berita, lalu biarkan AI bekerja:
- Parsing otomatis isi berita.
- Kategorisasi isu & penilaian sentimen.
- Generate tag kata kunci.
- Menyusun ringkasan + **strategi penanganan humas (mitigasi korporat)**.

### 🗂️ Master Data & Audit Trail
- Form manajemen kategori & media sumber.
- Log aktivitas lengkap (siapa, kapan, ngapain, target apa) buat menjaga keandalan data editor.

### 🎨 Customization Panel
Atur nama instansi, warna brand, header & footer PDF, sampai konfigurasi AI — semua bisa diubah lewat menu Settings.

---

## 🔑 Akun Demo

Klik tombol **Login** di menu, lalu pilih salah satu akun berikut:

| Role | Username | Password | Akses |
|------|----------|----------|-------|
| Administrator |  Full control: edit, hapus, master data, audit trail |
| Editor | Input berita, analisis AI, edit isi, atur branding |
| Viewer | Lihat dashboard, unduh PDF / CSV |

---

## 🛠️ Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS + Recharts
- **Backend:** Express.js (Node.js)
- **Database:** PostgreSQL + Prisma ORM
- **PDF Generation:** jsPDF
- **AI Engine:** Google Gemini API

### Struktur Folder Utama

## 🗄️ Rancangan Skema Database (Prisma PostgreSQL)

Bila Anda ingin melakukan migrasi database ini ke Prisma ORM dengan PostgreSQL di server lokal, gunakan rancangan schema berkas `.prisma` berikut:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  Admin
  Editor
  Viewer
}

enum Sentiment {
  Positif
  Negatif
  Netral
}

enum MediaType {
  Online
  Cetak
  TV
  Radio
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String   
  name      String
  role      Role     @default(Viewer)
  createdAt DateTime @default(now())
  logs      ActivityLog[]
}

model Category {
  id        String   @id @default(uuid())
  name      String   @unique
  slug      String   @unique
  color     String   // Tailwind class representation name (e.g. bg-blue-500)
  news      News[]
}

model MediaSource {
  id        String    @id @default(uuid())
  name      String    @unique
  type      MediaType @default(Online)
  reach     String    // Nasional / Lokal / Internasional
  news      News[]
}

model News {
  id           String      @id @default(uuid())
  title        String
  summary      String      @db.Text
  link         String?
  mediaId      String
  media        MediaSource @relation(fields: [mediaId], references: [id])
  publishDate  String      // format: YYYY-MM-DD
  categoryId   String
  category     Category    @relation(fields: [categoryId], references: [id])
  sentiment    Sentiment   @default(Netral)
  tags         String[]    // PostgreSQL array support
  imageUrl     String?
  status       String      @default("Published") // "Draft" | "Published"
  isFeatured   Boolean     @default(false)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

model ActivityLog {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  username  String
  role      String
  action    String
  target    String
  timestamp DateTime @default(now())
}
```

---

## 🐳 Docker Deployment & Startup

### Dockerfile:
```dockerfile
# Base image
FROM node:18-alpine

# Workspace Directory
WORKDIR /app

# Install dependencies dependencies
COPY package*.json ./
RUN npm install

# Copy source codes
COPY . .

# Build assets
RUN npm run build

# Ports expose
EXPOSE 3000

# Standalone start command
CMD ["npm", "start"]
```

### Docker Compose (`docker-compose.yml`):
```yaml
version: '3.8'

services:
  media_intelligence:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GEMINI_API_KEY=your_gemini_api_key_here
    restart: always
```
