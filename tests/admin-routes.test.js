const http = require('http');
const app = require('../app');
const connectDB = require('../src/config/db');

let server;
const PORT = 3048;
const BASE_URL = `http://localhost:${PORT}`;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = { ...headers };
    if (body && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: reqHeaders
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          // Keep as string (HTML)
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function extractCookie(headers, cookieName) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of cookies) {
    const parts = c.split(';')[0].split('=');
    if (parts[0].trim() === cookieName) {
      return parts.slice(1).join('=');
    }
  }
  return null;
}

async function runAdminRoutesTest() {
  console.log('====================================================');
  console.log(' STARTING CMS ADMIN UNIFIED DOMAIN & VERCEL TESTS');
  console.log('====================================================\n');

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
    // 1. Public route test with custom Host header (simulating Vercel domain)
    console.log('--- TEST 1: Public Homepage on Vercel domain ---');
    const publicRes = await makeRequest('GET', '/', null, { 'Host': 'shome-luxury.vercel.app' });
    assert(publicRes.status === 200, 'GET / on Vercel domain returns 200 OK');
    assert(typeof publicRes.body === 'string' && publicRes.body.includes('SHOME'), 'GET / renders public website, NOT admin');

    // 2. Unauthenticated access to /admin/images
    console.log('\n--- TEST 2: Unauthenticated /admin/images redirect ---');
    const unauthImagesRes = await makeRequest('GET', '/admin/images', null, { 'Host': 'shome-luxury.vercel.app' });
    assert(unauthImagesRes.status === 302, 'Unauthenticated GET /admin/images returns 302 redirect');
    assert(unauthImagesRes.headers['location'] === '/admin/login', 'Redirect location is /admin/login');

    // 3. Unauthenticated access to /admin
    console.log('\n--- TEST 3: Route /admin redirect ---');
    const adminRootRes = await makeRequest('GET', '/admin', null, { 'Host': 'shome-luxury.vercel.app' });
    assert(adminRootRes.status === 302, 'GET /admin returns 302 redirect');
    assert(adminRootRes.headers['location'] === '/admin/images', 'Redirects /admin to /admin/images');

    // 4. Admin login page
    console.log('\n--- TEST 4: Admin Login Page ---');
    const loginPageRes = await makeRequest('GET', '/admin/login', null, { 'Host': 'shome-luxury.vercel.app' });
    assert(loginPageRes.status === 200, 'GET /admin/login returns 200 OK');
    assert(typeof loginPageRes.body === 'string' && loginPageRes.body.includes('data-login-form'), 'Renders admin login form');

    // 5. Authentication & Login API
    console.log('\n--- TEST 5: Admin Login API & Redirection Target ---');
    const badLoginRes = await makeRequest('POST', '/api/auth/login', { username: 'admin', password: 'wrongpassword' });
    assert(badLoginRes.status === 401, 'Bad credentials returns 401');

    const goodLoginRes = await makeRequest('POST', '/api/auth/login', { username: 'admin', password: 'admin123' }, { 'Host': 'shome-luxury.vercel.app' });
    assert(goodLoginRes.status === 200, 'Correct credentials returns 200');
    assert(goodLoginRes.body.redirectUrl === '/admin/images', 'redirectUrl defaults to /admin/images');
    const sessionCookie = extractCookie(goodLoginRes.headers, 'shome_admin_session');
    assert(sessionCookie !== null, 'shome_admin_session cookie is set by server');

    const cookieHeader = `shome_admin_session=${sessionCookie}`;

    // 6. Authenticated access to /admin/images (including browser refresh)
    console.log('\n--- TEST 6: Authenticated /admin/images & direct refresh ---');
    const authImagesRes1 = await makeRequest('GET', '/admin/images', null, {
      'Host': 'shome-luxury.vercel.app',
      'Cookie': cookieHeader
    });
    assert(authImagesRes1.status === 200, 'Authenticated GET /admin/images returns 200 OK');
    assert(typeof authImagesRes1.body === 'string' && authImagesRes1.body.includes('Quản lý ảnh các trang'), 'Renders admin-images EJS template');

    // Refresh simulation (exact same request again)
    const authImagesRes2 = await makeRequest('GET', '/admin/images', null, {
      'Host': 'shome-luxury.vercel.app',
      'Cookie': cookieHeader
    });
    assert(authImagesRes2.status === 200, 'Direct refresh on /admin/images returns 200 OK');

    // 7. Already authenticated user visiting /admin/login
    console.log('\n--- TEST 7: Authenticated user visiting /admin/login ---');
    const authLoginVisitRes = await makeRequest('GET', '/admin/login', null, {
      'Host': 'shome-luxury.vercel.app',
      'Cookie': cookieHeader
    });
    assert(authLoginVisitRes.status === 302 && authLoginVisitRes.headers['location'] === '/admin/images', 'Authenticated user at /admin/login redirected to /admin/images');

    // 8. Server-side API protection for images and upload
    console.log('\n--- TEST 8: Server-side API Protection for Image Admin & Upload ---');
    const unauthGetImages = await makeRequest('GET', '/api/admin/home-images');
    assert(unauthGetImages.status === 401, 'GET /api/admin/home-images without token returns 401');

    const unauthPutImages = await makeRequest('PUT', '/api/admin/home-images/hero_slide_1');
    assert(unauthPutImages.status === 401, 'PUT /api/admin/home-images/:key without token returns 401');

    const unauthDelImages = await makeRequest('DELETE', '/api/admin/home-images/hero_slide_1');
    assert(unauthDelImages.status === 401, 'DELETE /api/admin/home-images/:key without token returns 401');

    const unauthUpload = await makeRequest('POST', '/api/upload');
    assert(unauthUpload.status === 401, 'POST /api/upload without token returns 401');

    const unauthRecruitUpload = await makeRequest('POST', '/api/recruitment/upload');
    assert(unauthRecruitUpload.status === 401, 'POST /api/recruitment/upload without token returns 401');

    // 9. Authenticated Admin API access
    console.log('\n--- TEST 9: Authenticated Admin Image API access ---');
    const authGetImages = await makeRequest('GET', '/api/admin/home-images', null, { 'Cookie': cookieHeader });
    assert(authGetImages.status === 200 && Array.isArray(authGetImages.body.data), 'GET /api/admin/home-images returns 200 and image slots array');
    assert(authGetImages.body.data.length === 55, `Returned all 55 legacy image slots across 6 pages (received ${authGetImages.body.data.length})`);
    assert(Array.isArray(authGetImages.body.pages) && authGetImages.body.pages.length === 7, 'Returns 7 page tab entries (all + 6 pages)');

    const authGetFactory = await makeRequest('GET', '/api/admin/home-images?page=factory', null, { 'Cookie': cookieHeader });
    assert(authGetFactory.status === 200 && authGetFactory.body.data.length === 21, `GET ?page=factory returns 21 slots (received ${authGetFactory.body.data.length})`);

    const authGetHome = await makeRequest('GET', '/api/admin/home-images?page=home', null, { 'Cookie': cookieHeader });
    assert(authGetHome.status === 200 && authGetHome.body.data.length === 18, `GET ?page=home returns 18 slots (received ${authGetHome.body.data.length})`);

    const authGetQuote = await makeRequest('GET', '/api/admin/home-images?page=quote', null, { 'Cookie': cookieHeader });
    assert(authGetQuote.status === 200 && authGetQuote.body.data.length === 10, `GET ?page=quote returns 10 slots (received ${authGetQuote.body.data.length})`);

    const authGetNews = await makeRequest('GET', '/api/admin/home-images?page=news', null, { 'Cookie': cookieHeader });
    assert(authGetNews.status === 200 && authGetNews.body.data.length === 1, `GET ?page=news returns 1 slot (received ${authGetNews.body.data.length})`);

    const authGetRecruitment = await makeRequest('GET', '/api/admin/home-images?page=recruitment', null, { 'Cookie': cookieHeader });
    assert(authGetRecruitment.status === 200 && authGetRecruitment.body.data.length === 1, `GET ?page=recruitment returns 1 slot (received ${authGetRecruitment.body.data.length})`);

    const authGetBooking = await makeRequest('GET', '/api/admin/home-images?page=booking', null, { 'Cookie': cookieHeader });
    assert(authGetBooking.status === 200 && authGetBooking.body.data.length === 4, `GET ?page=booking returns 4 slots (received ${authGetBooking.body.data.length})`);

    // 10. Logout flow
    console.log('\n--- TEST 10: Logout flow ---');
    const logoutRes = await makeRequest('POST', '/api/auth/logout', null, { 'Cookie': cookieHeader });
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200');

    // After logout, accessing /admin/images redirects to /admin/login
    const postLogoutAccess = await makeRequest('GET', '/admin/images', null);
    assert(postLogoutAccess.status === 302 && postLogoutAccess.headers['location'] === '/admin/login', 'After logout, /admin/images redirects to /admin/login');

    console.log('\n====================================================');
    console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runAdminRoutesTest();
