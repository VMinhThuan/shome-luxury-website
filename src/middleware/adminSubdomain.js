/**
 * Compatibility helpers for any older caller that still imports this file.
 * The actual host policy is installed globally in app.js through
 * hostnameRouting, so these helpers must not treat every host as admin.
 */
const { getHostnameMode } = require('./hostnameRouting');

function isAdminHost(req) {
  return Boolean(req && getHostnameMode(req) === 'admin');
}

function requireAdminHost(req, res, next) {
  return isAdminHost(req) ? next() : res.sendStatus(404);
}

function redirectAdminRoot(req, res, next) {
  if (isAdminHost(req) && req.path === '/' && req.method === 'GET') {
    return res.redirect('/admin');
  }
  return next();
}

module.exports = { isAdminHost, requireAdminHost, redirectAdminRoot };

