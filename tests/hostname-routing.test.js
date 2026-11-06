const assert = require('assert');
const jwt = require('jsonwebtoken');
require('../app');
const {
  hostnameRouting,
  getHostnameMode,
  normalizeHostHeader
} = require('../src/middleware/hostnameRouting');

function runMiddleware({ host, forwardedHost, method = 'GET', path, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const req = {
      headers: {
        host,
        ...(forwardedHost ? { 'x-forwarded-host': forwardedHost } : {}),
        ...(cookie ? { cookie } : {})
      },
      method,
      path
    };
    const response = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      sendStatus(code) {
        this.statusCode = code;
        resolve({ status: code, next: false });
      },
      redirect(location) {
        this.statusCode = 302;
        this.headers.location = location;
        resolve({ status: 302, location, next: false });
      }
    };

    hostnameRouting(req, response, () => resolve({ status: 200, next: true, req }));
  });
}

async function run() {
  assert.equal(normalizeHostHeader('QuanLy.ShomeLuxury.com:3030'), 'quanly.shomeluxury.com');
  assert.equal(normalizeHostHeader('[::1]:3030'), '::1');
  assert.equal(getHostnameMode({ headers: { host: 'design.shomeluxury.com' } }), 'public');
  assert.equal(getHostnameMode({ headers: { host: 'quanly.shomeluxury.com' } }), 'admin');
  assert.equal(getHostnameMode({ headers: { host: 'preview-shome.vercel.app' } }), 'shared');
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  assert.equal(getHostnameMode({ headers: { host: 'unexpected.example.com' } }), 'unknown');
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;

  const publicAdminGet = await runMiddleware({
    host: 'design.shomeluxury.com',
    method: 'GET',
    path: '/admin'
  });
  assert.equal(publicAdminGet.status, 404);

  const publicAdminPost = await runMiddleware({
    host: 'design.shomeluxury.com',
    method: 'POST',
    path: '/api/admin/projects'
  });
  assert.equal(publicAdminPost.status, 404);

  const publicAuthPost = await runMiddleware({
    host: 'design.shomeluxury.com',
    method: 'POST',
    path: '/api/auth/login'
  });
  assert.equal(publicAuthPost.status, 404);

  const publicUploadPost = await runMiddleware({
    host: 'design.shomeluxury.com',
    method: 'POST',
    path: '/api/upload'
  });
  assert.equal(publicUploadPost.status, 404);

  const publicHomepage = await runMiddleware({
    host: 'design.shomeluxury.com',
    method: 'GET',
    path: '/'
  });
  assert.equal(publicHomepage.next, true);

  const adminUnauthenticatedRoot = await runMiddleware({
    host: 'quanly.shomeluxury.com',
    method: 'GET',
    path: '/'
  });
  assert.deepEqual(adminUnauthenticatedRoot, { status: 302, location: '/admin/login', next: false });

  const adminPostRoot = await runMiddleware({
    host: 'quanly.shomeluxury.com',
    method: 'POST',
    path: '/'
  });
  assert.equal(adminPostRoot.status, 404);

  const adminPublicPage = await runMiddleware({
    host: 'quanly.shomeluxury.com',
    method: 'GET',
    path: '/tin-tuc'
  });
  assert.equal(adminPublicPage.status, 404);

  const adminLoginPage = await runMiddleware({
    host: 'quanly.shomeluxury.com',
    method: 'GET',
    path: '/admin/login'
  });
  assert.equal(adminLoginPage.next, true);

  const adminApiGet = await runMiddleware({
    host: 'quanly.shomeluxury.com',
    method: 'GET',
    path: '/api/admin/projects'
  });
  assert.equal(adminApiGet.next, true);

  const adminUploadPost = await runMiddleware({
    host: 'quanly.shomeluxury.com',
    method: 'POST',
    path: '/api/upload'
  });
  assert.equal(adminUploadPost.next, true);

  const adminAsset = await runMiddleware({
    host: 'quanly.shomeluxury.com',
    method: 'GET',
    path: '/css/admin-shell.css'
  });
  assert.equal(adminAsset.next, true);

  const adminSvgFavicon = await runMiddleware({
    host: 'quanly.shomeluxury.com',
    method: 'GET',
    path: '/favicon.svg'
  });
  assert.equal(adminSvgFavicon.next, true);

  const adminPngFavicon = await runMiddleware({
    host: 'quanly.shomeluxury.com',
    method: 'GET',
    path: '/favicon.png'
  });
  assert.equal(adminPngFavicon.next, true);

  const sharedPreviewAdmin = await runMiddleware({
    host: 'preview-shome.vercel.app',
    method: 'GET',
    path: '/admin'
  });
  assert.equal(sharedPreviewAdmin.next, true);

  const xForwardedHostCannotUpgradeAccess = await runMiddleware({
    host: 'design.shomeluxury.com',
    forwardedHost: 'quanly.shomeluxury.com',
    method: 'GET',
    path: '/admin'
  });
  assert.equal(xForwardedHostCannotUpgradeAccess.status, 404);

  const xForwardedHostCannotDowngradeAdmin = await runMiddleware({
    host: 'quanly.shomeluxury.com',
    forwardedHost: 'design.shomeluxury.com',
    method: 'GET',
    path: '/'
  });
  assert.equal(xForwardedHostCannotDowngradeAdmin.location, '/admin/login');

  const jwtSecret = process.env.JWT_SECRET;
  const adminToken = jwt.sign({ role: 'admin', username: 'test-admin' }, jwtSecret, { expiresIn: '5m' });
  const adminAuthenticatedRoot = await runMiddleware({
    host: 'quanly.shomeluxury.com',
    method: 'GET',
    path: '/',
    cookie: `shome_admin_session=${adminToken}`
  });
  assert.equal(adminAuthenticatedRoot.location, '/admin/images');

  console.log('hostname-routing.test.js: all assertions passed');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
