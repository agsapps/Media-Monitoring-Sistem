/**
 * Google Sheets API Integration Service
 */

export interface SheetIssueInput {
  id: string;
  publishDate: string;
  publishTime: string;
  title: string;
  summary: string;
  mediaName: string;
  categoryName: string;
  sentiment: string;
  location: string;
  link: string;
  tags: string[];
  status: string;
}

export interface SheetSocialInput {
  id: string;
  tanggalInput: string;
  jenisSosmed: string;
  username: string;
  caption: string;
  link: string;
  waktuPosting: string;
  sentimen: string;
  kategori: string;
  lokasi: string;
  urgensi: string;
  ringkasan: string;
  analisis: string;
}

const recentlyAppendedIds = new Set<string>();
const recentlyAppendedSocialIds = new Set<string>();

const SH_HEADERS = [
  'ID Isu',
  'Tanggal Terbit',
  'Waktu Terbit',
  'Judul Berita/Isu',
  'Ringkasan Isu',
  'Sumber Media',
  'Kategori/Topik',
  'Sentimen',
  'Lokasi (Provinsi)',
  'Tautan (Link)',
  'Tag Kata Kunci',
  'Status Publikasi'
];

const SOSMED_HEADERS = [
  'ID Sosmed',
  'Tanggal Input',
  'Jenis Sosmed',
  'Username',
  'Caption/Teks',
  'Tautan (Link)',
  'Waktu Posting',
  'Sentimen',
  'Kategori',
  'Lokasi (Provinsi)',
  'Urgensi',
  'Ringkasan',
  'Analisis'
];


/**
 * Clean tags to string representation
 */
const cleanTags = (tags: string[] | string): string => {
  if (Array.isArray(tags)) {
    return tags.join(', ');
  }
  return tags || '';
};

/**
 * Format an issue object to a Sheets row array
 */
const formatIssueRow = (issue: SheetIssueInput): any[] => {
  return [
    issue.id || '',
    issue.publishDate || '',
    issue.publishTime || '12:00',
    issue.title || '',
    issue.summary || '',
    issue.mediaName || '',
    issue.categoryName || '',
    issue.sentiment || 'Netral',
    issue.location || 'DKI Jakarta',
    issue.link || '',
    cleanTags(issue.tags),
    issue.status || 'Published'
  ];
};

/**
 * Fetch sheets metadata to identify available sheet tab names
 */
export async function getSpreadsheetSheets(accessToken: string, spreadsheetId: string): Promise<string[]> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch spreadsheet. Status: ${res.status}`);
    }

    const data = await res.json();
    if (data.sheets && Array.isArray(data.sheets)) {
      return data.sheets.map((s: any) => s.properties.title);
    }
    return ['Sheet1'];
  } catch (err) {
    console.error('Error fetching sheets names:', err);
    throw err;
  }
}

/**
 * Create a new spreadsheet with header pre-populated
 */
export async function createSpreadsheet(
  accessToken: string,
  companyName: string
): Promise<{ id: string; url: string; sheetName: string }> {
  try {
    const titleName = `Dokumentasi Isu & Pantauan Sosmed - ${companyName}`;
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: titleName
        },
        sheets: [
          {
            properties: {
              title: 'Daftar Isu'
            }
          },
          {
            properties: {
              title: 'Pantauan Sosmed'
            }
          }
        ]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal membuat spreadsheet: ${errText}`);
    }

    const data = await res.json();
    const spreadsheetId = data.spreadsheetId;
    const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    const sheetName = 'Daftar Isu';

    // Populate Headers immediately for both tabs
    await writeSheetRange(accessToken, spreadsheetId, `Daftar Isu!A1:L1`, [SH_HEADERS]);
    await writeSheetRange(accessToken, spreadsheetId, `Pantauan Sosmed!A1:M1`, [SOSMED_HEADERS]);

    return {
      id: spreadsheetId,
      url: spreadsheetUrl,
      sheetName
    };
  } catch (err) {
    console.error('Error creating spreadsheet:', err);
    throw err;
  }
}

/**
 * Write value rows to a specific range (overwrites selected range)
 */
export async function writeSheetRange(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  rows: any[][]
): Promise<boolean> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: rows
    })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Error writing sheet range ${range}:`, text);
    throw new Error(`Write failed: ${text}`);
  }
  return true;
}

/**
 * Append an issue row to Google Sheets
 */
export async function appendIssueToSheet(
  accessToken: string,
  spreadsheetId: string,
  configuredSheetName: string,
  issue: SheetIssueInput
): Promise<boolean> {
  if (issue.id && recentlyAppendedIds.has(issue.id)) {
    console.log(`[Sheets Deduplication] Issue ${issue.id} already appended recently.`);
    return true;
  }
  if (issue.id) {
    recentlyAppendedIds.add(issue.id);
    if (recentlyAppendedIds.size > 200) {
      const firstKey = recentlyAppendedIds.values().next().value;
      if (firstKey) recentlyAppendedIds.delete(firstKey);
    }
  }

  try {
    let sheetName = configuredSheetName || 'Daftar Isu';
    
    // Safety check: verify active sheet name tabs in metadata
    try {
      const tabs = await getSpreadsheetSheets(accessToken, spreadsheetId);
      if (tabs.length > 0 && !tabs.includes(sheetName)) {
        sheetName = tabs[0]; // fallback to first tab
      }
    } catch {
      // fallback to whatever they provided if fetch fails
    }

    const escapedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
    const range = `${escapedSheetName}!A:L`;
    const rowValues = formatIssueRow(issue);

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [rowValues]
      })
    });

    if (!res.ok) {
      // If the append failed because of write permissions or missing headers, let's create a header row or fail
      const text = await res.text();
      throw new Error(`Append failed: ${text}`);
    }

    return true;
  } catch (err) {
    console.error('Error appending issue to sheet:', err);
    throw err;
  }
}

/**
 * Bulk export all issues to connected Google Sheets Spreadsheet
 */
export async function bulkExportIssuesToSheet(
  accessToken: string,
  spreadsheetId: string,
  configuredSheetName: string,
  issues: SheetIssueInput[]
): Promise<boolean> {
  try {
    let sheetName = configuredSheetName || 'Daftar Isu';

    try {
      const tabs = await getSpreadsheetSheets(accessToken, spreadsheetId);
      if (tabs.length > 0 && !tabs.includes(sheetName)) {
        sheetName = tabs[0];
      }
    } catch {
      // fallback
    }

    const escapedSheetName = `'${sheetName.replace(/'/g, "''")}'`;

    // Build complete grid: headers + all matching row cards
    const rowData = [SH_HEADERS, ...issues.map(formatIssueRow)];

    // First let's clear the entire existing data using clear API (up to 100,000 rows) to prevent orphan older rows
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(escapedSheetName + '!A1:Z100000')}:clear`;
    const clearRes = await fetch(clearUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      }
    });
    if (!clearRes.ok) {
      const clearErr = await clearRes.text();
      console.warn(`Clear operation failed/warned for ${sheetName}:`, clearErr);
    }

    // Write fresh data in chunks of 500 rows using :append to auto-expand grid boundaries
    const chunkSize = 500;
    for (let i = 0; i < rowData.length; i += chunkSize) {
      const chunk = rowData.slice(i, i + chunkSize);
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(escapedSheetName + '!A1')}:append?valueInputOption=USER_ENTERED`;
      const res = await fetch(appendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${escapedSheetName}!A1`,
          majorDimension: 'ROWS',
          values: chunk
        })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Error appending chunk ${i} to sheet ${sheetName}:`, text);
        throw new Error(`Write failed: ${text}`);
      }
    }

    return true;
  } catch (err) {
    console.error('Error executing bulk export to sheet:', err);
    throw err;
  }
}

/**
 * Fetch and parse issues from Google Sheets Spreadsheet
 */
export async function readIssuesFromSheet(
  accessToken: string,
  spreadsheetId: string,
  configuredSheetName: string
): Promise<any[]> {
  try {
    let sheetName = configuredSheetName || 'Daftar Isu';

    try {
      const tabs = await getSpreadsheetSheets(accessToken, spreadsheetId);
      if (tabs.length > 0 && !tabs.includes(sheetName)) {
        sheetName = tabs[0];
      }
    } catch {
      // fallback
    }

    const escapedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(escapedSheetName + '!A1:L100000')}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gagal mengunduh sheet: ${errText}`);
    }

    const data = await res.json();
    const rows = data.values || [];
    if (rows.length === 0) {
      return [];
    }

    const headers = rows[0].map((h: string) => h?.toLowerCase().trim() || '');
    const dataRows = rows.slice(1);

    // Dynamic mapping map
    const mapHeaderIndex = (name: string, fallbackIdx: number): number => {
      const idx = headers.indexOf(name.toLowerCase());
      return idx !== -1 ? idx : fallbackIdx;
    };

    // Columns indices map
    const idIdx = mapHeaderIndex('id isu', 0);
    const dateIdx = mapHeaderIndex('tanggal terbit', 1);
    const timeIdx = mapHeaderIndex('waktu terbit', 2);
    const titleIdx = mapHeaderIndex('judul berita/isu', 3);
    const summaryIdx = mapHeaderIndex('ringkasan isu', 4);
    const mediaIdx = mapHeaderIndex('sumber media', 5);
    const categoryIdx = mapHeaderIndex('kategori/topik', 6);
    const sentimentIdx = mapHeaderIndex('sentimen', 7);
    const locationIdx = mapHeaderIndex('lokasi (provinsi)', 8);
    const linkIdx = mapHeaderIndex('tautan (link)', 9);
    const tagsIdx = mapHeaderIndex('tag kata kunci', 10);
    const statusIdx = mapHeaderIndex('status publikasi', 11);

    const issues: any[] = [];

    for (const r of dataRows) {
      const title = r[titleIdx]?.trim() || '';
      const summary = r[summaryIdx]?.trim() || '';
      
      // Title and summary are minimum requested fields
      if (!title) {
        continue;
      }

      // Safe clean dates
      let publishDate = r[dateIdx]?.trim() || '';
      if (!publishDate) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        publishDate = `${yyyy}-${mm}-${dd}`;
      }

      // Check tags
      const tagStr = r[tagsIdx] || '';
      let tags: string[] = [];
      if (typeof tagStr === 'string' && tagStr.trim()) {
        tags = tagStr.split(',').map((t: string) => t.trim()).filter(Boolean);
      } else if (Array.isArray(tagStr)) {
        tags = tagStr;
      }

      // Format clean status
      let statusValue = r[statusIdx]?.trim() || 'Published';
      if (statusValue.toLowerCase() === 'draft') statusValue = 'Draft';
      else statusValue = 'Published';

      // Title capitalization of sentiment mapping
      let sentimentValue = 'Netral';
      const rawSent = r[sentimentIdx]?.trim()?.toLowerCase() || '';
      if (rawSent.includes('positif')) sentimentValue = 'Positif';
      else if (rawSent.includes('negatif')) sentimentValue = 'Negatif';
      else if (rawSent.includes('netral')) sentimentValue = 'Netral';

      issues.push({
        id: r[idIdx]?.trim() || '',
        publishDate,
        publishTime: r[timeIdx]?.trim() || '12:00',
        title,
        summary,
        mediaName: r[mediaIdx]?.trim() || '',
        categoryName: r[categoryIdx]?.trim() || '',
        sentiment: sentimentValue,
        location: r[locationIdx]?.trim() || 'DKI Jakarta',
        link: r[linkIdx]?.trim() || '',
        tags,
        status: statusValue
      });
    }

    return issues;
  } catch (err) {
    console.error('Error reading issues from sheet:', err);
    throw err;
  }
}

/**
 * Format a social news object to a Sheets row array
 */
const formatSocialRow = (item: SheetSocialInput): any[] => {
  return [
    item.id || '',
    item.tanggalInput || '',
    item.jenisSosmed || 'Lainnya',
    item.username || '',
    item.caption || '',
    item.link || '',
    item.waktuPosting || '',
    item.sentimen || 'Netral',
    item.kategori || '',
    item.lokasi || 'Nasional',
    item.urgensi || 'Rendah',
    item.ringkasan || '',
    item.analisis || ''
  ];
};

/**
 * Append a social news row to Google Sheets
 */
export async function appendSocialToSheet(
  accessToken: string,
  spreadsheetId: string,
  configuredSheetName: string,
  socialItem: SheetSocialInput
): Promise<boolean> {
  if (socialItem.id && recentlyAppendedSocialIds.has(socialItem.id)) {
    console.log(`[Sheets Deduplication] Social ${socialItem.id} already appended recently.`);
    return true;
  }
  if (socialItem.id) {
    recentlyAppendedSocialIds.add(socialItem.id);
    if (recentlyAppendedSocialIds.size > 200) {
      const firstKey = recentlyAppendedSocialIds.values().next().value;
      if (firstKey) recentlyAppendedSocialIds.delete(firstKey);
    }
  }

  try {
    let sheetName = configuredSheetName || 'Pantauan Sosmed';
    
    // Safety check: verify active sheet name tabs in metadata
    try {
      const tabs = await getSpreadsheetSheets(accessToken, spreadsheetId);
      if (tabs.length > 0 && !tabs.includes(sheetName)) {
        const found = tabs.find(t => t.toLowerCase().includes('sosmed') || t.toLowerCase().includes('social'));
        if (found) sheetName = found;
      }
    } catch {
      // fallback
    }

    const escapedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
    const range = `${escapedSheetName}!A:M`;
    const rowValues = formatSocialRow(socialItem);

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: [rowValues]
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Append failed: ${text}`);
    }

    return true;
  } catch (err) {
    console.error('Error appending social item to sheet:', err);
    throw err;
  }
}

/**
 * Bulk export all social news items to connected Google Sheets Spreadsheet
 */
export async function bulkExportSocialToSheet(
  accessToken: string,
  spreadsheetId: string,
  configuredSheetName: string,
  socialItems: SheetSocialInput[]
): Promise<boolean> {
  try {
    let sheetName = configuredSheetName || 'Pantauan Sosmed';

    try {
      const tabs = await getSpreadsheetSheets(accessToken, spreadsheetId);
      if (tabs.length > 0 && !tabs.includes(sheetName)) {
        const found = tabs.find(t => t.toLowerCase().includes('sosmed') || t.toLowerCase().includes('social'));
        if (found) sheetName = found;
      }
    } catch {
      // fallback
    }

    const escapedSheetName = `'${sheetName.replace(/'/g, "''")}'`;
    const rowData = [SOSMED_HEADERS, ...socialItems.map(formatSocialRow)];

    // First clear range (up to 100,000 rows)
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(escapedSheetName + '!A1:Z100000')}:clear`;
    const clearRes = await fetch(clearUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      }
    });
    if (!clearRes.ok) {
      const clearErr = await clearRes.text();
      console.warn(`Clear operation failed/warned for social news ${sheetName}:`, clearErr);
    }

    // Write fresh data in chunks of 500 rows using :append to auto-expand grid boundaries
    const chunkSize = 500;
    for (let i = 0; i < rowData.length; i += chunkSize) {
      const chunk = rowData.slice(i, i + chunkSize);
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(escapedSheetName + '!A1')}:append?valueInputOption=USER_ENTERED`;
      const res = await fetch(appendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${escapedSheetName}!A1`,
          majorDimension: 'ROWS',
          values: chunk
        })
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`Error appending social chunk ${i} to sheet ${sheetName}:`, text);
        throw new Error(`Write failed: ${text}`);
      }
    }

    return true;
  } catch (err) {
    console.error('Error executing bulk export of social items to sheet:', err);
    throw err;
  }
}


