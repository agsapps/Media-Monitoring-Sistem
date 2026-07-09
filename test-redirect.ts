import https from 'https';

const testUrl = 'https://news.google.com/rss/articles/CBMisAFBVV95cUxObFVIRFNhWmhEMVdXR0JleWhxdkt2ZWJ0Q1NXY2xqVFhmbWo3Rk9XUGk4aXZSa05CTkNjSWs3QzRYNkFoNzhjVmFnV1ZfWmRRandqdnY3clV1a2Fjc0JjQ0twS1o3Ukw0dXZrcnVmQVJSUXFEQzgxb2RLS0FyM0U0VGFqSmpFX3FmNC1rMnF6ei1NRDdPQlVCUTlpS01YZmZZcGtXSVZoWnE4aGtnUGVWdNIBtgFBVV95cUxNTG5CQ1lZeDM2SDhTRTdxMGN6dGJEV0xDcGVRT2NTQTNURkI5SzRvRklPcXhUUlNUUTRjLV9CVEJnSlJhaDhBa1FJcTNjMnZPZ3FXWE81eHoyLUR1aUlMX09ycHhpQ3JKMWN0V04zYy0wNkN3a08yRkQ1Tm5hdy1KaUhEWE5YS3FGVVJwODdpWEFHUXdzVmcyZlNGX3VuS21TSmt5aXdXNF80TWN1aDY1WkJvUnVvZw?oc=5';

function resolveUrlViaHttps(urlStr: string): Promise<string> {
  return new Promise((resolve) => {
    https.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      console.log('Status code:', res.statusCode);
      console.log('Headers:', res.headers);
      if (res.headers.location) {
        resolve(res.headers.location);
      } else {
        // Collect data
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          // Look for meta refresh or standard links
          const match = data.match(/url=(https?:\/\/[^"]+)/i) || data.match(/href="(https?:\/\/[^"]+)"/i);
          if (match) {
            resolve(match[1]);
          } else {
            // Let's print a slice of body
            console.log('Body snippet:', data.slice(0, 1000));
            resolve(urlStr);
          }
        });
      }
    }).on('error', (err) => {
      console.error('Error:', err);
      resolve(urlStr);
    });
  });
}

resolveUrlViaHttps(testUrl).then((resolved) => {
  console.log('RESOLVED URL:', resolved);
});
