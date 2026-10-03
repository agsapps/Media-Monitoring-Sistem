# 📰 Media Intelligence Monitoring System

Sistem monitoring media dan analisis sentimen berita yang dibangun buat membantu tim PR dalam memantau pemberitaan harian, menganalisis sentimen, sampai menghasilkan buletin eksekutif secara otomatis. Semua proses analisisnya sudah dibantu oleh **AI** biar kerjanya lebih cepat dan nggak manual lagi.

> Dibangun pakai stack modern: Node.js + React 19 (Vite) + Express.js + Prisma + AI.

---

## ✨ Fitur Utama

### 📊 Dashboard Eksekutif
- Ringkasan total berita + tracker sentimen (Positif / Negatif / Netral) dalam bentuk persentase.
- Grafik kronologi harian, pie chart komposisi sentimen, dan bar chart media paling aktif.
- Ekspor data otomatis ke **Excel / CSV**.

### 🌐 Portal Publik
- Tampilan portal berita minimalis, perlu login buat pengunjung.
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

## 🛠️ Tech Stack

- **Frontend:** React 19 + Vite + Tailwind CSS + Recharts
- **Backend:** Express.js (Node.js)
- **Database:** PostgreSQL + Prisma ORM
- **PDF Generation:** jsPDF
- **AI Engine:** Google Gemini API

### Struktur Folder Utama

## 🗄️ Rancangan Skema Database (Prisma PostgreSQL)
