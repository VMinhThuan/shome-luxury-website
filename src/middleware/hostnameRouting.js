const { getRequestToken, verifyAdminToken } = require('./auth');

const PUBLIC_HOST = 'design.shomeluxury.com';
const ADMIN_HOST = 'quanly.shomeluxury.com';

// These are intentionally exact production hostnames. Do not use req.hostname
// here: Express may derive it from X-Forwarded-Host when trust proxy is enabled.
function normalizeHostHeader(hostHeader) {
  let value = String(hostHeader || '').trim().toLowerCase();

  // Host may contain a port in local development or in integration tests.
  if (value.startsWith('[')) {
    const closingBracket = value.indexOf(']');
    if (closingBracket > 0) value = value.slice(1, closingBracket);
  } else if (value.split(':').length === 2) {
    value = value.replace(/:\d+$/, '');
  }

  return value.replace(/\.$/, '');
}

function getRoutingHost(req) {
  // req.headers.host is the request's Host header. In particular, this does
  // not consult X-Forwarded-Host supplied by an untrusted client.
  return normalizeHostHeader(req.headers.host);
}

function isLocalOrPreviewHost(host) {
  return host === 'localhost'
    || host === '127.0.0.1'
    || host === '::1'
    || host.endsWith('.vercel.app');
}

function getHostnameMode(req) {
  const host = getRoutingHost(req);
  if (host === PUBLIC_HOST) return 'public';
  if (host === ADMIN_HOST) return 'admin';
  if (isLocalOrPreviewHost(host) || process.env.VERCEL_ENV === 'preview') return 'shared';

  // A non-production process keeps the existing single-host behavior for
  // developer machines and custom local test hosts. Unknown production hosts
  // fail closed so they cannot accidentally expose the CMS.
  return process.env.NODE_ENV === 'production' ? 'unknown' : 'shared';
}

function isPathUnder(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isAdminRoute(pathname) {
  return isPathUnder(pathname, '/admin')
    || isPathUnder(pathname, '/api/admin')
    || pathname === '/api/auth/login'
    || pathname === '/api/auth/logout'
    || pathname === '/api/upload'
    || pathname === '/api/recruitment/upload';
}

function isCmsPublicApi(pathname) {
  // These read-only endpoints are used by existing CMS screens while they
  // edit content. They remain API endpoints, not public HTML pages.
  return isPathUnder(pathname, '/api/categories')
    || isPathUnder(pathname, '/api/projects')
    || pathname === '/api/quote-page';
}

function isStaticAsset(pathname) {
  return pathname === '/favicon.ico'
    || pathname.startsWith('/css/')
    || pathname.startsWith('/js/')
    || pathname.startsWith('/images/')
    || pathname.startsWith('/vendor/');
}

function isAllowedOnAdminHost(req) {
  const pathname = req.path || '/';

  if (pathname === '/' && req.method === 'GET') return true;
  if (isPathUnder(pathname, '/admin')) return true;
  if (isAdminRoute(pathname)) return true;
  if (isCmsPublicApi(pathname)) return true;
  if (isStaticAsset(pathname)) return true;

  return false;
}

function hasValidAdminSession(req) {
  const token = getRequestToken(req);
  if (!token) return false;

  try {
    verifyAdminToken(token);
    return true;
  } catch (error) {
    return false;
  }
}

function hostnameRouting(req, res, next) {
  const mode = getHostnameMode(req);
  const pathname = req.path || '/';

  req.hostnameMode = mode;
  req.routingHost = getRoutingHost(req);

  if (mode === 'public' && isAdminRoute(pathname)) {
    return res.sendStatus(404);
  }

  if (mode === 'admin') {
    if (pathname === '/' && req.method === 'GET') {
      return res.redirect(hasValidAdminSession(req) ? '/admin/images' : '/admin/login');
    }

    if (!isAllowedOnAdminHost(req)) return res.sendStatus(404);
  }

  if (mode === 'unknown') return res.sendStatus(404);
  return next();
}

module.exports = {
  ADMIN_HOST,
  PUBLIC_HOST,
  getHostnameMode,
  getRoutingHost,
  hostnameRouting,
  isAdminRoute,
  isAllowedOnAdminHost,
  normalizeHostHeader
};
