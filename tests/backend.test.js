const http = require('http');
const app = require('../app');
const connectDB = require('../src/config/db');
const { MongoClient } = require('mongodb');

let server;
const PORT = 3039;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runBackendTests() {
  console.log('==================================================');
  console.log(' STARTING COMPREHENSIVE BACKEND AUTOMATED TESTS');
  console.log('==================================================\n');

  await connectDB();
  server = app.listen(PORT);
  console.log(`Test server running on port ${PORT}\n`);

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
    // 1. Auth Test
    console.log('--- TEST 1: Admin Authentication ---');
    const loginRes = await makeRequest('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    assert(loginRes.status === 200 && loginRes.body.token, 'Admin login returns 200 and JWT token');
    const adminToken = loginRes.body.token;

    const unauthRes = await makeRequest('POST', '/api/admin/categories', { name: 'Unauthorized Cat', slug: 'unauth-cat' });
    assert(unauthRes.status === 401, 'Unauthenticated admin request returns 401');

    // 2. Public Category Tree API Test
    console.log('\n--- TEST 2: Public Category Tree API ---');
    const catTreeRes = await makeRequest('GET', '/api/categories');
    assert(catTreeRes.status === 200 && Array.isArray(catTreeRes.body.data), 'GET /api/categories returns 200 and array');
    assert(catTreeRes.body.data.length >= 2, 'Category tree contains root categories (Thiết kế công trình & Thi công công trình)');

    // 3. Category Detail API Test
    console.log('\n--- TEST 3: Category Detail API ---');
    const catDetailRes = await makeRequest('GET', '/api/categories/thiet-ke-kien-truc');
    assert(catDetailRes.status === 200 && catDetailRes.body.data.code === 'thiet-ke-kien-truc', 'GET /api/categories/thiet-ke-kien-truc returns 200 and category details');

    // 4. Public Projects List & Pagination Test
    console.log('\n--- TEST 4: Public Projects List & Pagination ---');
    const projectsRes = await makeRequest('GET', '/api/projects?limit=10');
    assert(projectsRes.status === 200 && projectsRes.body.data.length === 10, 'GET /api/projects?limit=10 returns 10 items');
    assert(projectsRes.body.pagination.totalItems === 297, 'Total items count is 297');

    // 5. Search Filter Test
    console.log('\n--- TEST 5: Search Filter ---');
    const searchRes = await makeRequest('GET', '/api/projects?search=Smart');
    assert(searchRes.status === 200 && searchRes.body.data.length > 0, 'GET /api/projects?search=Smart returns search results');
    assert(searchRes.body.data[0].title.includes('SMART') || searchRes.body.data[0].location.includes('Smart'), 'Search result contains search keyword');

    // 6. Descendant Category Filtering Test (CRITICAL)
    console.log('\n--- TEST 6: Descendant Category Filtering ---');
    // Querying parent category "thiet-ke-kien-truc" should return 44 (nhà cấp 4) + 53 (nhà phố) + 62 (biệt thự) + 37 (villa) = 196 projects!
    const descCatRes = await makeRequest('GET', '/api/projects?category=thiet-ke-kien-truc&limit=300');
    assert(descCatRes.status === 200 && descCatRes.body.data.length === 196, `Parent category 'thiet-ke-kien-truc' returns all 196 descendant projects (Got: ${descCatRes.body.data.length})`);

    // Leaf category "tk-kt-biet-thu" should return 62 projects
    const leafCatRes = await makeRequest('GET', '/api/projects?category=tk-kt-biet-thu&limit=100');
    assert(leafCatRes.status === 200 && leafCatRes.body.data.length === 62, `Leaf category 'tk-kt-biet-thu' returns 62 projects (Got: ${leafCatRes.body.data.length})`);

    // 7. Sorting Test
    console.log('\n--- TEST 7: Project Sorting ---');
    const oldestRes = await makeRequest('GET', '/api/projects?sort=oldest&limit=1');
    assert(oldestRes.status === 200 && oldestRes.body.data.length === 1, 'GET /api/projects?sort=oldest returns project');

    // 8. Admin Project CRUD & Gallery API Test
    console.log('\n--- TEST 8: Admin Project CRUD & Gallery ---');
    const newProjData = {
      title: 'Dự án Mẫu Test Admin',
      slug: 'du-an-mau-test-admin',
      investor: 'Chủ đầu tư Test',
      location: 'Hà Nội',
      area: '250m2',
      style: 'Hiện đại',
      status: 'published',
      categoryIds: [catDetailRes.body.data._id]
    };

    const createProjRes = await makeRequest('POST', '/api/admin/projects', newProjData, { 'Authorization': `Bearer ${adminToken}` });
    assert(createProjRes.status === 201 && createProjRes.body.data._id, 'POST /api/admin/projects creates new project');
    const createdId = createProjRes.body.data._id;

    // Update thumbnail
    const thumbRes = await makeRequest('PUT', `/api/admin/projects/${createdId}/thumbnail`, { thumbnailUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' }, { 'Authorization': `Bearer ${adminToken}` });
    assert(thumbRes.status === 200 && thumbRes.body.data.thumbnail === 'https://res.cloudinary.com/demo/image/upload/sample.jpg', 'PUT /api/admin/projects/:id/thumbnail updates thumbnail');

    // Add to gallery
    const galAddRes = await makeRequest('POST', `/api/admin/projects/${createdId}/gallery`, { imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample2.jpg' }, { 'Authorization': `Bearer ${adminToken}` });
    assert(galAddRes.status === 200 && galAddRes.body.data.gallery.includes('https://res.cloudinary.com/demo/image/upload/sample2.jpg'), 'POST /api/admin/projects/:id/gallery adds image');

    // Delete test project
    const delProjRes = await makeRequest('DELETE', `/api/admin/projects/${createdId}`, null, { 'Authorization': `Bearer ${adminToken}` });
    assert(delProjRes.status === 200, 'DELETE /api/admin/projects/:id deletes project');

    console.log('\n==================================================');
    console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runBackendTests();
