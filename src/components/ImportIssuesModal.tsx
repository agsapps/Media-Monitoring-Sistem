import React, { useState, useRef } from 'react';
import { 
  X, HelpCircle, Download, FileSpreadsheet, Upload, AlertTriangle, 
  CheckCircle, RefreshCw, Clipboard, Database, AlertCircle
} from 'lucide-react';
import { useAppState } from '../AppContext';
import { Sentiment, NewsStatus, formatDateDDMMYYYY, formatSummaryText } from '../types';
import * as XLSX from 'xlsx';

interface ImportIssuesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedIssue {
  id: string;
  publishDate: string;
  publishTime: string;
  title: string;
  summary: string;
  mediaName: string;
  categoryName: string;
  sentiment: Sentiment;
  location: string;
  link: string;
  tags: string[];
  status: NewsStatus;
  imageUrl: string;
  isValid: boolean;
  errors: string[];
}

export const ImportIssuesModal: React.FC<ImportIssuesModalProps> = ({ isOpen, onClose }) => {
  const { categories, medias, batchImportNews, showToast } = useAppState();
  
  const [dragActive, setDragActive] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedIssue[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'preview'>('upload');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Excel serial date to DD-MM-YYYY
  const parseExcelDate = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];
    if (typeof val === 'number') {
      const dateObj = new Date((val - 25569) * 86400 * 1000);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString().split('T')[0];
      }
    }
    
    const str = String(val).trim();
    const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(str);
    if (dateMatch) return str;
    
    const tryDate = new Date(str);
    if (!isNaN(tryDate.getTime())) {
      return tryDate.toISOString().split('T')[0];
    }
    
    return new Date().toISOString().split('T')[0];
  };

  // Excel serial time or time string to HH:MM
  const parseExcelTime = (val: any): string => {
    if (!val) return '12:00';
    if (typeof val === 'number') {
      const totalMinutes = Math.round(val * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      const pad = (num: number) => String(num).padStart(2, '0');
      return `${pad(hours)}:${pad(minutes)}`;
    }
    const str = String(val).trim();
    if (/^\d{1,2}:\d{2}$/.test(str)) return str;
    const parts = str.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(h) && !isNaN(m)) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }
    return '12:00';
  };

  // Generate and download a real Excel .xlsx file template
  const handleDownloadTemplate = () => {
    const headers = [
      'Judul Berita',
      'URL/Tautan',
      'Sumber Media',
      'tanggal Publikasi',
      'Jam Publikasi',
      'Kluster Topik',
      'Lokasi Pemetaan Map',
      'Klasifikasi Sentimen',
      'Status Publikasi',
      'Tags',
      'Cover Link',
      'Highlight'
    ];

    const example1 = [
      'Kebijakan Penyelarasan Harga BBM Subsidi Dan Optimalisasi Penyaluran Digital',
      'https://www.detik.com/contoh-bbm-subsidi',
      medias[0]?.name || 'Detikcom',
      new Date().toISOString().split('T')[0],
      '08:15',
      categories[0]?.name || 'Subsidi & Distribusi',
      'DKI Jakarta',
      'Positif',
      'Published',
      'BBM, Subsidi, Digitalisasi',
      'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7',
      'Analisis menyarankan integrasi sistem terpusat untuk meminimalkan risiko penumpukan antrean.'
    ];

    const example2 = [
      'Dugaan Sindikat Penyelewengan BBM Solar Bersubsidi di SPBU Pantura Terungkap',
      'https://www.kompas.com/contoh-penyelewengan-solar',
      medias[1]?.name || 'Kompas',
      new Date().toISOString().split('T')[0],
      '14:20',
      categories[1]?.name || 'Infrastruktur',
      'Jawa Barat',
      'Negatif',
      'Published',
      'Penyelewengan, Solar, SPBU',
      '',
      'Satreskrim Polres setempat mengamankan armada truk modifikasi yang kedapatan menimbun solar bersubsidi secara ilegal.'
    ];

    // Build worksheet with SheetJS
    const aoaData = [headers, example1, example2];
    const ws = XLSX.utils.aoa_to_sheet(aoaData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Import Isu');
    
    // Write XLSX binary
    XLSX.writeFile(wb, 'template_import_isu_strategis.xlsx');
    showToast('Template Excel (.xlsx) berhasil diunduh!', 'success');
  };

  // Common mapping function for parsed data
  const processRawRows = (rows: any[][]) => {
    if (rows.length < 2) {
      showToast('Data baris Excel kosong atau tidak lengkap!', 'error');
      return;
    }

    const headers = rows[0].map(h => String(h || '').toLowerCase().trim());

    const getColIndex = (options: string[], defaultIdx: number): number => {
      for (const op of options) {
        const idx = headers.findIndex(h => h === op.toLowerCase() || h.includes(op.toLowerCase()));
        if (idx !== -1) return idx;
      }
      return defaultIdx;
    };

    const titleIdx = getColIndex(['judul berita', 'judul'], 0);
    const linkIdx = getColIndex(['url/tautan', 'link', 'tautan', 'url'], 1);
    const mediaIdx = getColIndex(['sumber media', 'media', 'sumber'], 2);
    const dateIdx = getColIndex(['tanggal publikasi', 'tanggal', 'date'], 3);
    const timeIdx = getColIndex(['jam publikasi', 'jam', 'waktu'], 4);
    const categoryIdx = getColIndex(['kluster topik', 'topik', 'kategori'], 5);
    const locationIdx = getColIndex(['lokasi pemetaan map', 'lokasi', 'provinsi'], 6);
    const sentimentIdx = getColIndex(['klasifikasi sentimen', 'sentimen', 'sentiment'], 7);
    const statusIdx = getColIndex(['status publikasi', 'status'], 8);
    const tagsIdx = getColIndex(['tags', 'tag'], 9);
    const coverIdx = getColIndex(['cover link', 'cover', 'gambar', 'image'], 10);
    const highlightIdx = getColIndex(['highlight', 'ringkasan', 'summary'], 11);

    const parsed: ParsedIssue[] = [];

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;
      
      // Check if row is entirely empty
      const isRowEmpty = row.every(val => val === null || val === undefined || String(val).trim() === '');
      if (isRowEmpty) continue;

      const rawTitle = row[titleIdx];
      const rawLink = row[linkIdx];
      const rawMedia = row[mediaIdx];
      const rawDate = row[dateIdx];
      const rawTime = row[timeIdx];
      const rawCat = row[categoryIdx];
      const rawLoc = row[locationIdx];
      const rawSentiment = row[sentimentIdx];
      const rawStatus = row[statusIdx];
      const rawTags = row[tagsIdx];
      const rawCover = row[coverIdx];
      const rawHighlight = row[highlightIdx];

      const errors: string[] = [];

      // Validations
      const stringTitle = String(rawTitle || '').trim();
      const stringHighlight = String(rawHighlight || '').trim();

      if (!stringTitle) {
        errors.push('Judul Berita wajib diisi');
      }
      if (!stringHighlight) {
        errors.push('Highlight/Ringkasan wajib diisi');
      }

      const finalDate = parseExcelDate(rawDate);
      const finalTime = parseExcelTime(rawTime);

      // Sentiment checking
      let finalSentiment: Sentiment = 'Netral';
      const sentStr = String(rawSentiment || '').toLowerCase().trim();
      if (sentStr.includes('pos')) finalSentiment = 'Positif';
      else if (sentStr.includes('neg')) finalSentiment = 'Negatif';
      else finalSentiment = 'Netral';

      // Category matching
      const catStr = String(rawCat || '').trim();
      let matchedCategory = categories.find(c => c.name.toLowerCase() === catStr.toLowerCase());
      if (!matchedCategory && catStr) {
        matchedCategory = categories.find(c => c.name.toLowerCase().includes(catStr.toLowerCase()));
        if (!matchedCategory) {
          errors.push(`Kategori "${catStr}" tidak terdaftar (Digantikan "${categories[0]?.name || 'Subsidi & Distribusi'}")`);
        }
      }

      // Media matching
      const mediaStr = String(rawMedia || '').trim();
      let matchedMedia = medias.find(m => m.name.toLowerCase() === mediaStr.toLowerCase());
      if (!matchedMedia && mediaStr) {
        matchedMedia = medias.find(m => m.name.toLowerCase().includes(mediaStr.toLowerCase()));
        if (!matchedMedia) {
          errors.push(`Media "${mediaStr}" belum terdaftar di Master (Akan dimasukkan secara otomatis atau fallback)`);
        }
      }

      // Status matching
      let finalStatus: NewsStatus = 'Published';
      if (String(rawStatus || '').toLowerCase().includes('draft')) {
        finalStatus = 'Draft';
      }

      // Tags split
      let parsedTags: string[] = [];
      const tagStr = String(rawTags || '').trim();
      if (tagStr) {
        parsedTags = tagStr.split(',').map(t => t.trim()).filter(Boolean);
      }

      parsed.push({
        id: `news-excel-${Date.now()}-${r}`,
        title: stringTitle,
        link: String(rawLink || '').trim(),
        mediaName: mediaStr || (medias[0]?.name || 'Detikcom'),
        publishDate: finalDate,
        publishTime: finalTime,
        categoryName: matchedCategory ? matchedCategory.name : (categories[0]?.name || 'Subsidi & Distribusi'),
        location: String(rawLoc || '').trim() || 'DKI Jakarta',
        sentiment: finalSentiment,
        status: finalStatus,
        tags: parsedTags,
        imageUrl: String(rawCover || '').trim(),
        summary: stringHighlight,
        isValid: !errors.some(e => e.includes('wajib')),
        errors
      });
    }

    setParsedData(parsed);
    setImportStep('preview');
    showToast(`Berhasil membaca ${parsed.length} entri data dari spreadsheet!`, 'info');
  };

  // Drag of files
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileRead(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileRead(e.target.files[0]);
    }
  };

  const handleFileRead = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstream = event.target?.result;
        const workbook = XLSX.read(bstream, { type: 'binary', cellDates: false });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
        processRawRows(rawRows);
      } catch (err) {
        showToast('Galat membaca file Excel! Pastikan file valid .xlsx atau .xls', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Convert tab-delimited paste values directly
  const handlePasteSubmit = () => {
    if (!pasteText.trim()) return;
    const lines = pasteText.split(/\r?\n/).filter(line => line.trim().length > 0);
    const rawRows = lines.map(line => line.split('\t'));
    processRawRows(rawRows);
  };

  // Commit imported items
  const handleConfirmImport = async () => {
    const validItems = parsedData.filter(d => d.isValid);
    if (validItems.length === 0) {
      showToast('Tidak ada data rilis isu baru yang valid untuk diunggah!', 'error');
      return;
    }

    setIsSubmitting(true);
    showToast(`Mengunggah ${validItems.length} rilis isu baru ke server...`, 'info');

    try {
      const payloadItems = validItems.map(vi => ({
        id: vi.id,
        title: vi.title,
        summary: vi.summary,
        link: vi.link,
        publishDate: vi.publishDate,
        publishTime: vi.publishTime,
        location: vi.location,
        sentiment: vi.sentiment,
        tags: vi.tags,
        status: vi.status,
        categoryName: vi.categoryName,
        mediaName: vi.mediaName,
        imageUrl: vi.imageUrl
      }));

      const res = await batchImportNews(payloadItems);
      if (res && res.success) {
        showToast(`Berhasil menyimpan ${res.count} isu strategis baru secara kolektif!`, 'success');
        onClose();
        // Clear forms
        setParsedData([]);
        setPasteText('');
        setImportStep('upload');
      } else {
        showToast('Gagal memproses unggah massal ke server!', 'error');
      }
    } catch (err) {
      showToast('Galat proses transmisi impor!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden my-4 flex flex-col max-h-[90vh]">
        {/* Color stripe */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-blue-600 to-indigo-600" />

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-5.5 h-5.5 text-emerald-600 dark:text-emerald-500" />
              Unggah & Impor Isu Massal (Excel)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Impor data kliping berita isu nasional langsung via dokumen Microsoft Excel (.xlsx) atau salinan sel spreadsheet.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Container Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {importStep === 'upload' ? (
            <div className="space-y-6">
              {/* Instructions banner */}
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/40 rounded-2xl flex items-start gap-3.5 shadow-xs">
                <div className="p-2 bg-emerald-600 dark:bg-emerald-500 text-white rounded-xl">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">Bagaimana Cara Mengimpor Data Excel?</h4>
                  <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                    Unduh file template Excel (.xlsx) resmi di bawah ini, silakan melakukan pengisian kolom baris isu strategis Anda, dan seret berkas tersebut ke area dropzone di bawah.
                    <br />
                    <span className="block mt-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold font-sans">
                      * Kolom yang wajib diisi sekurangnya adalah "Judul Berita" dan "Highlight". Kolom lainnya adaptif menggunakan auto-fallback.
                    </span>
                  </p>
                  
                  <button
                    onClick={handleDownloadTemplate}
                    className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.8 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Template Excel (.xlsx) Resmi</span>
                  </button>
                </div>
              </div>

              {/* Upload Dropzone Container Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* File Dropzone */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Metode 1: Unggah Dokumen Berkas Excel (.xlsx, .xls)</label>
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-56 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition cursor-pointer ${
                      dragActive 
                        ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-950/60 bg-slate-50/50 dark:bg-slate-950/10'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Seret & taruh file Excel template di sini
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-light">
                      Atau klik untuk memilih berkas dari komputer Anda
                    </p>
                    <div className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl text-[10.5px] font-bold shadow-xs">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
                      <span>Cari File Excel</span>
                    </div>
                  </div>
                </div>

                {/* Direct Excel copy-paste field */}
                <div className="space-y-2 flex flex-col">
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Metode 2: Salin-Tempel (Copas) Tabel Spreadsheet</label>
                  <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-slate-950/10 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                      <Clipboard className="w-4 h-4 text-slate-455" />
                      <span className="text-[10.5px] font-medium leading-none">Paste cel spreadsheet Anda (termasuk helai header) di bawah ini:</span>
                    </div>
                    <textarea
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                      placeholder={'Judul Berita\tURL/Tautan\tSumber Media\ttanggal Publikasi\t...\nContoh Berita\thttps://..\tDetikcom\t2026-05-29\t...'}
                      className="flex-1 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 leading-relaxed min-h-[140px]"
                    />
                    <button
                      type="button"
                      onClick={handlePasteSubmit}
                      disabled={!pasteText.trim()}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-55 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
                    >
                      Proses Data Tempel
                    </button>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            // Preview Step
            <div className="space-y-5">
              {/* Validation Summary Stats banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/55 dark:border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                    <Database className="w-5.5 h-5.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">Pratinjau Data Impor Excel</h4>
                    <p className="text-[10px] text-slate-400">Silakan tinjau kebenaran kolom data hasil parsing Excel sebelum dimasukkan ke database.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center sm:text-right">
                    <span className="text-xs font-semibold text-slate-500">Total Terbaca</span>
                    <p className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">{parsedData.length}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-center sm:text-right">
                    <span className="text-xs font-semibold text-emerald-600">Siap Ditayangkan</span>
                    <p className="text-sm font-extrabold text-emerald-600 font-mono">{parsedData.filter(d => d.isValid).length}</p>
                  </div>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                  <div className="text-center sm:text-right">
                    <span className="text-xs font-semibold text-rose-500">Gagal / Peringatan</span>
                    <p className="text-sm font-extrabold text-rose-500 font-mono">{parsedData.filter(d => !d.isValid || d.errors.length > 0).length}</p>
                  </div>
                </div>
              </div>

              {/* Data Rows Preview Container Table */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                <div className="overflow-x-auto max-h-[42vh]">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/40 text-slate-400 font-bold font-mono text-[9.5px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="py-2.5 px-3">Status Data</th>
                        <th className="py-2.5 px-3">Judul Berita</th>
                        <th className="py-2.5 px-3">Highlight / Ringkasan</th>
                        <th className="py-2.5 px-3">Tanggal & Waktu</th>
                        <th className="py-2.5 px-3">Kluster Topik</th>
                        <th className="py-2.5 px-3">Sentimen</th>
                        <th className="py-2.5 px-3">Sumber Media</th>
                        <th className="py-2.5 px-3">Lokasi</th>
                        <th className="py-2.5 px-3">Tags & Tautan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                      {parsedData.map((item, index) => (
                        <tr key={index} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/15 transition ${!item.isValid ? 'bg-rose-50/20 dark:bg-rose-950/5' : ''}`}>
                          
                          {/* Match State Badge */}
                          <td className="py-3 px-3">
                            {item.isValid ? (
                              item.errors.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-md font-bold text-amber-600 bg-amber-50">
                                  <AlertTriangle className="w-3 h-3" />
                                  Peringatan ({item.errors.length})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-md font-bold text-emerald-600 bg-emerald-50">
                                  <CheckCircle className="w-3 h-3" />
                                  Valid
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9.5px] px-2 py-0.5 rounded-md font-bold text-rose-600 bg-rose-50">
                                  <AlertCircle className="w-3 h-3" />
                                  Eror Kritis
                                </span>
                            )}
                          </td>

                          {/* Column variables mapped */}
                          <td className="py-3 px-3 max-w-[200px]">
                            <p className="font-bold text-slate-900 dark:text-white truncate" title={item.title}>
                              {item.title}
                            </p>
                            {item.errors.length > 0 && (
                              <ul className="text-[10px] text-rose-500 dark:text-rose-400 mt-1 list-disc list-inside bg-rose-50/30 p-1.5 rounded-lg border border-rose-100/50">
                                {item.errors.map((e, idx) => (
                                  <li key={idx}>{e}</li>
                                ))}
                              </ul>
                            )}
                          </td>

                          <td className="py-3 px-3 max-w-[250px] truncate" title={formatSummaryText(item.summary)}>
                            {formatSummaryText(item.summary)}
                          </td>

                          <td className="py-3 px-3 font-mono text-[10px] whitespace-nowrap">
                            📅 {formatDateDDMMYYYY(item.publishDate)} <br />
                            ⏰ {item.publishTime}
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap font-bold">
                            {item.categoryName}
                          </td>

                          <td className="py-3 px-3">
                            <span className={`inline-block px-1.8 py-0.5 rounded text-[10px] font-bold ${
                              item.sentiment === 'Positif' ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/15' :
                              item.sentiment === 'Negatif' ? 'text-red-600 bg-red-50 dark:bg-red-950/20' :
                              'text-blue-500 bg-blue-50 dark:bg-blue-950/20'
                            }`}>
                              {item.sentiment}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-medium">
                            {item.mediaName}
                          </td>

                          <td className="py-3 px-3">
                            📍 {item.location}
                          </td>

                          <td className="py-3 px-3 max-w-[150px]">
                            <div className="flex flex-wrap gap-1 mb-1">
                              {item.tags.map((tag, tIdx) => (
                                <span key={tIdx} className="bg-slate-100 dark:bg-slate-800 text-[9px] px-1 rounded text-slate-600 dark:text-slate-400 truncate max-w-[60px]">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                            {item.link && (
                              <a href={item.link} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-[10px] truncate block">
                                Hubungkan Tautan
                              </a>
                            )}
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 font-sans">
          {importStep === 'upload' ? (
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 order-2 sm:order-1 font-normal">
              <span>Sistem mendukung berkas format Excel (.xlsx, .xls) & direct spreadsheet paste.</span>
            </div>
          ) : (
            <button
              onClick={() => setImportStep('upload')}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 hover:border-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl transition cursor-pointer order-2 sm:order-1"
            >
              Kembali ke Upload
            </button>
          )}

          <div className="flex gap-2.5 w-full sm:w-auto order-1 sm:order-2">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Batalkan
            </button>
            
            {importStep === 'preview' && (
              <button
                onClick={handleConfirmImport}
                disabled={isSubmitting || parsedData.filter(d => d.isValid).length === 0}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-55 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengunggah data...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Konfirmasi Impor ({parsedData.filter(d => d.isValid).length} Isu)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
