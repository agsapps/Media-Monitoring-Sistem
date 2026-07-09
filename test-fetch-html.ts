import https from 'https';
import fs from 'fs';

const testUrl = 'https://news.google.com/rss/articles/CBMisAFBVV95cUxObFVIRFNhWmhEMVdXR0JleWhxdkt2ZWJ0Q1NXY2xqVFhmbWo3Rk9XUGk4aXZSa05CTkNjSWs3QzRYNkFoNzhjVmFnV1ZfWmRRandqdnY3clV1a2Fjc0JjQ0twS1o3Ukw0dXZrcnVmQVJSUXFEQzgxb2RLS0FyM0U0VGFqSmpFX3FmNC1rMnF6ei1NRDdPQlVCUTlpS01YZmZZcGtXSVZoWnE4aGtnUGVWdNIBtgFBVV95cUxNTG5CQ1lZeDM2SDhTRTdxMGN6dGJEV0xDcGVRT2NTQTNURkI5SzRvRklPcXhUUlNUUTRjLV9CVEJnSlJhaDhBa1FJcTNjMnZPZ3FXWE81eHoyLUR1aUlMX09ycHhpQ3JKMWN0V04zYy0wNkN3a08yRkQ1Tm5hdy1KaUhEWE5YS3FGVVJwODdpWEFHUXdzVmcyZlNGX3VuS21TSmt5aXdXNF80TWN1aDY1WkJvUnVvZw?oc=5';

function fetchUrl(urlStr: string, depth = 0): void {
  if (depth > 5) {
    console.log('Too many redirects!');
    return;
  }
  console.log(`[Depth ${depth}] Fetching: ${urlStr}`);
  https.get(urlStr, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  }, (res) => {
    console.log(`[Depth ${depth}] Status:`, res.statusCode);
    if (res.statusCode === 302 || res.statusCode === 301) {
      const nextUrl = res.headers.location;
      if (nextUrl) {
        fetchUrl(nextUrl, depth + 1);
      }
      return;
    }
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`[Depth ${depth}] Data length:`, data.length);
      fs.writeFileSync('google-news-response.html', data);
      console.log('Saved response.');
      // Print first meta or original url candidates found in the body
      const matches = data.match(/url=(https?:\/\/[^"]+)/i) || data.match(/href="(https?:\/\/[^"]+)"/i);
      console.log('Regex matches:', matches);
    });
  });
}

fetchUrl(testUrl);
