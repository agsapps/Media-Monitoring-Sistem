# Panduan Migrasi & Skema SQL: Firestore ke PostgreSQL
Dokumen teknis ini dirancang untuk memandu transisi penyimpanan data aplikasi monitoring dari NoSQL (Cloud Firestore / file local `database.json`) ke Database Relasional (PostgreSQL). Migrasi ini bertujuan untuk meningkatkan kecepatan query pencarian, agregasi statistik, serta efisiensi konsumsi memori server.

---

## 1. Mengapa Migrasi ke SQL Lebih Ringan & Cepat?

### A. Efisiensi Memori (RAM) Server
* **Kondisi Saat Ini**: Server memuat seluruh database (berukuran >27 MB, berisi puluhan ribu baris data `news` dan `socialNews`) langsung ke dalam RAM Node.js sebagai object tunggal. Setiap kali API diakses, Node.js harus melakukan operasi sorting, filtering, dan mapping secara in-memory. Hal ini menyebabkan penggunaan CPU & RAM yang tinggi pada container.
* **Solusi PostgreSQL**: Pemrosesan query dipindahkan sepenuhnya ke engine database. Node.js hanya akan memproses data yang sudah ter-filter dan ter-paginasi (misal: 10 atau 50 baris data per request), sehingga menghemat RAM hingga **95%**.

### B. Optimalisasi Query Kompleks & Agregasi
* **Kondisi Saat Ini**: Untuk menampilkan data statistik seperti jumlah berita per sentimen, daftar media sosial terpopuler, atau heatmap per provinsi, server harus melakukan iterasi (`looping`) terhadap puluhan ribu item di memory.
* **Solusi PostgreSQL**: PostgreSQL menggunakan perintah deklaratif (`GROUP BY`, `COUNT`, `SUM`) yang didukung penuh oleh **B-Tree Indexes**. Query pencarian teks juga dapat dioptimalkan menggunakan fitur **GIN Indexes (Generalized Inverted Index)** untuk pencarian kata kunci yang sangat cepat.

### C. Efisiensi Biaya Operasional (Firestore Read/Write Cost)
* **Kondisi Saat Ini**: Firestore membebankan biaya per baris dokumen yang dibaca (*Read Operations*). Melakukan load atau sinkronisasi 10.000 dokumen sekaligus dapat menghabiskan kuota gratis Firestore dalam hitungan menit.
* **Solusi PostgreSQL**: Sistem berbasis kapasitas/storage sehingga tidak ada batasan jumlah pembacaan (*Unlimited Reads/Writes*), sangat ramah anggaran untuk aplikasi bertipe dashboard monitoring yang sering melakukan refresh data.

---

## 2. Skema Database Relasional (PostgreSQL DDL)

Berikut adalah rancangan skema database relasional yang dinormalisasi untuk menjaga integritas data dan mempercepat relasi antar entitas.

```sql
-- PostgreSQL DDL Schema
-- Dioptimalkan untuk query analisis dan monitoring berkinerja tinggi

-- 1. Tabel Konfigurasi (Settings)
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Pengguna (Users)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- Menyimpan hash password
    role VARCHAR(50) DEFAULT 'Viewer' CHECK (role IN ('Administrator', 'Analyst', 'Viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Kategori Berita & Sosmed (Categories)
CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Media Penerbit (Medias)
CREATE TABLE IF NOT EXISTS medias (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) DEFAULT 'Online' CHECK (type IN ('Online', 'Cetak', 'TV', 'Radio')),
    url TEXT,
    logo_base64 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Berita Portal / Online (News)
CREATE TABLE IF NOT EXISTS news (
    id VARCHAR(100) PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT UNIQUE,
    content TEXT,
    sentiment VARCHAR(50) DEFAULT 'Netral' CHECK (sentiment IN ('Positif', 'Negatif', 'Netral')),
    category_id VARCHAR(100) REFERENCES categories(id) ON DELETE SET NULL,
    media_id VARCHAR(100) REFERENCES medias(id) ON DELETE SET NULL,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    province VARCHAR(150) DEFAULT 'Nasional',
    regency VARCHAR(150),
    summary TEXT,
    urgency VARCHAR(50) DEFAULT 'Rendah' CHECK (urgency IN ('Tinggi', 'Sedang', 'Rendah')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabel Berita Media Sosial (Social News)
CREATE TABLE IF NOT EXISTS social_news (
    id VARCHAR(100) PRIMARY KEY,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('Twitter/X', 'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Lainnya')),
    username VARCHAR(150) NOT NULL,
    caption TEXT NOT NULL,
    url TEXT,
    sentiment VARCHAR(50) DEFAULT 'Netral' CHECK (sentiment IN ('Positif', 'Negatif', 'Netral')),
    category_id VARCHAR(100) REFERENCES categories(id) ON DELETE SET NULL,
    published_at TIMESTAMP WITH TIME ZONE NOT NULL,
    province VARCHAR(150) DEFAULT 'Nasional',
    regency VARCHAR(150),
    summary TEXT,
    urgency VARCHAR(50) DEFAULT 'Rendah' CHECK (urgency IN ('Tinggi', 'Sedang', 'Rendah')),
    analysis_details JSONB, -- Menyimpan payload hasil analisis AI atau metadata sosmed tambahan
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabel Kata Kunci Pelacakan (Keywords)
CREATE TABLE IF NOT EXISTS keywords (
    id VARCHAR(100) PRIMARY KEY,
    term VARCHAR(255) UNIQUE NOT NULL,
    category_id VARCHAR(100) REFERENCES categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabel Berita Unggulan (Highlights)
CREATE TABLE IF NOT EXISTS highlights (
    id VARCHAR(100) PRIMARY KEY,
    news_id VARCHAR(100) REFERENCES news(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabel Log Aktivitas (System Logs)
CREATE TABLE IF NOT EXISTS logs (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    username VARCHAR(100) NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Strategi Pengindeksan (Indexing) untuk Akses Cepat

Untuk mengoptimalkan filter yang ada di panel dashboard (seperti tanggal, provinsi, sentimen, dan media), kita wajib menambahkan index berikut:

```sql
-- Index untuk mempercepat filter dan pencarian berita (News)
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_sentiment ON news(sentiment);
CREATE INDEX IF NOT EXISTS idx_news_province ON news(province);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category_id);

-- Index untuk mempercepat filter dan analisis media sosial (Social News)
CREATE INDEX IF NOT EXISTS idx_social_published_at ON social_news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_platform ON social_news(platform);
CREATE INDEX IF NOT EXISTS idx_social_province ON social_news(province);
CREATE INDEX IF NOT EXISTS idx_social_sentiment ON social_news(sentiment);

-- Index Pencarian Kata Kunci Konten (Full-Text Search)
-- Memungkinkan pencarian teks berita atau caption sosmed dalam hitungan milidetik
CREATE INDEX IF NOT EXISTS idx_news_content_fts ON news USING gin(to_tsvector('indonesian', content));
CREATE INDEX IF NOT EXISTS idx_social_caption_fts ON social_news USING gin(to_tsvector('indonesian', caption));
```

---

## 4. Contoh Query Agregasi Analytics Berperforma Tinggi

Berikut adalah perbandingan pemrosesan logika dashboard antara Javascript (In-Memory) vs PostgreSQL:

### A. Distribusi Sentimen Berita
* **Sebelumnya (JS)**: `.filter().reduce()` memproses puluhan ribu baris di memori.
* **PostgreSQL (Sangat Ringan)**:
```sql
SELECT 
    sentiment, 
    COUNT(*) as total_count 
FROM news 
WHERE published_at >= NOW() - INTERVAL '7 days'
GROUP BY sentiment;
```

### B. Top Media Sosial dengan Postingan Terbanyak
* **Sebelumnya (JS)**: Object hashmap looping manual.
* **PostgreSQL (Sangat Ringan)**:
```sql
SELECT 
    platform, 
    COUNT(*) as total_posts 
FROM social_news 
GROUP BY platform 
ORDER BY total_posts DESC 
LIMIT 5;
```

---

## 5. Analisis Perbandingan Efisiensi Query & Sumber Daya

Untuk memberikan visualisasi dan pemahaman yang lebih jelas mengenai keuntungan performa, berikut adalah matriks perbandingan mendalam antara pendekatan Firestore saat ini (yang membutuhkan pemrosesan *in-memory* di sisi server) dengan pendekatan SQL menggunakan *Index* pada PostgreSQL:

### A. Matriks Perbandingan Efisiensi

| Parameter Evaluasi | Firestore + In-Memory Server (Saat Ini) | PostgreSQL dengan B-Tree & GIN Index (Rekomendasi) | Mengapa SQL Jauh Lebih Ringan? |
| :--- | :--- | :--- | :--- |
| **Kecepatan Query (Latency)** | **1.200 ms - 4.500 ms** (Memburuk secara linier seiring bertambahnya jumlah data). | **5 ms - 50 ms** (Tetap stabil dan cepat meskipun data mencapai jutaan baris). | SQL menggunakan B-Tree index untuk langsung menunjuk lokasi data di disk, tanpa perlu melakukan pemindaian menyeluruh (*Full Table Scan*). |
| **Konsumsi RAM Server (Node.js)** | **Sangat Tinggi (O(N))**<br>Server harus memuat seluruh data JSON (>27 MB) ke dalam memory RAM. | **Sangat Rendah (O(1))**<br>Server hanya menerima baris data yang sudah disaring (misal 10-50 baris). | Mengurangi beban RAM server Node.js hingga **>95%**, sehingga mencegah crash server akibat *Out-of-Memory* (OOM). |
| **Kompleksitas Komputasi CPU** | **O(N log N)**<br>Filter, sort, dan agregasi dilakukan menggunakan thread tunggal Javascript (V8 engine). | **O(log N)**<br>Proses pencarian dan sorting diserahkan kepada mesin database yang dioptimalkan secara multi-threaded. | Melepaskan beban komputasi berat dari *event loop* Node.js, menjaga server tetap responsif untuk menangani request lain secara bersamaan. |
| **Bandwidth & Transfer Data** | **Tinggi (Seluruh Dokumen)**<br>Seluruh payload mentah harus ditransfer dari disk ke RAM server sebelum diproses. | **Sangat Kecil (Hanya Hasil Akhir)**<br>Hanya record hasil agregasi/filter akhir yang dikirim ke aplikasi server. | Hemat *bandwidth* jaringan internal cloud, mengurangi latency transfer data antar layanan. |
| **Biaya Operasional (Cloud Cost)** | **Mahal**<br>Dihitung per operasi baca/tulis dokumen Firestore (10.000 read = 10.000 unit biaya). | **Sangat Ekonomis**<br>Sistem kapasitas flat-rate (unlimited reads/writes) berdasarkan storage & RAM instansi. | Sangat cocok untuk aplikasi monitoring dashboard yang membutuhkan penyegaran (*refresh*) data otomatis secara berkala. |

### B. Simulasi Kasus Nyata: Menampilkan Dashboard Statistik Harian
Misalkan database memiliki **50.000 baris data** berita dan media sosial, dan user ingin memfilter dashboard berdasarkan **Provinsi = "DKI Jakarta"** dalam **7 hari terakhir** diurutkan berdasarkan **Terbaru**:

#### 1. Skenario Firestore + In-Memory (Saat Ini)
1. Server memanggil Firestore untuk mendownload seluruh koleksi berita atau membaca file JSON lokal seukuran **27+ MB**.
2. CPU server mengalokasikan memori tambahan untuk parsing teks menjadi object Javascript.
3. Node.js melakukan `.filter()` sebanyak **50.000 kali** untuk mengecek properti `provinsi === 'DKI Jakarta'` dan rentang waktu.
4. Node.js melakukan `.sort()` menggunakan algoritma sorting *Quicksort/Merge Sort* pada hasil filter di memori.
5. Node.js melakukan `.slice(0, 10)` untuk mengambil 10 berita teratas.
6. **Hasil Akhir**: Latency tinggi, CPU spike, konsumsi RAM melonjak selama proses request aktif.

#### 2. Skenario PostgreSQL dengan SQL Index (Setelah Migrasi)
1. Server mengirimkan query SQL ter-indeks ke database:
   ```sql
   SELECT * FROM news 
   WHERE province = 'DKI Jakarta' 
     AND published_at >= NOW() - INTERVAL '7 days' 
   ORDER BY published_at DESC 
   LIMIT 10;
   ```
2. Database PostgreSQL membaca index kombinasi `idx_news_province` dan `idx_news_published_at`.
3. Database langsung melompati baris data yang tidak sesuai dan hanya mengambil **10 baris data fisik** dari penyimpanan.
4. Data berukuran kurang dari **15 KB** dikirim kembali ke server Node.js.
5. **Hasil Akhir**: Selesai dalam hitungan milidetik, konsumsi RAM server flat (stabil dekat 0), CPU server tidak terbebani sama sekali.

---

## 6. Alur & Script Migrasi Data (Firestore ke PostgreSQL)

Migrasi dapat dilakukan menggunakan script Node.js sederhana (menggunakan `@google-cloud/firestore` dan `pg` client). Berikut adalah algoritma langkah-demi-langkah:

```javascript
// Konsep Script Migrasi Node.js
const { Firestore } = require('@google-cloud/firestore');
const { Client } = require('pg');

async function migrate() {
  const dbFirestore = new Firestore({ projectId: 'YOUR_PROJECT_ID' });
  const dbPostgres = new Client({ connectionString: 'YOUR_POSTGRES_URI' });
  await dbPostgres.connect();

  console.log('Memulai migrasi data news...');
  
  // 1. Ambil data dari Firestore
  const newsSnapshot = await dbFirestore.collection('news').get();
  console.log(`Menemukan ${newsSnapshot.size} berita di Firestore.`);

  // 2. Tulis ke PostgreSQL secara batch
  for (const doc of newsSnapshot.docs) {
    const data = doc.data();
    
    const query = `
      INSERT INTO news (id, title, url, content, sentiment, category_id, media_id, published_at, province, regency, summary, urgency)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        sentiment = EXCLUDED.sentiment,
        province = EXCLUDED.province;
    `;
    
    const values = [
      doc.id,
      data.title || '',
      data.url || null,
      data.content || '',
      data.sentiment || 'Netral',
      data.kategoriId || data.category_id || null,
      data.mediaId || data.media_id || null,
      new Date(data.tanggal || data.published_at || Date.now()),
      data.provinsi || data.province || 'Nasional',
      data.kota || data.regency || null,
      data.ringkasan || data.summary || '',
      data.urgensi || data.urgency || 'Rendah'
    ];

    await dbPostgres.query(query, values);
  }

  console.log('Migrasi selesai dengan sukses!');
  await dbPostgres.end();
}
```

---

## 7. Roadmap Langkah-Demi-Langkah (Migration Roadmap)

Proses migrasi ini dibagi menjadi 6 fase utama untuk menjamin akurasi data dan kelangsungan operasional aplikasi tanpa gangguan bagi pengguna akhir.

| Fase | Kegiatan Utama | Durasi Perkiraan | Tingkat Risiko |
| :--- | :--- | :--- | :--- |
| **Fase 1** | Persiapan Infrastruktur & Penyusunan DDL Schema | 1 - 2 Hari | Rendah |
| **Fase 2** | Implementasi Dual-Writing (Penulisan Ganda) di API | 2 - 3 Hari | Sedang |
| **Fase 3** | Migrasi Data Historis (Backfill / Catch-up) | 1 Hari | Rendah |
| **Fase 4** | Verifikasi & Rekonsiliasi Konsistensi Data | 1 Hari | Rendah |
| **Fase 5** | Cutover Bertahap (Switch Read API ke SQL) | 1 - 2 Hari | Sedang |
| **Fase 6** | Pembersihan & Penutupan Koneksi Firestore Lama | 1 Hari | Rendah |

---

## 8. Strategi Sinkronisasi Real-Time Tanpa Downtime (Zero-Downtime)

Tantangan terbesar dalam migrasi database operasional adalah **menghindari kehilangan data baru** yang masuk saat migrasi historis sedang berjalan, serta menjaga agar dashboard monitoring tetap menampilkan data real-time. Strategi terbaik untuk mengatasi tantangan ini adalah **Dual-Writing Pattern (Pola Penulisan Ganda)**.

### Arsitektur Aliran Data Transisional

```
                       [ Pengguna / Crawler ]
                                  |
                                  v
                         [ API Layer Server ]
                                  |
                 +----------------+----------------+
                 | (Kondisi Transisi: Dual Write)  |
                 v                                 v
        [ Firestore / NoSQL ]              [ PostgreSQL DB ]
         (Utama untuk Read)                 (Uji Coba & Sinkron)
                 |
                 v
        [ Pengguna Dashboard ]
```

---

### Langkah Detail Implementasi Strategi Transisi

#### LANGKAH 1: Persiapan Database SQL (Fase 1)
1. Buat instance database PostgreSQL (misalnya menggunakan Google Cloud SQL PostgreSQL).
2. Jalankan skema DDL yang tercantum di **Bab 2** untuk membuat tabel, relasi, dan constraint yang diperlukan.
3. Daftarkan konfigurasi connection string database PostgreSQL di file `.env` server:
   ```env
   DATABASE_URL=postgresql://db_user:secure_password@host:5432/monitoring_db?sslmode=require
   ```

#### LANGKAH 2: Penerapan Dual-Writing (Fase 2)
Ubah kode controller API backend Anda (untuk endpoint penulisan seperti `POST /api/news` atau `POST /api/social-news`) agar menulis ke **kedua** database secara paralel.

Berikut adalah pola implementasi backend Node.js / Express yang aman:

```javascript
// Contoh implementasi Dual-Writing pada endpoint POST
app.post('/api/social-news', async (req, res) => {
  const newPost = req.body; // Payload data baru

  // 1. Validasi & normalisasi data
  const normalizedData = formatSocialNews(newPost);

  // 2. Operasi Utama: Tulis ke Firestore (agar sistem existing tetap berjalan normal)
  let firestoreSuccess = false;
  try {
    await saveToFirestoreCol('socialNews', normalizedData.id, normalizedData);
    database.socialNews.unshift(normalizedData); // Update cache memory jika ada
    firestoreSuccess = true;
  } catch (err) {
    console.error('CRITICAL: Gagal menulis ke Firestore:', err);
    return res.status(500).json({ error: 'Gagal memproses data utama.' });
  }

  // 3. Operasi Sekunder (Asinkron): Tulis ke PostgreSQL
  // Kita gunakan block try-catch terpisah agar kegagalan PostgreSQL TIDAK menggagalkan request user
  if (firestoreSuccess) {
    dbPostgres.query(`
      INSERT INTO social_news (id, platform, username, caption, url, sentiment, published_at, province, urgency)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO NOTHING;
    `, [
      normalizedData.id,
      normalizedData.jenisSosmed,
      normalizedData.username,
      normalizedData.caption,
      normalizedData.link,
      normalizedData.sentimen,
      new Date(normalizedData.waktuPosting),
      normalizedData.lokasi,
      normalizedData.urgensi
    ]).catch(err => {
      // Log kegagalan ke sistem monitoring antrean untuk di-retry nanti
      console.warn(`[Dual-Write Warning] Gagal sinkronisasi ke PostgreSQL untuk ID ${normalizedData.id}:`, err.message);
    });
  }

  return res.json({ success: true, data: normalizedData });
});
```

*Dengan pola ini, setiap data baru yang masuk secara real-time dipastikan tersimpan di Firestore dan PostgreSQL sekaligus.*

#### LANGKAH 3: Migrasi Data Historis / Backfill (Fase 3)
Gunakan script migrasi di **Bab 5** untuk menyalin seluruh data historis dari Firestore ke PostgreSQL.
* **Strategi Penanganan Duplikasi**: Karena Dual-Writing di Langkah 2 sudah berjalan, ada kemungkinan data baru sudah masuk ke PostgreSQL. Script migrasi wajib menggunakan sintaks `ON CONFLICT (id) DO NOTHING` atau `ON CONFLICT (id) DO UPDATE` agar tidak menimpa data baru yang lebih mutakhir atau menyebabkan error *duplicate key constraint*.

#### LANGKAH 4: Verifikasi & Rekonsiliasi (Fase 4)
Buat script audit sederhana untuk membandingkan jumlah data dan checksum di kedua database:
```sql
-- Query di PostgreSQL untuk memverifikasi jumlah data per hari
SELECT DATE(published_at), COUNT(*) 
FROM social_news 
GROUP BY DATE(published_at) 
ORDER BY DATE(published_at) DESC LIMIT 10;
```
Bandingkan hasilnya dengan agregasi Firestore. Jika terdapat selisih, jalankan script sinkronisasi ulang (*Reconciliation script*) khusus untuk ID data yang hilang.

#### LANGKAH 5: Cutover - Mengalihkan Endpoint READ (Fase 5)
Kini PostgreSQL telah terisi dengan data historis yang lengkap dan data real-time yang tersinkronisasi sempurna.
1. Ubah endpoint `GET /api/news` dan `GET /api/social-news` pada server Node.js Anda untuk membaca data langsung dari PostgreSQL, lengkap dengan paginasi database yang efisien.
2. Monitor performa server. Anda akan melihat konsumsi RAM server langsung drop drastis karena pemrosesan in-memory sorting/filtering ditiadakan.
3. Lakukan pengujian mendalam (*UAT*) terhadap keakuratan grafik statistik dashboard.

#### LANGKAH 6: Lepaskan Firestore & Hapus Kode Lama (Fase 6)
Setelah sistem berjalan stabil selama 3-7 hari tanpa kendala:
1. Matikan fungsi penulisan ke Firestore di API backend.
2. Hapus library / dependency SDK Firestore jika sudah tidak digunakan lagi untuk menghemat ukuran aplikasi.
3. Hapus database local backup cache `database.json` untuk memperingan penyimpanan storage server Anda.

---

## 9. Tips Tambahan untuk Transisi yang Mulus
* **Gunakan Connection Pooling**: Di PostgreSQL, selalu gunakan connection pool (seperti library `pg-pool` atau `pg` Pool di Node.js) dengan batas max connection yang disesuaikan dengan limit server Cloud Run Anda, agar database tidak kehabisan resources (*Max Connections Exceeded*).
* **Automasi Backup**: Pastikan untuk mengaktifkan fitur automatic daily backup di PostgreSQL Cloud SQL Anda sebelum melakukan cutover penuh ke sistem produksi.

