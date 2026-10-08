function cleanHost(value = '') {
  return value.split(':')[0].toLowerCase();
}

function configuredAdminHost() {
  if (process.env.ADMIN_HOST) return cleanHost(process.env.ADMIN_HOST);
  if (process.env.APP_BASE_DOMAIN) return `admin.${cleanHost(process.env.APP_BASE_DOMAIN)}`;
  return null;
}

function isAdminHost(req) {
  const host = cleanHost(req.headers.host || '');
  const configured = configuredAdminHost();
  if (configured) return host === configured;
  // Local preview works at admin.localhost:3030; localhost remains available for dev/tests.
  return process.env.NODE_ENV !== 'production' && (host === 'admin.localhost' || host === 'localhost' || host === '127.0.0.1');
}

function requireAdminHost(req, res, next) {
  if (isAdminHost(req)) return next();
  return res.status(404).render('404', { title: 'Không tìm thấy trang | SHOME LUXURY' });
}

function redirectAdminRoot(req, res, next) {
  if (isAdminHost(req) && req.path === '/') return res.redirect('/admin/bao-gia');
  return next();
}

module.exports = { isAdminHost, requireAdminHost, redirectAdminRoot };
