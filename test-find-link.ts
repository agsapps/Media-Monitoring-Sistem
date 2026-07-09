import fs from 'fs';

const html = fs.readFileSync('google-news-response.html', 'utf8');

// Find all anchor links (href)
const hrefRegex = /href="([^"]+)"/g;
let m;
const hrefs = new Set<string>();
while ((m = hrefRegex.exec(html)) !== null) {
  hrefs.add(m[1]);
}

console.log('--- Anchor Links ---');
for (const href of hrefs) {
  if (href.startsWith('http') && !href.includes('google.com') && !href.includes('google.co.id')) {
    console.log('FOUND EXTERNAL LINK:', href);
  }
}

// Find all script blocks or other string links
const httpRegex = /"(https?:\/\/[^"\\]+)"/g;
const strings = new Set<string>();
while ((m = httpRegex.exec(html)) !== null) {
  strings.add(m[1]);
}

console.log('--- String/JSON URLs ---');
for (const s of strings) {
  if (!s.includes('google.com') && !s.includes('gstatic.com') && !s.includes('google-analytics.com')) {
    console.log('FOUND EXTERNAL URL IN STRING:', s);
  }
}
