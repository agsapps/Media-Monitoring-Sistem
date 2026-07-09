import fs from 'fs';

const html = fs.readFileSync('google-news-response.html', 'utf8');

// Find all matches for http or https URLs in any format
const urlRegex = /https?:\/\/[a-zA-Z0-9.\-_/=?&%#+;]+/g;
const urls = new Set<string>();
let m;
while ((m = urlRegex.exec(html)) !== null) {
  urls.add(m[0]);
}

console.log('--- All URLs in file ---');
for (const u of urls) {
  if (!u.includes('google.com') && !u.includes('gstatic.com') && !u.includes('googleusercontent.com') && !u.includes('w3.org') && !u.includes('google-analytics.com') && !u.includes('googletagmanager.com')) {
    console.log(u);
  }
}
