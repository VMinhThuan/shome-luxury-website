const http = require('http');
const app = require('../app');
const connectDB = require('../src/config/db');

let server;
const PORT = 3042;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method: 'GET',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    req.end();
  });
}

async function testFrontend() {
  console.log('==================================================');
  console.log(' FRONTEND SHOWCASE & DETAIL ROUTES TEST');
  console.log('==================================================\n');

  await connectDB();
  server = app.listen(PORT);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` [PASS] ${message}`);
      passed++;
    } else {
      console.error(` [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    console.log('--- 0. TESTING QUOTE PAGE ---');
    const quotePageRes = await makeRequest('/bao-gia?category=tk-nt-chung-cu');
    assert(quotePageRes.status === 200, 'GET /bao-gia?category=tk-nt-chung-cu returns 200 OK');
    assert(quotePageRes.body.includes('quote-page') && quotePageRes.body.includes('nhan-du-toan'), 'Quote page renders dynamic page structure and estimate CTA');

    const routesToTest = [
      { path: '/thiet-ke-cong-trinh', expectedCount: 297, label: 'Thiết kế công trình' },
      { path: '/thiet-ke-kien-truc', expectedCount: 196, label: 'Thiết kế kiến trúc' },
      { path: '/thiet-ke-kien-truc/nha-cap-4', expectedCount: 44, label: 'Kiến trúc nhà cấp 4' },
      { path: '/thiet-ke-kien-truc/nha-pho', expectedCount: 53, label: 'Kiến trúc nhà phố' },
      { path: '/thiet-ke-kien-truc/biet-thu', expectedCount: 62, label: 'Kiến trúc biệt thự' },
      { path: '/thiet-ke-kien-truc/villa', expectedCount: 37, label: 'Kiến trúc villa' },
      { path: '/thiet-ke-noi-that', expectedCount: 101, label: 'Thiết kế nội thất' },
      { path: '/thiet-ke-noi-that/chung-cu', expectedCount: 43, label: 'Nội thất chung cư' },
      { path: '/thiet-ke-noi-that/nha-pho', expectedCount: 0, label: 'Nội thất nhà phố (Empty state)' },
      { path: '/thiet-ke-noi-that/biet-thu', expectedCount: 17, label: 'Nội thất biệt thự' },
      { path: '/thiet-ke-noi-that/van-phong', expectedCount: 41, label: 'Nội thất văn phòng' },
      { path: '/thi-cong-cong-trinh', expectedCount: 0, label: 'Thi công công trình (Empty state)' }
    ];

    console.log('--- 1. TESTING SHOWCASE ROUTES (HTML SSR) ---');
    for (const item of routesToTest) {
      const res = await makeRequest(item.path);
      assert(res.status === 200, `GET ${item.path} returns 200 OK`);
      
      const codeMap = {
        '/thiet-ke-cong-trinh': 'thiet-ke-cong-trinh',
        '/thiet-ke-kien-truc': 'thiet-ke-kien-truc',
        '/thiet-ke-kien-truc/nha-cap-4': 'tk-kt-nha-cap-4',
        '/thiet-ke-kien-truc/nha-pho': 'tk-kt-nha-pho',
        '/thiet-ke-kien-truc/biet-thu': 'tk-kt-biet-thu',
        '/thiet-ke-kien-truc/villa': 'tk-kt-villa',
        '/thiet-ke-noi-that': 'thiet-ke-noi-that',
        '/thiet-ke-noi-that/chung-cu': 'tk-nt-chung-cu',
        '/thiet-ke-noi-that/nha-pho': 'tk-nt-nha-pho',
        '/thiet-ke-noi-that/biet-thu': 'tk-nt-biet-thu',
        '/thiet-ke-noi-that/van-phong': 'tk-nt-van-phong',
        '/thi-cong-cong-trinh': 'thi-cong-cong-trinh'
      };

      const apiRes = await makeRequest(`/api/projects?category=${codeMap[item.path]}&limit=350`);
      const apiJson = JSON.parse(apiRes.body);
      assert(apiJson.pagination.totalItems === item.expectedCount, `API category '${codeMap[item.path]}' returns totalItems = ${item.expectedCount} (Got: ${apiJson.pagination.totalItems})`);
    }

    console.log('\n--- 2. TESTING 5 REAL PROJECT DETAIL PAGES ---');
    const sampleSlugs = [
      'mr-tuan-vinhomes-smart-city-hn',
      'mr-manh-time-city-hn',
      'mr-tuyen-ba-dinh-hn',
      'mrs-phuong-biet-thu-an-thinh-villa-hn',
      'mrs-ha-ha-dong-hn'
    ];

    for (const slug of sampleSlugs) {
      const detailRes = await makeRequest(`/cong-trinh/${slug}`);
      assert(detailRes.status === 200, `GET /cong-trinh/${slug} returns 200 OK`);
      assert(detailRes.body.includes(slug) || detailRes.body.includes('LUXURY HOME'), `Detail HTML contains project data`);
    }

    console.log('\n==================================================');
    console.log(` FRONTEND TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

testFrontend();
