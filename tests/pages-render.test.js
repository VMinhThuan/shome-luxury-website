const http = require('http');
const app = require('../app');

async function testPageRenders() {
  const server = http.createServer(app);
  await new Promise(res => server.listen(0, res));
  const port = server.address().port;

  const getPage = (path) => new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, length: data.length }));
    }).on('error', reject);
  });

  const routes = [
    { name: 'Trang chủ', path: '/' },
    { name: 'Xưởng sản xuất', path: '/xuong-san-xuat' },
    { name: 'Báo giá', path: '/bao-gia?category=tk-nt-chung-cu' },
    { name: 'Tin tức', path: '/tin-tuc' },
    { name: 'Tuyển dụng', path: '/tuyen-dung' },
    { name: 'Đặt lịch tư vấn', path: '/dat-lich-ngay' }
  ];

  console.log('\n--- VERIFYING RENDERING OF ALL 6 PAGES ---');
  let passed = 0;
  for (const r of routes) {
    const res = await getPage(r.path);
    if (res.status === 200 && res.length > 500) {
      console.log(` [PASS] ${r.name} (${r.path}) -> Status: ${res.status}, Length: ${res.length} bytes`);
      passed++;
    } else {
      console.error(` [FAIL] ${r.name} (${r.path}) -> Status: ${res.status}`);
    }
  }

  server.close();
  console.log(`\nResult: ${passed}/${routes.length} pages rendered successfully.\n`);
  process.exit(passed === routes.length ? 0 : 1);
}

testPageRenders();
