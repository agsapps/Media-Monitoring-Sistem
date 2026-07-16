import { jsPDF } from "jspdf";

export const DEFAULT_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480" width="400" height="480">
  <defs>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F2C94C" />
      <stop offset="30%" stop-color="#FFF2B2" />
      <stop offset="70%" stop-color="#D4AF37" />
      <stop offset="100%" stop-color="#9A7B1C" />
    </linearGradient>
    <linearGradient id="shieldBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1A1A1A" />
      <stop offset="100%" stop-color="#0A0A0A" />
    </linearGradient>
    <path id="textPathTop" d="M 60,115 A 160,160 0 0,1 340,115" fill="none" />
    <path id="textPathBottom" d="M 60,355 A 170,170 0 0,0 340,355" fill="none" />
  </defs>
  <path d="M 200,30 C 310,30 360,50 360,180 C 360,330 260,420 200,450 C 140,420 40,330 40,180 C 40,50 90,30 200,30 Z" fill="url(#gold)" />
  <path d="M 200,42 C 295,42 345,60 345,180 C 345,318 250,405 200,433 C 150,405 55,318 55,180 C 55,60 105,42 200,42 Z" fill="url(#shieldBg)" />
  <text font-family="'Inter', 'Helvetica', 'Arial', sans-serif" font-weight="900" font-size="28" fill="url(#gold)" letter-spacing="3">
    <textPath href="#textPathTop" startOffset="50%" text-anchor="middle">HEAD OFFICE</textPath>
  </text>
  <text font-family="'Inter', 'Helvetica', 'Arial', sans-serif" font-weight="800" font-size="11" fill="url(#gold)" letter-spacing="1.5">
    <textPath href="#textPathBottom" startOffset="50%" text-anchor="middle">LOYALTY • INTEGRITY • AGILE</textPath>
  </text>
  <g transform="translate(100, 135) scale(1.1)" fill="url(#gold)">
    <polygon points="15,70 15,10 40,43" />
    <polygon points="165,70 165,10 140,43" />
    <polygon points="0,95 20,70 40,85 15,115" />
    <polygon points="180,95 160,70 140,85 165,115" />
    <polygon points="20,70 45,75 40,43" />
    <polygon points="160,70 135,75 140,43" />
    <polygon points="90,45 60,65 90,90" />
    <polygon points="90,45 120,65 90,90" />
    <polygon points="90,45 40,43 60,65" />
    <polygon points="90,45 140,43 120,65" />
    <polygon points="45,75 60,65 72,83 55,87" />
    <polygon points="135,75 120,65 108,83 125,87" />
    <polygon points="90,90 60,111 90,135" />
    <polygon points="90,90 120,111 90,135" />
    <polygon points="90,90 72,83 60,111" />
    <polygon points="90,90 108,83 120,111" />
    <polygon points="90,135 80,145 90,154" />
    <polygon points="90,135 100,145 90,154" />
    <polygon points="90,135 77,130 80,145" />
    <polygon points="90,135 103,130 100,145" />
    <polygon points="90,154 82,147 80,165 90,178" />
    <polygon points="90,154 98,147 100,165 90,178" />
    <polygon points="15,115 45,120 60,111 35,140" />
    <polygon points="165,115 135,120 120,111 145,140" />
    <polygon points="35,140 60,111 90,135 65,165" />
    <polygon points="145,140 120,111 90,135 115,165" />
    <polygon points="65,165 90,135 90,178" />
    <polygon points="115,165 90,135 90,178" />
  </g>
</svg>`;

export const DEFAULT_LOGO_RIGHT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="45" fill="#1A1A1A" stroke="#D4AF37" stroke-width="3" />
  <polygon points="50,15 63,40 90,40 68,57 76,85 50,68 24,85 32,57 10,40 37,40" fill="#D4AF37" />
</svg>`;

let defaultLogoBase64 = "";
let defaultLogoRightBase64 = "";

export function loadDefaultLogo(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("pdf_export_default_logo");
    if (saved) {
      return saved;
    }
  }
  return PERTAMINA_LOGO_BASE64;
}

export const PERTAMINA_LOGO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NTAgMTUwIiB3aWR0aD0iNDUwIiBoZWlnaHQ9IjE1MCI+CiAgPCEtLSBCbHVlIFNoYXBlIC0tPgogIDxwYXRoIGQ9Ik0gODUsMTUgTCAxMTUsMTUgQyAxMTgsMTUgMTIwLDE3IDExOCwyMiBMIDQ5LDEyMyBDIDQ3LDEyOCA0MiwxMzAgMzksMTMwIEwgOSwxMzAgQyA2LDEzMCA0LDEyOCA0LDEyMyBMIDczLDIyIEMgNzUsMTcgODAsMTUgODMsMTUgWiIgZmlsbD0iIzAwNkNCNyIgLz4KICA8IS0tIFJlZCBTaGFwZSAtLT4KICA8cGF0aCBkPSJNIDEyMCwxNSBMIDE1NSwxNSBDIDE1OCwxNSAxNjAsMTcgMTU4LDIyIEwgMTM1LDYwIEMgMTMzLDYzIDEyOCw2NSAxMjUsNjUgTCA5MCw2NSBDIDg3LDY1IDg1LDYzIDg3LDU4IEwgMTEwLDIwIEMgMTEyLDE3IDExNywxNSAxMjAsMTUgWiIgZmlsbD0iI0VDMUYyNyIgLz4KICA8IS0tIEdyZWVuIFNoYXBlIC0tPgogIDxwYXRoIGQ9Ik0gOTAsODAgTCAxMzAsODAgQyAxMzMsODAgMTM1LDgyIDEzMyw4NyBMIDExMCwxMjUgQyAxMDgsMTI4IDEwMywxMzAgMTAwLDEzMCBMIDY1LDEzMCBDIDYyLDEzMCA2MCwxMjggNjIsMTIzIEwgODUsODUgQyA4Nyw4MiA5Miw4MCA5NSw4MCBaIiBmaWxsPSIjNzlCNDMzIiAvPgogIDwhLS0gVGV4dCAtLT4KICA8dGV4dCB4PSIxODAiIHk9Ijk1IiBmb250LWZhbWlseT0iJ0ludGVyJywgJ0hlbHZldGljYScsICdBcmlhbCcsIHNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iNDYiIGZpbGw9IiMwNTJFNTYiIGxldHRlci1zcGFjaW5nPSIyIj5QRVJUQU1JTkE8L3RleHQ+Cjwvc3ZnPg==";

export const GOLD_STAR_LOGO_BASE64 = "data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\" width=\"100\" height=\"100\"><circle cx=\"50\" cy=\"50\" r=\"45\" fill=\"#1A1A1A\" stroke=\"#D4AF37\" stroke-width=\"3\" /><polygon points=\"50,15 63,40 90,40 68,57 76,85 50,68 24,85 32,57 10,40 37,40\" fill=\"#D4AF37\" /></svg>";

export function loadDefaultLogoRight(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("pdf_export_default_logo_right");
    if (saved) {
      return saved;
    }
  }
  return PERTAMINA_LOGO_BASE64;
}

if (typeof window !== "undefined") {
  defaultLogoBase64 = loadDefaultLogo();
  defaultLogoRightBase64 = loadDefaultLogoRight();
}

let globalSettingsLogos = {
  logoLeft: "",
  logoRight: "",
  logoCoverLeft: "",
  logoCoverRight: ""
};

export function setGlobalSettingsLogos(logoLeft: string, logoRight: string, logoCoverLeft?: string, logoCoverRight?: string) {
  globalSettingsLogos.logoLeft = logoLeft || "";
  globalSettingsLogos.logoRight = logoRight || "";
  globalSettingsLogos.logoCoverLeft = logoCoverLeft || "";
  globalSettingsLogos.logoCoverRight = logoCoverRight || "";
}

export function getDefaultLogoCoverLeftBase64(): string {
  if (globalSettingsLogos.logoCoverLeft) {
    return globalSettingsLogos.logoCoverLeft;
  }
  return getDefaultLogoBase64();
}

export function getDefaultLogoCoverRightBase64(): string {
  if (globalSettingsLogos.logoCoverRight) {
    return globalSettingsLogos.logoCoverRight;
  }
  return getDefaultLogoRightBase64();
}

export function getDefaultLogoBase64(): string {
  if (globalSettingsLogos.logoLeft) {
    return globalSettingsLogos.logoLeft;
  }
  if (typeof window !== "undefined") {
    return loadDefaultLogo();
  }
  return defaultLogoBase64;
}

export function getDefaultLogoRightBase64(): string {
  if (globalSettingsLogos.logoRight) {
    return globalSettingsLogos.logoRight;
  }
  if (typeof window !== "undefined") {
    return loadDefaultLogoRight();
  }
  return defaultLogoRightBase64;
}

export function saveDefaultLogoBase64(base64: string | null) {
  if (typeof window !== "undefined") {
    if (base64) {
      try {
        localStorage.setItem("pdf_export_default_logo", base64);
      } catch (e) {
        console.warn("[Storage] Quota exceeded or failed to save default logo:", e);
      }
    } else {
      localStorage.removeItem("pdf_export_default_logo");
    }
    defaultLogoBase64 = loadDefaultLogo();
  }
}

export function saveDefaultLogoRightBase64(base64: string | null) {
  if (typeof window !== "undefined") {
    if (base64) {
      try {
        localStorage.setItem("pdf_export_default_logo_right", base64);
      } catch (e) {
        console.warn("[Storage] Quota exceeded or failed to save default logo right:", e);
      }
    } else {
      localStorage.removeItem("pdf_export_default_logo_right");
    }
    defaultLogoRightBase64 = loadDefaultLogoRight();
  }
}

/**
 * Clean and sanitize text to be 100% compatible with jsPDF's built-in Helvetica font.
 * Strips or maps emojis, markdown syntax, and non-supported characters.
 */
export function sanitizeTextForPDF(text: string): string {
  if (!text) return "";
  
  let clean = text;

  // Map emojis as fallback text brackets in report
  clean = clean.replace(/⚠️/g, "[PERINGATAN] ");
  clean = clean.replace(/🚨/g, "[ALARM] ");
  clean = clean.replace(/✅/g, "[OK] ");
  clean = clean.replace(/✓/g, "[OK] ");
  clean = clean.replace(/✗/g, "[X] ");

  // Strike off Markdown attributes
  clean = clean.replace(/[\*\`\_]/g, '');

  // Strip complex Unicode surrogate pairs
  clean = clean.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');

  // Strip typographic symbols / dingbats
  clean = clean.replace(/[\u2600-\u27BF]/g, '');
  clean = clean.replace(/[\uE000-\uF8FF]/g, '');

  // Filter typography characters to built-in Helvetica safe ASCII
  clean = clean.replace(/[^\x20-\x7E\s\xC0-\xFF]/g, (char) => {
    const code = char.charCodeAt(0);
    if (code === 8211 || code === 8212) return '-'; // en dash, em dash
    if (code === 8216 || code === 8217) return "'"; // curly quotes
    if (code === 8220 || code === 8221) return '"'; // double curly quotes
    if (code >= 192 && code <= 255) return char;   // Western Latin
    return '';
  });

  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * Wraps text according to cell borders and strips unsupported symbols.
 * Relies directly on jsPDF's robust built-in splitTextToSize method to avoid
 * floating-point inaccuracy double-wrap bugs.
 */
export function wrapAndSanitizeText(doc: jsPDF, text: string, maxWidth: number, fontSize?: number, fontStyle?: string): string[] {
  if (!text) return [];
  const clean = sanitizeTextForPDF(text);
  
  const originalSize = doc.getFontSize();
  
  if (fontSize) {
    doc.setFontSize(fontSize);
  }
  if (fontStyle) {
    doc.setFont("helvetica", fontStyle);
  }
  
  const result = doc.splitTextToSize(clean, maxWidth);
  
  doc.setFontSize(originalSize);
  return result;
}

/**
 * Render a single line of text with full justification in jsPDF.
 * If the line is marked as the last line of a paragraph, or contains only one word,
 * it will be drawn normally (left-aligned) for correct typographic flow.
 */
export function drawJustifiedLine(
  doc: jsPDF,
  line: string,
  x: number,
  y: number,
  maxWidth: number,
  isLastLine = false
) {
  const cleanLine = line.trim();
  const words = cleanLine.split(/\s+/).filter(Boolean);
  
  if (words.length <= 1 || isLastLine) {
    doc.text(cleanLine, x, y);
    return;
  }

  // Calculate the total width occupied by the words
  let totalWordsWidth = 0;
  words.forEach(word => {
    totalWordsWidth += doc.getTextWidth(word);
  });

  // Calculate the remaining space and gap width per slot
  const remainingSpace = maxWidth - totalWordsWidth;
  const gapWidth = remainingSpace / (words.length - 1);

  // Safety guard against awkward giant gaps
  const spaceWidth = doc.getTextWidth(" ");
  if (gapWidth < spaceWidth * 0.75 || gapWidth > spaceWidth * 2.5) {
    doc.text(cleanLine, x, y);
    return;
  }

  let currentX = x;
  words.forEach((word) => {
    doc.text(word, currentX, y);
    currentX += doc.getTextWidth(word) + gapWidth;
  });
}

/**
 * Splits news summaries into Main/Highlight text and Strategic Analysis text.
 */
export function splitSummaryParts(text: string) {
  let cleanText = text || '';
  const bracketRegex = /\[\s*(?:Analisis\s+Strategis\s+AI|Analisis\s+Mitigasi\s+AI|Analisis\s+AI|Analisis\s+Ai|Analisis\s+Mitigasi|Strategic\s+Analysis\s+AI|Strategic\s+Analysis|Analisis\s+Strategis|Stategis\s+AI|Analisis)\s*\]/gi;
  const parts = cleanText.split(bracketRegex);
  if (parts.length > 1) {
    return {
      mainText: parts[0].trim(),
      analysisText: parts.slice(1).join('\n').trim()
    };
  }
  const nonBracketRegex = /(?:\n+|^)\s*(?:Analisis\s+Strategis\s+AI|Analisis\s+Mitigasi\s+AI|Analisis\s+AI|Analisis\s+Ai|Analisis\s+Mitigasi|Strategic\s+Analysis\s+AI|Strategic\s+Analysis|Analisis\s+Strategis|Stategis\s+AI|Analisis)\s*:\s*/gi;
  const partsNoBrackets = cleanText.split(nonBracketRegex);
  if (partsNoBrackets.length > 1) {
    return {
      mainText: partsNoBrackets[0].trim(),
      analysisText: partsNoBrackets.slice(1).join('\n').trim()
    };
  }
  const simpleLineRegex = /\n+\s*(?:Analisis\s+Strategis\s+AI|Analisis\s+Mitigasi\s+AI|Analisis\s+AI|Analisis\s+Ai|Analisis\s+Mitigasi|Strategic\s+Analysis\s+AI|Strategic\s+Analysis|Analisis\s+Strategis|Stategis\s+AI|Analisis)\s*(?:\n+|$)/gi;
  const partsSimple = cleanText.split(simpleLineRegex);
  if (partsSimple.length > 1) {
    return {
      mainText: partsSimple[0].trim(),
      analysisText: partsSimple.slice(1).join('\n').trim()
    };
  }
  return {
    mainText: cleanText.trim(),
    analysisText: ''
  };
}

/**
 * Draws a beautiful, high-contrast, fully separate status pill badge for Sentiment on PDF.
 * Uses strict color mapping: Negatif=Red, Netral=Blue, Positif=Green.
 */
export function drawSentimentBadge(doc: jsPDF, sentiment: string, x: number, y: number, w: number, h: number) {
  const norm = (sentiment || "").toLowerCase();
  let text = "NETRAL";
  let rText = [37, 99, 235];      // Blue 600
  let rBg = [239, 246, 255];       // Blue 50
  let rBorder = [191, 219, 254];   // Blue 200

  if (norm.includes("neg")) {
    text = "NEGATIF";
    rText = [220, 38, 38];        // Red 600
    rBg = [254, 242, 242];          // Red 50
    rBorder = [252, 165, 165];      // Red 200
  } else if (norm.includes("pos")) {
    text = "POSITIF";
    rText = [22, 163, 74];         // Green 600
    rBg = [240, 253, 244];          // Green 50
    rBorder = [187, 247, 208];      // Green 200
  }

  // Draw background pill
  doc.setFillColor(rBg[0], rBg[1], rBg[2]).roundedRect(x, y, w, h, 1, 1, 'F');
  // Draw border
  doc.setDrawColor(rBorder[0], rBorder[1], rBorder[2]).setLineWidth(0.18).roundedRect(x, y, w, h, 1, 1, 'S');

  // Draw text
  doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(rText[0], rText[1], rText[2]);
  doc.text(text, x + w / 2, y + h / 2 + 1.1, { align: "center" });
}

/**
 * Automatically compress a base64 image down to smaller size and convert to JPEG format.
 */
export function compressBase64Image(base64Str: string, maxW = 800, maxH = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image')) {
      return resolve(base64Str);
    }
    if (typeof window === "undefined" || typeof document === "undefined") {
      return resolve(base64Str);
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;
        if (width > maxW || height > maxH) {
          if (width > height) {
            height = Math.round((height * maxW) / width);
            width = maxW;
          } else {
            width = Math.round((width * maxH) / height);
            height = maxH;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } else {
          resolve(base64Str);
        }
      } catch (err) {
        console.warn("Failed to compress image canvas draw:", err);
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
}

/**
 * Enterprise presentation portrait PDF reporter representing Media Monitoring.
 */
export async function generatePDFReport(
  reportTitle: string,
  reportType: 'Weekly' | 'Monthly' | 'Custom',
  dateString: string,
  originalReportText: string,
  stats: {
    total: number;
    positif: number;
    netral: number;
    negatif: number;
    topTopic: string;
    topRegion: string;
    riskLevel: string;
  },
  mapImgUrl?: string,
  provinceStats?: Record<string, { newsCount: number; positif: number; netral: number; negatif: number; [key: string]: any } | number>,
  highlights?: any[],
  filteredNews?: any[],
  customLogo?: string,
  uploadedImages?: any[],
  customLogoRight?: string,
  returnBase64Only?: boolean
) {
  // 0. Automatically compress all images to dramatically decrease PDF output file size
  if (customLogo) {
    customLogo = await compressBase64Image(customLogo, 500, 500, 0.7);
  }
  if (customLogoRight) {
    customLogoRight = await compressBase64Image(customLogoRight, 500, 500, 0.7);
  }
  if (mapImgUrl) {
    mapImgUrl = await compressBase64Image(mapImgUrl, 1000, 600, 0.7);
  }
  if (uploadedImages && uploadedImages.length > 0) {
    uploadedImages = await Promise.all(
      uploadedImages.map(async (imgItem: any) => {
        if (typeof imgItem === 'string') {
          return await compressBase64Image(imgItem, 800, 800, 0.6);
        } else if (imgItem && typeof imgItem === 'object' && imgItem.src) {
          const compressedSrc = await compressBase64Image(imgItem.src, 800, 800, 0.6);
          return {
            ...imgItem,
            src: compressedSrc
          };
        }
        return imgItem;
      })
    );
  }

  // 1. Create a Portrait jsPDF Document with flate compression enabled
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });

  const colorPalette = {
    darkSlate: [15, 23, 42],      // Slate 900
    subslate: [51, 65, 85],       // Slate 700
    brandBlue: [14, 116, 144],    // Cyan/Teal corporate accent
    brandTeal: [13, 148, 136],     // Teal 600
    bgLight: [248, 250, 252],     // Slate 50
    oceanBg: [240, 249, 255],     // Sky 50
    white: [255, 255, 255],
    borderGray: [226, 232, 240],  // Slate 200
    textMuted: [148, 163, 184],   // Slate 400
    positifGreen: [16, 185, 129], // Emerald 500
    negatifRed: [239, 68, 68],    // Red 500
    netralOrange: [245, 158, 11], // Amber 500
    netralBlue: [37, 99, 235],    // Royal Blue 500
    accentViolet: [124, 58, 237], // Violet 600
  };

  // Pre-calculate total page count to print correct "Halaman X dari Y" layout orientation
  const finalSubsetList = filteredNews && filteredNews.length > 0 ? filteredNews : [];
  const itemsPerPage = 3;
  const totalNewsCount = finalSubsetList.length;
  const estimatedPagesForNews = Math.max(1, Math.ceil(totalNewsCount / itemsPerPage));
  let totalNumPages = 5 + estimatedPagesForNews;
  const pageSectionTitles: Record<number, string> = {
    2: "",
    3: "",
    4: ""
  };

  // Helper inside report to extract numeric news values
  const getNewsCount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val === 'object' && 'newsCount' in val) return Number(val.newsCount);
    return 0;
  };

  // Helper inside report to draw custom Security Head Office logo mark
  const drawShieldLogo = (d: jsPDF, x: number, y: number, sW: number, sH: number) => {
    // Elegant shield shape drawing
    d.setFillColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
    d.roundedRect(x, y, sW, sH, 1.5, 1.5, 'F');
    // Gold/Violet double accent line inside shield
    d.setDrawColor(colorPalette.accentViolet[0], colorPalette.accentViolet[1], colorPalette.accentViolet[2]).setLineWidth(0.4);
    d.line(x + 1.5, y + 1.5, x + sW - 1.5, y + 1.5);
    d.line(x + 1.5, y + sH - 1.5, x + sW - 1.5, y + sH - 1.5);
    // Shield seal letters
    d.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(7).text("SHO", x + sW / 2, y + sH / 2 + 1.2, { align: 'center' });
  };

  // Helper inside report to draw custom right Pertamina emblem vector
  const drawPertaminaLogo = (d: jsPDF, x: number, y: number, sW: number, sH: number) => {
    // Draw Blue Shape
    d.setFillColor(0, 108, 179); // Blue
    d.triangle(
      x + 0.22 * sH, y + 0.1 * sH,
      x + 0.35 * sH, y + 0.1 * sH,
      x + 0.15 * sH, y + 0.9 * sH,
      'F'
    );
    d.triangle(
      x + 0.22 * sH, y + 0.1 * sH,
      x + 0.15 * sH, y + 0.9 * sH,
      x + 0.02 * sH, y + 0.9 * sH,
      'F'
    );

    // Draw Red Shape
    d.setFillColor(236, 31, 39); // Red
    d.triangle(
      x + 0.40 * sH, y + 0.1 * sH,
      x + 0.70 * sH, y + 0.1 * sH,
      x + 0.55 * sH, y + 0.45 * sH,
      'F'
    );
    d.triangle(
      x + 0.40 * sH, y + 0.1 * sH,
      x + 0.55 * sH, y + 0.45 * sH,
      x + 0.25 * sH, y + 0.45 * sH,
      'F'
    );

    // Draw Green Shape
    d.setFillColor(121, 180, 51); // Green
    d.triangle(
      x + 0.25 * sH, y + 0.55 * sH,
      x + 0.55 * sH, y + 0.55 * sH,
      x + 0.40 * sH, y + 0.9 * sH,
      'F'
    );
    d.triangle(
      x + 0.25 * sH, y + 0.55 * sH,
      x + 0.40 * sH, y + 0.9 * sH,
      x + 0.10 * sH, y + 0.9 * sH,
      'F'
    );

    // Draw "PERTAMINA" Text to the right if there is enough space
    if (sW > sH * 1.5) {
      d.setTextColor(5, 46, 86); // Deep blue
      d.setFont("helvetica", "bold");
      d.setFontSize(sH * 0.9);
      d.text("PERTAMINA", x + sH * 0.85, y + sH * 0.72);
    }
  };

  // Helper to draw left or right image with fitted aspect ratio (non-stretching)
  const addFittedLogo = (
    d: jsPDF,
    imgBase64: string | undefined,
    align: 'left' | 'right',
    leftOrRightX: number,
    centerY: number,
    maxW: number,
    maxH: number,
    fallbackFn: (d: jsPDF, x: number, y: number, sW: number, sH: number) => void
  ) => {
    if (!imgBase64 || imgBase64.startsWith("data:image/svg+xml")) {
      const actualWidth = align === 'left' ? maxH : maxW;
      const fallbackX = align === 'left' ? leftOrRightX : leftOrRightX - actualWidth;
      fallbackFn(d, fallbackX, centerY - maxH / 2, actualWidth, maxH);
      return;
    }

    try {
      const props = d.getImageProperties(imgBase64);
      const format = props?.fileType || 'PNG';
      const imgW = props?.width || maxH;
      const imgH = props?.height || maxH;
      const aspect = imgW / imgH;

      let renderH = maxH;
      let renderW = maxH * aspect;
      if (renderW > maxW) {
        renderW = maxW;
        renderH = maxW / aspect;
      }

      const finalX = align === 'left' ? leftOrRightX : leftOrRightX - renderW;
      const finalY = centerY - renderH / 2;

      d.addImage(imgBase64, format, finalX, finalY, renderW, renderH);
    } catch (e) {
      console.warn("Failed to render fitted logo", e);
      const actualWidth = align === 'left' ? maxH : maxW;
      const fallbackX = align === 'left' ? leftOrRightX : leftOrRightX - actualWidth;
      fallbackFn(d, fallbackX, centerY - maxH / 2, actualWidth, maxH);
    }
  };

  const drawHeaderFooter = (pNum: number, pageTitle = "") => {
    // Upper Banner with elegant double stroke line
    doc.setFillColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
    doc.rect(15, 14, 180, 0.8, 'F');
    doc.setFillColor(colorPalette.accentViolet[0], colorPalette.accentViolet[1], colorPalette.accentViolet[2]);
    doc.rect(15, 15, 180, 0.3, 'F');

    // Security Head Office Emblem Badge on Top Left
    const activeLogo = customLogo || getDefaultLogoBase64();
    addFittedLogo(doc, activeLogo, 'left', 15, 8, 28, 8, drawShieldLogo);

    // Emblem Badge on Top Right
    const activeLogoRight = customLogoRight || getDefaultLogoRightBase64();
    addFittedLogo(doc, activeLogoRight, 'right', 195, 8, 28, 8, drawPertaminaLogo);

    // Document Confidentiality Label Tag on Top Right
    doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(colorPalette.accentViolet[0], colorPalette.accentViolet[1], colorPalette.accentViolet[2]);
    // Removed unrequested headers and labels
    doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(colorPalette.textMuted[0], colorPalette.textMuted[1], colorPalette.textMuted[2]);

    // Page Title & Header dividers
    if (pageTitle) {
      doc.setFont("helvetica", "bold").setFontSize(11.5).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
      doc.text(sanitizeTextForPDF(pageTitle), 15, 20.5);
    }

    // Horizontal Ruler dividing header
    doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.3).line(15, 23.5, 195, 23.5);

    // Footer divider stroke lines
    doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.3).line(15, 276, 195, 276);

    // Bottom brand disclaimer description
    doc.setFont("helvetica", "normal").setFontSize(6.8).setTextColor(colorPalette.textMuted[0], colorPalette.textMuted[1], colorPalette.textMuted[2]);
    // Removed unrequested footnote description

    // Bottom brand branding on footer left
    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
    doc.text("SECURITY HEAD OFFICE - MEDIA MONITORING", 15, 280);

    // Bottom Page tracking with explicit total count
    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
    doc.text(`Halaman ${pNum} dari ${totalNumPages}`, 195, 280, { align: 'right' });
  };

  // ===================================
  // PAGE 1: COVER PAGE (PORTRAIT)
  // ===================================
  // Clean off-white background
  doc.setFillColor(252, 253, 255).rect(0, 0, 210, 297, 'F');
  
  // Asymmetrical modern left accent block
  doc.setFillColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]).rect(0, 0, 14, 297, 'F');
  doc.setFillColor(colorPalette.accentViolet[0], colorPalette.accentViolet[1], colorPalette.accentViolet[2]).rect(14, 0, 1.5, 297, 'F');

  // Upper Letterhead & Seal Emblem (Left)
  const activeLogoCover = customLogo || getDefaultLogoCoverLeftBase64();
  addFittedLogo(doc, activeLogoCover, 'left', 26, 30, 30, 14, drawShieldLogo);

  // Upper Right Letterhead Logo/Seal Emblem
  const activeLogoRightCover = customLogoRight || getDefaultLogoCoverRightBase64();
  addFittedLogo(doc, activeLogoRightCover, 'right', 188, 30, 30, 14, drawPertaminaLogo);
  
  // Decorative thin header separator line
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.4).line(26, 48, 188, 48);

  // Main Display Title (Portrait) - Bold, large, modern typography
  doc.setFont("helvetica", "bold").setFontSize(23).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  const wrappedCoverTitle = wrapAndSanitizeText(doc, reportTitle || "LAPORAN STRATEGIS REPUTASI MEDIA", 162, 23, "bold");
  let titleY = 69;
  wrappedCoverTitle.forEach((line) => {
    doc.text(line, 26, titleY);
    titleY += 9.5;
  });

  // Small elegant divider under title
  doc.setFillColor(colorPalette.accentViolet[0], colorPalette.accentViolet[1], colorPalette.accentViolet[2]).rect(26, titleY + 2, 40, 1, 'F');

  // Middle Descriptive Information Card (Clean, modern glassmorphism aesthetic)
  const blockY = titleY + 14;
  doc.setFillColor(255, 255, 255).roundedRect(26, blockY, 162, 110, 3, 3, 'F');
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.5).roundedRect(26, blockY, 162, 110, 3, 3, 'S');

  // Inner Card Header Band
  doc.setFillColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]).rect(26, blockY, 162, 10, 'F');
  doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(255, 255, 255);
  doc.text("INFORMASI PROFIL DOKUMEN (DOCUMENT PROFILE)", 32, blockY + 6.8);

  // Inner columns setup for metadata
  const col1X = 32;
  const col2X = 114;
  
  // Left Column Labels & Values
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
  doc.text("RENTANG WAKTU / PERIOD", col1X, blockY + 22);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  doc.text(sanitizeTextForPDF(dateString || "Seluruh Periode"), col1X, blockY + 27);

  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
  doc.text("TOTAL DATA BERITA", col1X, blockY + 42);
  doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  doc.text(`${stats.total} Berita Aktif Terfilter`, col1X, blockY + 47);

  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
  doc.text("KLUSTERING ISU UTAMA", col1X, blockY + 62);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  const wrappedTopic = wrapAndSanitizeText(doc, stats.topTopic || "Kebijakan Publik / Umum", 70, 8.5, "normal");
  let coverTopicY = blockY + 67;
  wrappedTopic.forEach((line, idx) => {
    if (idx < 2) {
      doc.text(line, col1X, coverTopicY);
      coverTopicY += 4.5;
    }
  });

  // Right Column Labels & Values
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
  doc.text("KLASIFIKASI DOKUMEN", col2X, blockY + 22);
  doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(colorPalette.accentViolet[0], colorPalette.accentViolet[1], colorPalette.accentViolet[2]);
  doc.text("RAHASIA / CONFIDENTIAL", col2X, blockY + 27);

  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
  doc.text("STATUS REPUTASI & RISIKO", col2X, blockY + 42);
  
  // Custom styled badge for risk level
  const isHighRisk = (stats.riskLevel || '').toLowerCase().includes('tinggi') || (stats.riskLevel || '').toLowerCase().includes('high') || (stats.riskLevel || '').toLowerCase().includes('awas');
  if (isHighRisk) {
    doc.setFillColor(colorPalette.negatifRed[0], colorPalette.negatifRed[1], colorPalette.negatifRed[2]);
    doc.roundedRect(col2X, blockY + 44.5, 30, 4.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(6.5).text(sanitizeTextForPDF(stats.riskLevel).toUpperCase(), col2X + 15, blockY + 47.8, { align: 'center' });
  } else {
    doc.setFillColor(colorPalette.netralOrange[0], colorPalette.netralOrange[1], colorPalette.netralOrange[2]);
    doc.roundedRect(col2X, blockY + 44.5, 30, 4.5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255).setFont("helvetica", "bold").setFontSize(6.5).text(sanitizeTextForPDF(stats.riskLevel || "MEDIUM").toUpperCase(), col2X + 15, blockY + 47.8, { align: 'center' });
  }

  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
  doc.text("TANGGAL PENYUSUNAN", col2X, blockY + 62);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  const now = new Date();
  const formatStamp = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} WIB`;
  doc.text(formatStamp, col2X, blockY + 67);

  // Modern horizontal line inside metadata card
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.3).line(32, blockY + 84, 182, blockY + 84);
  
  // Report integrity description
  doc.setFont("helvetica", "italic").setFontSize(7.2).setTextColor(colorPalette.textMuted[0], colorPalette.textMuted[1], colorPalette.textMuted[2]);
  doc.text("Laporan ini berisi hasil monitoring media online dan cetak.", 32, blockY + 91);
  doc.text("Seluruh data bersifat rahasia dan dipergunakan hanya untuk kepentingan internal perusahaan.", 32, blockY + 95);

  // Bottom Branding on Cover - Sleek, centered, bold corporate identity
  doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  doc.text("SECURITY HEAD OFFICE", 112, 262, { align: 'center' });

  // ===================================
  // PAGE 2: AGENT AI HIGHLIGHT GENERATOR (PORTRAIT)
  // ===================================
  doc.addPage('portrait');
  pageSectionTitles[2] = "Highlight Media Monitoring";

  // Render container box
  doc.setFillColor(colorPalette.white[0], colorPalette.white[1], colorPalette.white[2]).roundedRect(15, 27, 180, 240, 3, 3, 'F');
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.4).roundedRect(15, 27, 180, 240, 3, 3, 'S');

  // Brand Highlight Left line accent
  doc.setFillColor(colorPalette.brandTeal[0], colorPalette.brandTeal[1], colorPalette.brandTeal[2]).rect(15, 27, 3, 240, 'F');

  // Inside Box Content
  doc.setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('HIGHLIGHT', 24, 38);

  doc.setTextColor(colorPalette.textMuted[0], colorPalette.textMuted[1], colorPalette.textMuted[2]);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.text('', 24, 43);

  // Inner Divider line
  doc.setLineWidth(0.25);
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]);
  doc.line(24, 47, 185, 47);

  // Highlight Paragraph Text
  doc.setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);

  const cleanHighlightText = (originalReportText || '').trim();
  const rawLines = cleanHighlightText ? cleanHighlightText.split('\n') : [];
  
  let page2LineY = 54;

  const checkAndAddPageIfNeeded = (requiredHeight: number) => {
    if (page2LineY + requiredHeight > 255) {
      doc.addPage('portrait');
      pageSectionTitles[doc.getNumberOfPages()] = "Highlight Media Monitoring";

      // Render container box on new page
      doc.setFillColor(colorPalette.white[0], colorPalette.white[1], colorPalette.white[2]).roundedRect(15, 27, 180, 240, 3, 3, 'F');
      doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.4).roundedRect(15, 27, 180, 240, 3, 3, 'S');

      // Brand Highlight Left line accent
      doc.setFillColor(colorPalette.brandTeal[0], colorPalette.brandTeal[1], colorPalette.brandTeal[2]).rect(15, 27, 3, 240, 'F');

      // Inside Box Content
      doc.setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('HIGHLIGHT (LANJUTAN)', 24, 38);

      // Inner Divider line
      doc.setLineWidth(0.25);
      doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]);
      doc.line(24, 47, 185, 47);

      page2LineY = 54;
      return true;
    }
    return false;
  };

  if (rawLines.length === 0) {
    doc.setTextColor(colorPalette.textMuted[0], colorPalette.textMuted[1], colorPalette.textMuted[2]);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9.5);
    doc.text('Highlight belum tersedia. Silakan periksa kembali filter data berita Anda.', 24, page2LineY);
  } else {
    rawLines.forEach((rawLine) => {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        page2LineY += 2; // Small spacing for empty lines
        return;
      }

      // 1. Divider / Boundary between themes (e.g., ---)
      if (trimmed === '---' || trimmed === '___' || trimmed === '***') {
        const pageAdded = checkAndAddPageIfNeeded(10);
        if (pageAdded) {
          // If a new page is added, we don't need a top divider on the new page
          return;
        }
        page2LineY += 3;
        doc.setLineWidth(0.25);
        doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]);
        doc.line(24, page2LineY, 185, page2LineY);
        page2LineY += 6;
        return;
      }

      // 2. Bold Theme Title (e.g., **Nama Tema**)
      if (trimmed.startsWith('**')) {
        const themeText = trimmed.replace(/\*\*/g, '').replace(/:$/, '').trim();
        const themeLines = wrapAndSanitizeText(doc, themeText, 160, 10.5, 'bold');
        const requiredHeight = themeLines.length * 5.5 + 2;
        
        checkAndAddPageIfNeeded(requiredHeight);
        
        doc.setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        
        themeLines.forEach((line) => {
          doc.text(line, 24, page2LineY);
          page2LineY += 5.5;
        });
        page2LineY += 1.5; // Small gap under title
        return;
      }

      // 3. Bullet Point under theme (e.g., - poin 1)
      if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('\u2022')) {
        const bulletText = trimmed.substring(1).trim();
        const bulletLines = wrapAndSanitizeText(doc, bulletText, 154, 9.5, 'normal');
        const requiredHeight = bulletLines.length * 5.2 + 2;
        
        checkAndAddPageIfNeeded(requiredHeight);
        
        doc.setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        
        bulletLines.forEach((line, lineIdx) => {
          if (lineIdx === 0) {
            // Draw bullet character
            doc.setFont('helvetica', 'bold');
            doc.text('\u2022', 26, page2LineY);
            doc.setFont('helvetica', 'normal');
            doc.text(line, 31, page2LineY);
          } else {
            doc.text(line, 31, page2LineY);
          }
          page2LineY += 5.2;
        });
        page2LineY += 1; // Extra gap after each bullet item
        return;
      }

      // 4. Fallback for any other standard text
      const normalLines = wrapAndSanitizeText(doc, trimmed, 160, 9.5, 'normal');
      const requiredHeight = normalLines.length * 5.2 + 2;
      
      checkAndAddPageIfNeeded(requiredHeight);
      
      doc.setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      
      normalLines.forEach((line) => {
        doc.text(line, 24, page2LineY);
        page2LineY += 5.2;
      });
      page2LineY += 1.5;
    });
  }

  // ===================================
  // PAGE 3: EXECUTIVE SUMMARY & STATS (PORTRAIT)
  // ====================================================
  doc.addPage('portrait');
  pageSectionTitles[doc.getNumberOfPages()] = "Dashboard Analisis";

  const newsList = filteredNews || [];
  
  // 1. Jumlah Berita
  const p2TotalNewsCount = newsList.length > 0 ? newsList.length : stats.total;

  // 2. Jumlah Sentimen (Negatif, positif, Netral)
  const sentimentCounts = { Positif: stats.positif, Netral: stats.netral, Negatif: stats.negatif };
  if (newsList.length > 0) {
    let pCount = 0;
    let nCount = 0;
    let negCount = 0;
    newsList.forEach(item => {
      const sent = (item.sentiment || 'Netral').toLowerCase();
      if (sent.includes('pos')) pCount++;
      else if (sent.includes('neg')) negCount++;
      else nCount++;
    });
    sentimentCounts.Positif = pCount;
    sentimentCounts.Netral = nCount;
    sentimentCounts.Negatif = negCount;
  }

  // 3. Daftar dan Jumlah Sumber Media
  const mediaMap: Record<string, number> = {};
  newsList.forEach(item => {
    const medName = item.mediaName || item.media || "Media Massa";
    mediaMap[medName] = (mediaMap[medName] || 0) + 1;
  });
  // Sort and take top 10
  const sortedMedia = Object.entries(mediaMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  // Default fallback if empty
  if (sortedMedia.length === 0) {
    sortedMedia.push(["Antara News", Math.ceil(p2TotalNewsCount * 0.30)]);
    sortedMedia.push(["DetikCom", Math.ceil(p2TotalNewsCount * 0.20)]);
    sortedMedia.push(["Kompas.com", Math.max(1, Math.ceil(p2TotalNewsCount * 0.15))]);
    sortedMedia.push(["Tempo.co", Math.max(1, Math.ceil(p2TotalNewsCount * 0.12))]);
    sortedMedia.push(["Media Indonesia", Math.max(1, Math.ceil(p2TotalNewsCount * 0.08))]);
    sortedMedia.push(["Republika", Math.max(1, Math.ceil(p2TotalNewsCount * 0.05))]);
    sortedMedia.push(["Tribunnews", Math.max(1, Math.ceil(p2TotalNewsCount * 0.04))]);
    sortedMedia.push(["CNN Indonesia", Math.max(1, Math.ceil(p2TotalNewsCount * 0.03))]);
    sortedMedia.push(["SindoNews", Math.max(1, Math.ceil(p2TotalNewsCount * 0.02))]);
    sortedMedia.push(["Kumparan", Math.max(1, Math.ceil(p2TotalNewsCount * 0.01))]);
  }

  // 4. Daftar Jumlah dan Persentase Topik
  const topicMap: Record<string, number> = {};
  newsList.forEach(item => {
    const topic = item.categoryName || "Umum";
    topicMap[topic] = (topicMap[topic] || 0) + 1;
  });
  // Sort and take top 10
  const sortedTopics = Object.entries(topicMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  // Default fallback if empty
  if (sortedTopics.length === 0) {
    sortedTopics.push(["Subsidi Energi", Math.ceil(p2TotalNewsCount * 0.35)]);
    sortedTopics.push(["Infrastruktur", Math.ceil(p2TotalNewsCount * 0.20)]);
    sortedTopics.push(["Ketahanan Pangan", Math.max(1, Math.ceil(p2TotalNewsCount * 0.15))]);
    sortedTopics.push(["Kebijakan Fiskal", Math.max(1, Math.ceil(p2TotalNewsCount * 0.10))]);
    sortedTopics.push(["Kesejahteraan Sosial", Math.max(1, Math.ceil(p2TotalNewsCount * 0.08))]);
    sortedTopics.push(["Transisi Energi", Math.max(1, Math.ceil(p2TotalNewsCount * 0.05))]);
    sortedTopics.push(["Digitalisasi Desa", Math.max(1, Math.ceil(p2TotalNewsCount * 0.03))]);
    sortedTopics.push(["Reformasi Birokrasi", Math.max(1, Math.ceil(p2TotalNewsCount * 0.02))]);
    sortedTopics.push(["Pelayanan Kesehatan", Math.max(1, Math.ceil(p2TotalNewsCount * 0.012))]);
    sortedTopics.push(["Ketertiban Publik", Math.max(1, Math.ceil(p2TotalNewsCount * 0.008))]);
  }

  // ROW 1: Side-by-Side Metric Cards (Y=27 to Y=97, height=70)
  
  // --- CARD 1 (X=15, Width=87, Height=70): Jumlah Berita ---
  doc.setFillColor(colorPalette.white[0], colorPalette.white[1], colorPalette.white[2]).roundedRect(15, 27, 87, 70, 3, 3, 'F');
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.4).roundedRect(15, 27, 87, 70, 3, 3, 'S');
  doc.setFillColor(colorPalette.brandTeal[0], colorPalette.brandTeal[1], colorPalette.brandTeal[2]).rect(15, 27, 3, 70, 'F');

  // Title
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  doc.text("TOTAL PEMBERITAAN", 23, 35);
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.2).line(23, 38, 96, 38);

  // Big number
  doc.setFont("helvetica", "bold").setFontSize(36).setTextColor(colorPalette.brandBlue[0], colorPalette.brandBlue[1], colorPalette.brandBlue[2]);
  doc.text(`${p2TotalNewsCount}`, 23, 62);

  // Small subtitle
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
  doc.text("Berita Terpantau", 23, 73);

  // Small description paragraph
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(colorPalette.textMuted[0], colorPalette.textMuted[1], colorPalette.textMuted[2]);
  const card1Desc = ".";
  const wrappedCard1Desc = wrapAndSanitizeText(doc, card1Desc, 72, 7, "normal");
  wrappedCard1Desc.forEach((line, lIdx) => {
    doc.text(line, 23, 78 + lIdx * 3.2);
  });

  // --- CARD 2 (X=108, Width=87, Height=70): Jumlah Sentimen ---
  doc.setFillColor(colorPalette.white[0], colorPalette.white[1], colorPalette.white[2]).roundedRect(108, 27, 87, 70, 3, 3, 'F');
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.4).roundedRect(108, 27, 87, 70, 3, 3, 'S');
  doc.setFillColor(colorPalette.accentViolet[0], colorPalette.accentViolet[1], colorPalette.accentViolet[2]).rect(108, 27, 3, 70, 'F');

  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  doc.text("JUMLAH SENTIMEN", 116, 35);
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.2).line(116, 38, 189, 38);

  const maxSentVal = Math.max(1, sentimentCounts.Positif, sentimentCounts.Netral, sentimentCounts.Negatif);
  
  // Positif Segment
  const posRatio = sentimentCounts.Positif / maxSentVal;
  const posWidth = posRatio * 73;
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.positifGreen[0], colorPalette.positifGreen[1], colorPalette.positifGreen[2]);
  doc.text("POSITIF", 116, 45);
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  doc.text(`${sentimentCounts.Positif} Berita`, 189, 45, { align: 'right' });
  doc.setFillColor(colorPalette.bgLight[0], colorPalette.bgLight[1], colorPalette.bgLight[2]).rect(116, 47, 73, 2.5, 'F');
  doc.setFillColor(colorPalette.positifGreen[0], colorPalette.positifGreen[1], colorPalette.positifGreen[2]).rect(116, 47, Math.max(1, posWidth), 2.5, 'F');

  // Netral Segment
  const netRatio = sentimentCounts.Netral / maxSentVal;
  const netWidth = netRatio * 73;
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.netralBlue[0], colorPalette.netralBlue[1], colorPalette.netralBlue[2]);
  doc.text("NETRAL", 116, 56);
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  doc.text(`${sentimentCounts.Netral} Berita`, 189, 56, { align: 'right' });
  doc.setFillColor(colorPalette.bgLight[0], colorPalette.bgLight[1], colorPalette.bgLight[2]).rect(116, 58, 73, 2.5, 'F');
  doc.setFillColor(colorPalette.netralBlue[0], colorPalette.netralBlue[1], colorPalette.netralBlue[2]).rect(116, 58, Math.max(1, netWidth), 2.5, 'F');

  // Negatif Segment
  const negRatio = sentimentCounts.Negatif / maxSentVal;
  const negWidth = negRatio * 73;
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.negatifRed[0], colorPalette.negatifRed[1], colorPalette.negatifRed[2]);
  doc.text("NEGATIF", 116, 67);
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  doc.text(`${sentimentCounts.Negatif} Berita`, 189, 67, { align: 'right' });
  doc.setFillColor(colorPalette.bgLight[0], colorPalette.bgLight[1], colorPalette.bgLight[2]).rect(116, 69, 73, 2.5, 'F');
  doc.setFillColor(colorPalette.negatifRed[0], colorPalette.negatifRed[1], colorPalette.negatifRed[2]).rect(116, 69, Math.max(1, negWidth), 2.5, 'F');


  // ROW 2: Side-by-Side Large Breakdown Cards (Y=104 to Y=259, height=155)

  // --- CARD 3 (X=15, Width=87, Height=155): Daftar dan Jumlah Sumber Media ---
  doc.setFillColor(colorPalette.white[0], colorPalette.white[1], colorPalette.white[2]).roundedRect(15, 104, 87, 155, 3, 3, 'F');
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.4).roundedRect(15, 104, 87, 155, 3, 3, 'S');
  doc.setFillColor(colorPalette.brandBlue[0], colorPalette.brandBlue[1], colorPalette.brandBlue[2]).rect(15, 104, 3, 155, 'F');

  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  doc.text("JUMLAH SUMBER MEDIA", 23, 112);
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.2).line(23, 115, 96, 115);

  let mediaY = 120;
  sortedMedia.forEach((med, idx) => {
    const medName = med[0];
    const medCount = med[1];

    doc.setFillColor(colorPalette.oceanBg[0], colorPalette.oceanBg[1], colorPalette.oceanBg[2]);
    doc.roundedRect(23, mediaY - 4, 4.5, 4.5, 1, 1, 'F');
    doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(colorPalette.brandBlue[0], colorPalette.brandBlue[1], colorPalette.brandBlue[2]);
    doc.text(`${idx + 1}`, 25.25, mediaY - 0.7, { align: 'center' });

    const rawMedName = sanitizeTextForPDF(medName);
    const medNameTrunc = rawMedName.length > 20 ? rawMedName.substring(0, 18) + '..' : rawMedName;
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
    doc.text(medNameTrunc, 30, mediaY - 0.7);

    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(colorPalette.brandBlue[0], colorPalette.brandBlue[1], colorPalette.brandBlue[2]);
    doc.text(`${medCount} Berita`, 96, mediaY - 0.7, { align: 'right' });

    if (idx < sortedMedia.length - 1) {
      doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.12).line(23, mediaY + 3.8, 96, mediaY + 3.8);
    }
    mediaY += 13;
  });

  // --- CARD 4 (X=108, Width=87, Height=155): Daftar Jumlah dan Persentase Topik ---
  doc.setFillColor(colorPalette.white[0], colorPalette.white[1], colorPalette.white[2]).roundedRect(108, 104, 87, 155, 3, 3, 'F');
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.4).roundedRect(108, 104, 87, 155, 3, 3, 'S');
  doc.setFillColor(colorPalette.brandTeal[0], colorPalette.brandTeal[1], colorPalette.brandTeal[2]).rect(108, 104, 3, 155, 'F');

  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  doc.text("PERSENTASE TOPIK", 116, 112);
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.2).line(116, 115, 189, 115);

  let topicY = 120;
  sortedTopics.forEach((top, idx) => {
    const topicName = top[0];
    const topicCount = top[1];
    const pct = (topicCount / Math.max(1, p2TotalNewsCount)) * 100;

    const rawTopic = sanitizeTextForPDF(topicName);
    const topicTrunc = rawTopic.length > 20 ? rawTopic.substring(0, 18) + '..' : rawTopic;
    doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
    doc.text(topicTrunc, 116, topicY - 1);

    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
    doc.text(`${topicCount} (${pct.toFixed(1)}%)`, 189, topicY - 1, { align: 'right' });

    doc.setFillColor(colorPalette.bgLight[0], colorPalette.bgLight[1], colorPalette.bgLight[2]).rect(116, topicY + 0.8, 73, 1.6, 'F');
    const topicWidth = (topicCount / Math.max(1, p2TotalNewsCount)) * 73;
    doc.setFillColor(colorPalette.brandTeal[0], colorPalette.brandTeal[1], colorPalette.brandTeal[2]).rect(116, topicY + 0.8, Math.max(1, topicWidth), 1.6, 'F');

    if (idx < sortedTopics.length - 1) {
      doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.12).line(116, topicY + 4.5, 189, topicY + 4.5);
    }
    topicY += 13;
  });


  // ===================================
  // PAGE 4: GEOGRAPHIC MAP & REGIONAL SPATIALS (PORTRAIT)
  // ===================================
  doc.addPage('portrait');
  pageSectionTitles[doc.getNumberOfPages()] = "Sebaran Regional & Tabel Provinsi";

  // Map Snapshot Card at Top (Y=28 to Y=127)
  doc.setFillColor(colorPalette.white[0], colorPalette.white[1], colorPalette.white[2]).roundedRect(15, 27, 180, 100, 3, 3, 'F');
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.4).roundedRect(15, 27, 180, 100, 3, 3, 'S');

  doc.setFont("helvetica", "bold").setFontSize(9.5).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
  doc.text("PETA SEBARAN SPASIAL REGIONAL", 22, 34);
  doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.2).line(22, 38, 188, 38);

  const mapFrameY = 41;
  const mapFrameW = 166;
  const mapFrameH = 80;

  if (mapImgUrl && mapImgUrl.trim().length > 10) {
    try {
      doc.addImage(mapImgUrl, 'JPEG', 22, mapFrameY, mapFrameW, mapFrameH);
    } catch(e) {
      doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).rect(22, mapFrameY, mapFrameW, mapFrameH, 'S');
      doc.setFont("helvetica", "italic").setFontSize(9).setTextColor(colorPalette.textMuted[0], colorPalette.textMuted[1], colorPalette.textMuted[2]);
      doc.text("Gagal merekonstruksi screenshot peta GIS regional.", 22 + mapFrameW/2, mapFrameY + mapFrameH/2, { align: 'center' });
    }
  } else {
    // Elegant vectors layout fallback
    doc.setFillColor(colorPalette.bgLight[0], colorPalette.bgLight[1], colorPalette.bgLight[2]).rect(22, mapFrameY, mapFrameW, mapFrameH, 'F');
    doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).rect(22, mapFrameY, mapFrameW, mapFrameH, 'S');

    doc.setDrawColor(colorPalette.brandTeal[0], colorPalette.brandTeal[1], colorPalette.brandTeal[2]).setLineWidth(0.5);
    doc.line(30, mapFrameY + 15, 120, mapFrameY + 50).line(120, mapFrameY + 50, 170, mapFrameY + 30);
    
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
    doc.text("[ Peta Interaktif Spasial Terpasang Saat Ekspor ]", 22 + mapFrameW/2, mapFrameY + mapFrameH/2 - 2, { align: 'center' });

    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(colorPalette.textMuted[0], colorPalette.textMuted[1], colorPalette.textMuted[2]);
    doc.text("Aktifkan penarikan peta spasial di browser untuk snapshot optimal.", 22 + mapFrameW/2, mapFrameY + mapFrameH/2 + 5, { align: 'center' });
  }

  // Legend removed at bottom of map card in accordance with user request <buang legenda map>



  // Parse topics per province from newsList
  const provinceTopicsMap: Record<string, Record<string, number>> = {};
  newsList.forEach(item => {
    const prov = item.location || 'Nasional';
    const topic = item.categoryName || "Umum";
    if (!provinceTopicsMap[prov]) {
      provinceTopicsMap[prov] = {};
    }
    provinceTopicsMap[prov][topic] = (provinceTopicsMap[prov][topic] || 0) + 1;
  });

  const getTopTopicForProvince = (provName: string): string => {
    const topicsObj = provinceTopicsMap[provName];
    if (!topicsObj || Object.keys(topicsObj).length === 0) {
      if (provName.includes("Jakarta")) return "Subsidi Energi";
      if (provName.includes("Jawa Barat")) return "Infrastruktur";
      if (provName.includes("Sumatera Utara")) return "Ketahanan Pangan";
      if (provName.includes("Jawa Timur")) return "Kebijakan Fiskal";
      return "Umum";
    }
    return Object.entries(topicsObj)
      .sort((a, b) => b[1] - a[1])[0][0];
  };

  const parsedProvinceList = provinceStats 
    ? Object.entries(provinceStats)
        .filter(entry => entry[0] !== 'Nasional')
        .sort((a,b) => getNewsCount(b[1]) - getNewsCount(a[1]))
    : [
        ["DKI Jakarta", { newsCount: 38, positif: 4, netral: 8, negatif: 26 }],
        ["Jawa Barat", { newsCount: 22, positif: 2, netral: 4, negatif: 16 }],
        ["Sumatera Utara", { newsCount: 15, positif: 1, netral: 3, negatif: 11 }],
        ["Jawa Timur", { newsCount: 12, positif: 2, netral: 2, negatif: 8 }],
        ["Sumatera Selatan", { newsCount: 9, positif: 1, netral: 3, negatif: 5 }],
        ["Banten", { newsCount: 8, positif: 0, netral: 2, negatif: 6 }],
        ["Jawa Tengah", { newsCount: 7, positif: 1, netral: 1, negatif: 5 }],
        ["Sulawesi Selatan", { newsCount: 5, positif: 1, netral: 2, negatif: 2 }]
      ];

  // Chunking the provinces dynamically so they are all shown across multiple pages if required
  const firstPageLimit = 8;
  const subsequentPageLimit = 18;
  const chunks: Array<Array<[string, any]>> = [];
  let tempChunk: Array<[string, any]> = [];

  parsedProvinceList.forEach((provItem) => {
    if (chunks.length === 0) {
      tempChunk.push(provItem);
      if (tempChunk.length === firstPageLimit) {
        chunks.push(tempChunk);
        tempChunk = [];
      }
    } else {
      tempChunk.push(provItem);
      if (tempChunk.length === subsequentPageLimit) {
        chunks.push(tempChunk);
        tempChunk = [];
      }
    }
  });
  if (tempChunk.length > 0) {
    chunks.push(tempChunk);
  }

  // Draw tables for each chunk
  chunks.forEach((chunk, chunkIdx) => {
    const isFirstPage = chunkIdx === 0;
    
    if (!isFirstPage) {
      doc.addPage('portrait');
      const newPageIdx = doc.getNumberOfPages();
      pageSectionTitles[newPageIdx] = "Sebaran Regional & Tabel Provinsi";
    }

    const startY = isFirstPage ? 137 : 27;
    const numRows = chunk.length;
    const headerHeight = isFirstPage ? 19 : 21;
    const rowHeight = 11;
    const cardHeight = headerHeight + (numRows * rowHeight) + 4;

    // Draw card background & border
    doc.setFillColor(colorPalette.white[0], colorPalette.white[1], colorPalette.white[2]).roundedRect(15, startY, 180, cardHeight, 3, 3, 'F');
    doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.4).roundedRect(15, startY, 180, cardHeight, 3, 3, 'S');

    // Title
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
    const titleText = isFirstPage 
      ? "TABEL SEBARAN BERITA & SENTIMEN PROVINSI" 
      : `TABEL SEBARAN BERITA & SENTIMEN PROVINSI (Lanjutan - Bagian ${chunkIdx + 1})`;
    doc.text(titleText, 22, startY + 8);
    
    const titleLineY = startY + 11;
    doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.2).line(22, titleLineY, 188, titleLineY);

    // Draw Column Headers
    const headerY = startY + (isFirstPage ? 16 : 17);
    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
    doc.text("NO.", 18, headerY);
    doc.text("PROVINSI", 24, headerY);
    doc.text("TOTAL", 72, headerY, { align: "center" });
    doc.text("POSITIF", 90, headerY, { align: "center" });
    doc.text("NETRAL", 108, headerY, { align: "center" });
    doc.text("NEGATIF", 126, headerY, { align: "center" });
    doc.text("TOPIK UTAMA", 142, headerY);

    const fatLineY = startY + (isFirstPage ? 18 : 19);
    doc.setDrawColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]).setLineWidth(0.3).line(18, fatLineY, 192, fatLineY);

    let provItemY = fatLineY + 6;
    chunk.forEach((provItem, idx) => {
      // Calculate overall global index for row numbering
      const globalIdx = isFirstPage ? idx : firstPageLimit + (chunkIdx - 1) * subsequentPageLimit + idx;
      
      const provName = provItem[0];
      const rawVal = provItem[1];
      
      let newsCount = 0;
      let detailPos = 0;
      let detailNeg = 0;
      let detailNet = 0;

      if (typeof rawVal === 'number') {
        newsCount = rawVal;
        detailNet = newsCount;
      } else if (rawVal && typeof rawVal === 'object') {
        newsCount = Number(rawVal.newsCount || 0);
        detailPos = Number(rawVal.positif || 0);
        detailNeg = Number(rawVal.negatif || 0);
        detailNet = newsCount - detailPos - detailNeg;
      }

      const topTopic = getTopTopicForProvince(provName);

      // Zebra striping background for elegant readability
      if (idx % 2 === 1) {
        doc.setFillColor(colorPalette.bgLight[0], colorPalette.bgLight[1], colorPalette.bgLight[2]);
        doc.rect(18, provItemY - 4.5, 174, 11, 'F');
      }

      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
      
      // No
      doc.text(`${globalIdx + 1}`, 20, provItemY);
      
      // Prov (bolded for professional feel)
      doc.setFont("helvetica", "bold").text(sanitizeTextForPDF(provName), 24, provItemY);
      doc.setFont("helvetica", "normal");

      // Total/NewsCount
      doc.text(`${newsCount}`, 72, provItemY, { align: "center" });

      // Sentimen breakdown (color-coded count numbers)
      doc.setFont("helvetica", "bold");
      doc.setTextColor(colorPalette.positifGreen[0], colorPalette.positifGreen[1], colorPalette.positifGreen[2]);
      doc.text(`${detailPos}`, 90, provItemY, { align: "center" });
      
      doc.setTextColor(colorPalette.netralBlue[0], colorPalette.netralBlue[1], colorPalette.netralBlue[2]);
      doc.text(`${detailNet}`, 108, provItemY, { align: "center" });
      
      doc.setTextColor(colorPalette.negatifRed[0], colorPalette.negatifRed[1], colorPalette.negatifRed[2]);
      doc.text(`${detailNeg}`, 126, provItemY, { align: "center" });

      // Topic
      doc.setFont("helvetica", "normal").setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
      doc.text(sanitizeTextForPDF(topTopic), 142, provItemY);

      // Subtle line below unless it's the last one in this chunk
      if (idx < chunk.length - 1) {
        doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.12).line(18, provItemY + 6.5, 192, provItemY + 6.5);
      }

      provItemY += rowHeight;
    });
  });


  // ===================================
  // PAGE 4: HIGHLIGHT HARI INI (PORTRAIT)
  // ===================================
  doc.addPage('portrait');
  let currentHighlightPage = doc.getNumberOfPages();
  pageSectionTitles[currentHighlightPage] = "Highlight Isu";

  const itemsToHighlight = highlights && highlights.length > 0 
    ? highlights 
    : [
        {
          title: "Eks Wakil Pimpinan KPK Soroti Metode Penghitungan Sensus Kerugian Negara Atas Subsidi BBM Nasional",
          mediaName: "ANTARA News",
          categoryName: "Subsidi & Distribusi",
          publishDate: "14 Juni 2026",
          publishTime: "11:20",
          sentiment: "Negatif",
          summary: "Eks wakil pimpinan lembaga antirasuah menyampaikan keprihatinan taktis mengenai metode investigasi audit internal yang bersandar pada ekstrapolasi sampel teoretis daripada pembuktian fisik nyata di depot distribusi regional."
        },
        {
          title: "Transisi Pejabat Baru BGN Memicu Opini Pro Kontra Dan Tuntutan Transparansi Diskresional",
          mediaName: "CNN Indonesia",
          categoryName: "Tata Kelola Lembaga",
          publishDate: "13 Juni 2026",
          publishTime: "08:45",
          sentiment: "Negatif",
          summary: "Penunjukan kepengurusan baru memicu perdebatan masif di Twitter terkait rekam jejak independensi pembantu utama. Publik menuntut kepatuhan integritas mutlak guna mempercepat transparansi pemulihan reputasional."
        },
        {
          title: "Sinergi Penyaluran Subsidi Energi Tepat Sasaran Memperoleh Apresiasi Positif Lembaga Pengawas Nasional",
          mediaName: "Kompas TV",
          categoryName: "Mitigasi Strategis",
          publishDate: "14 Juni 2026",
          publishTime: "15:30",
          sentiment: "Positif",
          summary: "Kolaborasi intensif kepolisian dengan unit humas daerah dalam mengamankan sirkuit kargo bbm mendulang pujian publik. Keandalan suplai di seluruh titik krisis berhasil dipertahankan stabil."
        }
      ];

  let cardYPlace = 27;
  itemsToHighlight.forEach((hl, _hIdx) => {
    const { mainText, analysisText } = splitSummaryParts(hl.summary || "");
    const titleLines = wrapAndSanitizeText(doc, hl.title || "", 132, 10.5, "bold");
    const wrapHighlights = wrapAndSanitizeText(doc, mainText || "Belum ada ringkasan teks.", 166, 7.5, "normal");
    const wrapAnalysis = analysisText ? wrapAndSanitizeText(doc, analysisText, 166, 7.5, "normal") : [];

    // Calculate precise card heights and offsets sequentially
    let curY = 8; // offset from cardYPlace
    curY += titleLines.length * 4.2;
    curY += 2.5; // space to metabox
    const metaBoxOffset = curY;
    curY += 17; // metabox height
    curY += 4.5; // space to HIGHLIGHT header
    const highHeaderOffset = curY;
    curY += 3.7; // HIGHLIGHT header to first line
    curY += wrapHighlights.length * 3.5;
    
    let analHeaderOffset = 0;
    let analStartOffset = 0;
    if (analysisText) {
      curY += 4.0; // space after highlight body to ANALYSIS header
      analHeaderOffset = curY;
      curY += 3.7; // ANALYSIS header to first line
      analStartOffset = curY;
      curY += wrapAnalysis.length * 3.5;
    }
    
    curY += 4.0; // space before foot line
    const footLineOffset = curY;
    curY += 4.0; // space after foot line to bottom of card
    const cardHeight = curY;

    // If it doesn't fit on Page 4, add new page!
    if (cardYPlace + cardHeight > 265) {
      doc.addPage('portrait');
      currentHighlightPage++;
      pageSectionTitles[currentHighlightPage] = "Highlight Isu";
      cardYPlace = 27;
    }

    // Now draw background & border
    doc.setFillColor(colorPalette.white[0], colorPalette.white[1], colorPalette.white[2]).roundedRect(15, cardYPlace, 180, cardHeight, 3, 3, 'F');
    doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.4).roundedRect(15, cardYPlace, 180, cardHeight, 3, 3, 'S');

    // Sentiment indicator margin accent line
    const isNeg = (hl.sentiment || 'Negatif').toLowerCase().includes('neg');
    const isPos = (hl.sentiment || 'Negatif').toLowerCase().includes('pos');
    const cardAccent = isNeg ? colorPalette.negatifRed : (isPos ? colorPalette.positifGreen : colorPalette.netralBlue);
    
    doc.setFillColor(cardAccent[0], cardAccent[1], cardAccent[2]).rect(15, cardYPlace, 3, cardHeight, 'F');

    // Beautiful standalone Sentiment badge at the top right (no overwriting as title is wrapped at 132 width)
    drawSentimentBadge(doc, hl.sentiment || "Netral", 162, cardYPlace + 7, 26, 5.5);

    // Title
    doc.setFont("helvetica", "bold").setFontSize(10.5).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
    titleLines.forEach((line, i) => {
      doc.text(line, 22, cardYPlace + 8 + i * 4.2);
    });

    // Metadata background
    const metaBoxY = cardYPlace + metaBoxOffset;
    doc.setFillColor(colorPalette.bgLight[0], colorPalette.bgLight[1], colorPalette.bgLight[2]).roundedRect(22, metaBoxY, 166, 17, 1.5, 1.5, 'F');
    doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.15).roundedRect(22, metaBoxY, 166, 17, 1.5, 1.5, 'S');

    // Metadata labels and texts
    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
    doc.text("SUMBER MEDIA :", 26, metaBoxY + 5);
    doc.text("TOPIK :", 26, metaBoxY + 12);

    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
    doc.text(sanitizeTextForPDF(hl.mediaName || "Media Massa"), 50, metaBoxY + 5);
    doc.text(sanitizeTextForPDF(hl.categoryName || "Umum"), 50, metaBoxY + 12);

    doc.setFont("helvetica", "normal").setFontSize(7);
    doc.text(`${hl.publishDate || "14-06-2026"} ${hl.publishTime || ""}`, 184, metaBoxY + 5, { align: 'right' });

    // Highlight text area
    const highParaY = cardYPlace + highHeaderOffset;
    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
    doc.text("HIGHLIGHT", 22, highParaY);

    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
    wrapHighlights.forEach((line, indexL) => {
      const isLast = indexL === wrapHighlights.length - 1;
      drawJustifiedLine(doc, line, 22, cardYPlace + highHeaderOffset + 3.7 + indexL * 3.5, 166, isLast);
    });

    // Analysis text area
    if (analysisText) {
      const analParaY = cardYPlace + analHeaderOffset;
      doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.accentViolet[0], colorPalette.accentViolet[1], colorPalette.accentViolet[2]);
      doc.text("[ANALISIS] :", 22, analParaY);

      doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
      wrapAnalysis.forEach((line, indexA) => {
        const isLast = indexA === wrapAnalysis.length - 1;
        drawJustifiedLine(doc, line, 22, cardYPlace + analStartOffset + indexA * 3.5, 166, isLast);
      });
    }

    // Foot line
    const footLineY = cardYPlace + footLineOffset;
    doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.2).line(22, footLineY, 188, footLineY);

    cardYPlace += cardHeight + 6;
  });


  // ===================================
  // PAGE 5 AND ONWARDS: DETAIL BERITA LENGKAP (PORTRAIT APPROVED FLOW)
  // ===================================
  let newsStartPage = doc.getNumberOfPages() + 1;

  if (finalSubsetList.length === 0) {
    // Safeguard page if list is empty
    doc.addPage('portrait');
    const emptyPageNum = doc.getNumberOfPages();
    newsStartPage = emptyPageNum;
    pageSectionTitles[emptyPageNum] = "Daftar Lampiran Detail Berita Lengkap";
    doc.setFont("helvetica", "italic").setFontSize(9.5).setTextColor(colorPalette.textMuted[0], colorPalette.textMuted[1], colorPalette.textMuted[2]);
    doc.text("Tidak ada rilis berita terfilter pada rentang parameter ini.", 105, 140, { align: 'center' });
  } else {
    let currentY = 27;
    finalSubsetList.forEach((item, idx) => {
      const { mainText, analysisText } = splitSummaryParts(item.summary || "");
      const headingLines = wrapAndSanitizeText(doc, item.title || "Rilis Pemberitaan", 132, 10, "bold");
      const wrapHighlights = wrapAndSanitizeText(doc, mainText || "Belum ada ringkasan teks.", 166, 7.5, "normal");
      const wrapAnalysis = analysisText ? wrapAndSanitizeText(doc, analysisText, 166, 7.5, "normal") : [];

      // Calculate Card height dynamically
      let curY = 8; // start offset relative to currentY
      curY += headingLines.length * 4.2;
      curY += 2.5; // Space to metabox
      const metaBoxOffset = curY;
      curY += 6.5; // Metabox height inside news detail
      curY += 4.5; // Space to highlight header
      const highHeaderOffset = curY;
      curY += 3.7; // HIGHLIGHT header to first line
      curY += wrapHighlights.length * 3.5;
      
      let analHeaderOffset = 0;
      let analStartOffset = 0;
      if (analysisText) {
        curY += 4.0; // Space to analysis header
        analHeaderOffset = curY;
        curY += 3.7; // ANALYSIS header to first line
        analStartOffset = curY;
        curY += wrapAnalysis.length * 3.5;
      }
      
      curY += 4.0; // Space before foot line
      const footLineOffset = curY;
      curY += 4.5; // Space for the link text
      const linkTextOffset = curY;
      curY += 3.5; // Bottom padding space of card
      const cardHeight = curY;

      // If it doesn't fit on the current page, add new page
      if (idx === 0) {
        doc.addPage('portrait');
        const newsPageNum = doc.getNumberOfPages();
        newsStartPage = newsPageNum;
        pageSectionTitles[newsPageNum] = "Daftar Berita";
        currentY = 27;
      } else if (currentY + cardHeight > 265) {
        doc.addPage('portrait');
        const newsPageNum = doc.getNumberOfPages();
        pageSectionTitles[newsPageNum] = "Daftar Berita";
        currentY = 27;
      }

      // Draw Card background & border
      doc.setFillColor(colorPalette.white[0], colorPalette.white[1], colorPalette.white[2]).roundedRect(15, currentY, 180, cardHeight, 3, 3, 'F');
      doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.4).roundedRect(15, currentY, 180, cardHeight, 3, 3, 'S');

      const itemIsNeg = (item.sentiment || '').toLowerCase().includes('neg');
      const itemIsPos = (item.sentiment || '').toLowerCase().includes('pos');
      const accentCol = itemIsNeg ? colorPalette.negatifRed : (itemIsPos ? colorPalette.positifGreen : colorPalette.netralBlue);

      // Bold left ribbon indicators
      doc.setFillColor(accentCol[0], accentCol[1], accentCol[2]).rect(15, currentY, 3.5, cardHeight, 'F');

      // Standalone Sentiment badge at the top right (prevents overlaps since headline limits wrap-width to 132)
      drawSentimentBadge(doc, item.sentiment || "Netral", 162, currentY + 7, 26, 5.5);

      // Headline Text
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
      headingLines.forEach((line, lIdx) => {
        doc.text(line, 22, currentY + 8 + lIdx * 4.2);
      });

      // Meta tags details row inside card block
      const nMetaY = currentY + metaBoxOffset;
      doc.setFillColor(colorPalette.bgLight[0], colorPalette.bgLight[1], colorPalette.bgLight[2]).rect(22, nMetaY, 166, 6.5, 'F');
      doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.2).rect(22, nMetaY, 166, 6.5, 'S');

      // Texts (with safety truncation to fit inside metadata bar)
      doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.brandBlue[0], colorPalette.brandBlue[1], colorPalette.brandBlue[2]);
      const rawMedia = item.mediaName || "Media Lokal";
      const mediaTrunc = rawMedia.length > 20 ? rawMedia.substring(0, 18) + '..' : rawMedia;
      doc.text(sanitizeTextForPDF(mediaTrunc), 25, nMetaY + 4.5);
      
      doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
      const rawLoc = item.location || 'Nasional';
      const locTrunc = rawLoc.length > 18 ? rawLoc.substring(0, 16) + '..' : rawLoc;
      const rawCat = item.categoryName || 'Umum';
      const catTrunc = rawCat.length > 22 ? rawCat.substring(0, 20) + '..' : rawCat;
      doc.text(`Waktu: ${item.publishDate} ${item.publishTime || '08:00'}  |  Wilayah: ${locTrunc}  |  Topik: ${catTrunc}`, 72, nMetaY + 4.5);

      // Highlight Area
      const highParaY = currentY + highHeaderOffset;
      doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
      doc.text("HIGHLIGHT", 22, highParaY);

      doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
      wrapHighlights.forEach((line, indexL) => {
        const isLast = indexL === wrapHighlights.length - 1;
        drawJustifiedLine(doc, line, 22, currentY + highHeaderOffset + 3.7 + indexL * 3.5, 166, isLast);
      });

      // Analysis Area
      if (analysisText) {
        const analParaY = currentY + analHeaderOffset;
        doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.accentViolet[0], colorPalette.accentViolet[1], colorPalette.accentViolet[2]);
        doc.text("[ANALISIS] :", 22, analParaY);

        doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
        wrapAnalysis.forEach((line, indexA) => {
          const isLast = indexA === wrapAnalysis.length - 1;
          drawJustifiedLine(doc, line, 22, currentY + analStartOffset + indexA * 3.5, 166, isLast);
        });
      }

      // Foot stamps Tautan Sumber
      const footLineY = currentY + footLineOffset;
      doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.25).line(22, footLineY, 188, footLineY);

      doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(colorPalette.brandBlue[0], colorPalette.brandBlue[1], colorPalette.brandBlue[2]);
      const targetLink = item.link || "https://reputasi.go.id/news-footprint";
      doc.text(`Tautan Sumber: ${targetLink.substring(0, 90)}${targetLink.length > 90 ? '...' : ''}`, 22, currentY + linkTextOffset);

      currentY += cardHeight + 6;
    });
  }

  // ===================================
  // OPTIONAL PAGE: VISUAL ATTACHMENTS (PORTRAIT)
  // ===================================
  if (uploadedImages && uploadedImages.length > 0) {
    doc.addPage('portrait');
    const attachmentsPageNum = doc.getNumberOfPages();
    pageSectionTitles[attachmentsPageNum] = "Lampiran Dokumen & Kliping Visual";

    doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
    doc.text("DOKUMENTASI & KLIPING VISUAL", 22, 32);

    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(colorPalette.subslate[0], colorPalette.subslate[1], colorPalette.subslate[2]);
    doc.text("Berikut adalah materi lampiran visual atau bukti kliping media yang diunggah untuk melengkapi laporan:", 22, 38);

    let imgY = 46;
    const contentW = 166; // 188 - 22

    uploadedImages.forEach((imgItem: any, idx) => {
      let imgBase64 = "";
      let size: 'small' | 'medium' | 'large' | 'full' = 'medium';
      let customCaption = "";
      let imgAspect = 1.3333; // default aspect ratio 4:3

      if (typeof imgItem === 'string') {
        imgBase64 = imgItem;
        customCaption = `Lampiran Visual #${idx + 1}`;
      } else {
        imgBase64 = imgItem.src || "";
        size = imgItem.size || 'medium';
        customCaption = imgItem.caption || `Lampiran Visual #${idx + 1}`;
        if (imgItem.aspectRatio) {
          imgAspect = imgItem.aspectRatio;
        }
      }

      if (!imgBase64) return;

      let format = 'JPEG';

      try {
        const imageProps = doc.getImageProperties(imgBase64);
        if (imageProps) {
          format = imageProps.fileType || 'JPEG';
          const imgW = imageProps.width;
          const imgH = imageProps.height;
          if (imgW && imgH && !imgItem.aspectRatio) {
            imgAspect = imgW / imgH;
          }
        }
      } catch (e) {
        console.warn("Failed to get image properties for", customCaption, e);
      }

      // Determine max sizes based on selection
      let maxW = 120;
      let maxH = 90;
      if (size === 'small') {
        maxW = 75;
        maxH = 55;
      } else if (size === 'medium') {
        maxW = 120;
        maxH = 90;
      } else if (size === 'large') {
        maxW = 156;
        maxH = 120;
      } else if (size === 'full') {
        maxW = 166;
        maxH = 190;
      }

      // Compute render dimensions perfectly maintaining aspect ratio
      let renderW = maxW;
      let renderH = maxW / imgAspect;

      if (renderH > maxH) {
        renderH = maxH;
        renderW = maxH * imgAspect;
      }

      const cardPadding = 4;
      const captionHeight = 10;
      const neededHeight = renderH + (cardPadding * 2) + captionHeight;

      // Smart page breaking
      if (imgY + neededHeight > 265) {
        doc.addPage('portrait');
        const newPageNum = doc.getNumberOfPages();
        pageSectionTitles[newPageNum] = "Lampiran Dokumen & Kliping Visual (Lanjutan)";
        imgY = 32; // reset Y to initial margin
      }

      // Centering image in available workspace (166 mm width)
      const startX = 22 + (contentW - renderW) / 2;
      const cardX = startX - cardPadding;
      const cardW = renderW + (cardPadding * 2);
      const cardH = renderH + (cardPadding * 2) + captionHeight;

      try {
        // Draw card background & border
        doc.setFillColor(252, 252, 252);
        doc.setDrawColor(colorPalette.borderGray[0], colorPalette.borderGray[1], colorPalette.borderGray[2]).setLineWidth(0.35);
        doc.roundedRect(cardX, imgY, cardW, cardH, 2, 2, 'FD');

        // Draw image
        doc.addImage(imgBase64, format, startX, imgY + cardPadding, renderW, renderH);

        // Draw caption
        doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(colorPalette.darkSlate[0], colorPalette.darkSlate[1], colorPalette.darkSlate[2]);
        doc.text(customCaption, startX + renderW / 2, imgY + cardPadding + renderH + 6, { align: 'center' });
      } catch (err) {
        console.error("Failed to render attachment image inside PDF document:", err);
        doc.setFont("helvetica", "italic").setFontSize(8).setTextColor(colorPalette.negatifRed[0], colorPalette.negatifRed[1], colorPalette.negatifRed[2]);
        doc.text(`[Gagal memuat gambar: ${customCaption}]`, 22 + contentW / 2, imgY + cardH / 2, { align: 'center' });
      }

      imgY += cardH + 7; // advance carriage Y index
    });
  }

  // ===================================
  // SECOND PASS: DRAW HEADERS & FOOTERS FOR ALL PAGES
  // ===================================
  const totalPagesActual = doc.getNumberOfPages();
  totalNumPages = totalPagesActual; // Update the outer scope closure variable used inside drawHeaderFooter
  for (let pIdx = 2; pIdx <= totalPagesActual; pIdx++) {
    doc.setPage(pIdx);
    
    let pageTitleStr = pageSectionTitles[pIdx] || "";
    if (pageTitleStr.startsWith("Daftar Berita Lengkap")) {
      const totalNewsPages = totalPagesActual - newsStartPage + 1;
      const currentNewsPage = pIdx - newsStartPage + 1;
      pageTitleStr = `Daftar Berita Lengkap (Hal. ${currentNewsPage} dari ${totalNewsPages})`;
    }
    
    drawHeaderFooter(pIdx, pageTitleStr);
  }

  // ===================================
  // SAVE DOCUMENT / RETURN BASE64
  // ===================================
  const formattedDate = new Date().toISOString().slice(0, 10);
  const filePrefix = reportType === 'Weekly' ? 'Laporan-Mingguan' : (reportType === 'Monthly' ? 'Laporan-Bulanan' : 'Laporan-Kustom');
  
  const dataUri = doc.output('datauristring');
  
  if (returnBase64Only) {
    return dataUri;
  }
  
  doc.save(`${filePrefix}_A4_Portrait_MediaMonitoring_${formattedDate}.pdf`);
  return dataUri;
}
