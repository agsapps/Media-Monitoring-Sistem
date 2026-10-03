import { jsPDF } from "jspdf";

const COLORS = {
  dark: [15, 23, 42] as [number, number, number],
  blue: [30, 64, 175] as [number, number, number],
  violet: [124, 58, 237] as [number, number, number],
  text: [51, 65, 85] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  light: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function cleanText(text: string): string {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, "")
    .replace(/[^\x20-\x7E\s\xC0-\xFF]/g, (char) => {
      const code = char.charCodeAt(0);
      if (code === 8211 || code === 8212) return "-";
      if (code === 8216 || code === 8217) return "'";
      if (code === 8220 || code === 8221) return '"';
      return "";
    });
}

export function generateAnalyticsPDF(
  reportText: string,
  options: {
    period?: string;
    filter?: string;
    totalData?: number;
    source?: string;
  } = {}
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginLeft = 18;
  const marginRight = 18;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const topContent = 32;
  const bottomContent = 267;

  let y = topContent;

  const addHeader = (pageNumber: number) => {
    doc.setFillColor(...COLORS.dark);
    doc.rect(0, 0, pageWidth, 18, "F");

    doc.setFillColor(...COLORS.violet);
    doc.rect(0, 18, pageWidth, 1.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.white);
    doc.text("SECURITY HEAD OFFICE", marginLeft, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("MEDIA INTELLIGENCE ANALYTICS", pageWidth - marginRight, 11, {
      align: "right",
    });

    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.25);
    doc.line(marginLeft, 276, pageWidth - marginRight, 276);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.muted);
    doc.text("CONFIDENTIAL - INTERNAL USE ONLY", marginLeft, 282);

    doc.setFont("helvetica", "normal");
    doc.text(
      `Halaman ${pageNumber}`,
      pageWidth - marginRight,
      282,
      { align: "right" }
    );
  };

  const newPage = () => {
    doc.addPage();
    y = topContent;
    addHeader(doc.getNumberOfPages());
  };

  const ensureSpace = (height: number) => {
    if (y + height > bottomContent) {
      newPage();
    }
  };

  const writeWrapped = (
    text: string,
    fontSize = 9,
    style: "normal" | "bold" = "normal",
    lineHeight = 4.5
  ) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(fontSize);
    doc.setTextColor(...COLORS.text);

    const lines = doc.splitTextToSize(cleanText(text), contentWidth);

    ensureSpace(lines.length * lineHeight + 2);

    lines.forEach((line: string) => {
      doc.text(line, marginLeft, y);
      y += lineHeight;
    });

    y += 1.5;
  };

  const addSection = (title: string) => {
    ensureSpace(16);

    y += 2;

    doc.setFillColor(...COLORS.dark);
    doc.roundedRect(marginLeft, y - 5, contentWidth, 9, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.white);
    doc.text(cleanText(title), marginLeft + 5, y + 1);

    y += 10;
  };

  // Cover / first page
  doc.setFillColor(...COLORS.light);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, 13, pageHeight, "F");

  doc.setFillColor(...COLORS.violet);
  doc.rect(13, 0, 1.5, pageHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COLORS.dark);

  const titleLines = doc.splitTextToSize(
    "ANALITIK INTELIJEN MEDIA",
    150
  );

  let coverY = 65;
  titleLines.forEach((line: string) => {
    doc.text(line, 25, coverY);
    coverY += 10;
  });

  doc.setFillColor(...COLORS.violet);
  doc.rect(25, coverY + 2, 42, 1.2, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);
  doc.text(
    "Laporan analisis strategis berbasis hasil pemantauan media",
    25,
    coverY + 14
  );

  const infoY = coverY + 30;

  doc.setFillColor(...COLORS.white);
  doc.roundedRect(25, infoY, 160, 78, 3, 3, "F");

  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.roundedRect(25, infoY, 160, 78, 3, 3, "S");

  doc.setFillColor(...COLORS.dark);
  doc.rect(25, infoY, 160, 11, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.white);
  doc.text("INFORMASI ANALISIS", 31, infoY + 7);

  const metadata = [
    ["PERIODE", options.period || "Semua Periode"],
    ["FILTER", options.filter || "Filter aktif"],
    ["DATA TERANALISIS", String(options.totalData ?? "-") + " berita"],
    ["MESIN ANALISIS", options.source || "GLM-5.3-Flash"],
    ["STATUS", "ANALISIS INTELIJEN MEDIA"],
  ];

  let metaY = infoY + 23;

  metadata.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.muted);
    doc.text(label, 31, metaY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.dark);

    const valueLines = doc.splitTextToSize(cleanText(value), 95);
    doc.text(valueLines, 82, metaY);

    metaY += 10;
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.muted);
  doc.text(
    `Dibuat ${new Date().toLocaleString("id-ID")}`,
    25,
    252
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.dark);
  doc.text("SECURITY HEAD OFFICE - MEDIA MONITORING", 25, 266);

  // Content starts on page 2
  newPage();

  const rawLines = cleanText(reportText)
    .replace(/\r/g, "")
    .split("\n");

  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;

    const paragraph = paragraphBuffer.join(" ").trim();
    if (paragraph) {
      writeWrapped(paragraph, 9, "normal", 4.5);
    }

    paragraphBuffer = [];
  };

  rawLines.forEach((rawLine) => {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      y += 2;
      return;
    }

    // Markdown heading
    if (/^#{1,6}\s+/.test(line)) {
      flushParagraph();

      const heading = line.replace(/^#{1,6}\s+/, "").trim();
      addSection(heading);
      return;
    }

    // Markdown horizontal separator
    if (/^[-_=]{3,}$/.test(line)) {
      flushParagraph();
      ensureSpace(5);
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, y, pageWidth - marginRight, y);
      y += 5;
      return;
    }

    // Markdown table
    if (line.startsWith("|") && line.endsWith("|")) {
      flushParagraph();

      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cleanText(cell.trim()));

      if (cells.every((cell) => /^[-: ]+$/.test(cell))) {
        return;
      }

      const columnCount = Math.max(cells.length, 1);
      const columnWidth = contentWidth / columnCount;
      const rowHeight = 8;

      ensureSpace(rowHeight + 2);

      doc.setFillColor(...COLORS.light);
      doc.setDrawColor(...COLORS.border);

      cells.forEach((cell, index) => {
        const x = marginLeft + index * columnWidth;

        doc.rect(x, y - 5, columnWidth, rowHeight, "FD");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...COLORS.text);

        const cellLines = doc.splitTextToSize(cell, columnWidth - 3);
        doc.text(cellLines.slice(0, 2), x + 1.5, y);
      });

      y += rowHeight;
      return;
    }

    // Bullet / numbered list
    const bulletMatch = line.match(/^([-*•]|\d+[.)])\s+(.*)$/);

    if (bulletMatch) {
      flushParagraph();

      const bullet = bulletMatch[1];
      const content = bulletMatch[2];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...COLORS.violet);

      ensureSpace(9);

      doc.text(bullet, marginLeft, y);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.text);

      const lines = doc.splitTextToSize(content, contentWidth - 8);

      lines.forEach((wrapped: string, index: number) => {
        doc.text(wrapped, marginLeft + 7, y);
        y += 4.5;
      });

      y += 1;
      return;
    }

    // Bold markdown-only line
    if (/^\*\*.*\*\*$/.test(line)) {
      flushParagraph();

      const boldText = line.replace(/^\*\*|\*\*$/g, "");
      writeWrapped(boldText, 9, "bold", 4.5);
      return;
    }

    paragraphBuffer.push(line);
  });

  flushParagraph();

  // Add page number/header to every generated page.
  for (let page = 2; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page);
    addHeader(page);
  }

  const datePart = new Date().toISOString().slice(0, 10);
  doc.save(`Analitik_Intelijen_Media_${datePart}.pdf`);
}
