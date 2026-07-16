export type Sentiment = 'Positif' | 'Negatif' | 'Netral';
export type NewsStatus = 'Draft' | 'Published';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  link: string;
  mediaId: string;
  mediaName: string;
  publishDate: string;
  publishTime?: string;
  location?: string;
  categoryId: string;
  categoryName: string;
  sentiment: Sentiment;
  tags: string[];
  imageUrl?: string;
  status: NewsStatus;
  createdAt: string;
  updatedAt: string;
  isFeatured?: boolean;
  statusWaktu?: string;
  status_waktu?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string; // Tailwind color class e.g., 'bg-blue-500'
}

export interface MediaSource {
  id: string;
  name: string;
  type: 'Online' | 'Cetak' | 'TV' | 'Radio';
  reach: 'Nasional' | 'Lokal' | 'Internasional';
  date?: string;
  provinsi?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: 'Admin' | 'Analis' | 'Viewer' | 'Editor';
  status?: 'Aktif' | 'Nonaktif';
  createdAt?: string;
  lastLogin?: string;
  avatarUrl?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  role: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface CustomSettings {
  companyName: string;
  logoUrl: string;
  primaryColor: string; // e.g. '#0f172a' (navy)
  headerText: string;
  footerText: string;
  enableAiAssistant: boolean;
  theme: 'light' | 'dark';
  googleSpreadsheetId?: string;
  googleSheetName?: string;
  googleSheetSosmedName?: string;
  googleSpreadsheetUrl?: string;
  autoRefreshDashboard?: boolean;
  schedulerIntervalMinutes?: number;
  autoCrawlKeywords?: string;
  autoCrawlMethod?: string;
  schedulerMaxItemsPerKeyword?: number;
  autoCrawlTargetCategory?: string;
  autoCrawlDefaultStatus?: 'Draft' | 'Published';
  serpApiKey?: string;
  openSerpUrl?: string;
  openSerpApiKey?: string;
  pdfExportLogoLeft?: string;
  pdfExportLogoRight?: string;
  pdfExportLogoCoverLeft?: string;
  pdfExportLogoCoverRight?: string;
  twitterApiIoKey?: string;
  newsApiKey?: string;
  fonnteToken?: string;
  fonnteTarget?: string;
  fonnteTargets?: string[];
  fonnteCategories?: string[];
  whatsappProvider?: 'fonnte' | 'openwa';
  openWaVpsUrl?: string;
  openWaToken?: string;
}

export interface CrawlKeyword {
  id: string;
  text: string;
  active: boolean;
  createdAt: string;
}

export const PROVINCES = [
  'Nasional',
  'Aceh',
  'Sumatera Utara',
  'Sumatera Barat',
  'Riau',
  'Kepulauan Riau',
  'Jambi',
  'Sumatera Selatan',
  'Kepulauan Bangka Belitung',
  'Bengkulu',
  'Lampung',
  'DKI Jakarta',
  'Jawa Barat',
  'Jawa Tengah',
  'DI Yogyakarta',
  'Jawa Timur',
  'Banten',
  'Kalimantan Barat',
  'Kalimantan Tengah',
  'Kalimantan Selatan',
  'Kalimantan Timur',
  'Kalimantan Utara',
  'Sulawesi Utara',
  'Sulawesi Tengah',
  'Sulawesi Selatan',
  'Sulawesi Tenggara',
  'Gorontalo',
  'Sulawesi Barat',
  'Bali',
  'Nusa Tenggara Barat',
  'Nusa Tenggara Timur',
  'Maluku',
  'Maluku Utara',
  'Papua',
  'Papua Barat',
  'Papua Selatan',
  'Papua Tengah',
  'Papua Pegunungan',
  'Papua Barat Daya'
];


export interface DashboardStats {
  totalNews: number;
  sentimentCounts: {
    positif: number;
    negatif: number;
    netral: number;
  };
  sentimentPercentages: {
    positif: number;
    negatif: number;
    netral: number;
  };
  mediaDistribution: { name: string; count: number }[];
  categoryDistribution: { name: string; count: number; color: string }[];
  timelineData: { date: string; positif: number; negatif: number; netral: number; total: number }[];
  topTags: { name: string; count: number }[];
  featuredIssues: string[];
}

export interface Highlight {
  id: string;
  title: string;
  summary: string;
  publishDate: string;
  publishTime?: string;
  location: string;
  categoryName: string;
  mediaName: string;
  link: string;
  imageUrl?: string;
  sentiment?: string;
  isPinned?: boolean;
  orderIndex: number;
  createdAt: string;
}

export const formatDateDDMMYYYY = (dateStr: string): string => {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  // Check if it's already in DD-MM-YYYY format or similar
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) return trimmed;
  
  // Try parsing YYYY-MM-DD
  const match = trimmed.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}-${month}-${year}`;
  }

  // Fallback try: new Date()
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  return trimmed;
};

export const formatSummaryText = (text: string): string => {
  if (!text) return '';
  const pattern = /\[\s*(?:Analisis\s+Strategis\s+AI|Analisis\s+Mitigasi\s+AI|Analisis\s+AI|Analisis\s+Ai|Analisis\s+Mitigasi|Strategic\s+Analysis\s+AI|Strategic\s+Analysis|Analisis\s+Strategis|Stategis\s+AI)\s*\]/gi;
  return text.replace(pattern, '[Analisis]');
};

export const cleanTitleText = (title: string): string => {
  if (!title) return '';
  const pattern = /^\[\s*(?:Analisis\s+Strategis\s+AI|Analisis\s+Mitigasi\s+AI|Analisis\s+AI|Analisis\s+Ai|Analisis\s+Mitigasi|Strategic\s+Analysis\s+AI|Strategic\s+Analysis|Analisis\s+Strategis|Stategis\s+AI|analisis|analysis|review)\s*\]\s*/i;
  return title.replace(pattern, '').trim();
};

