/**
 * DEPRECATED: Admin host & subdomain separation has been removed.
 * CMS Admin and Public website share the same domain under /admin/* routes.
 * Kept as pass-through for backwards compatibility.
 */

function isAdminHost() {
  return true;
}

function requireAdminHost(req, res, next) {
  return next();
}

function redirectAdminRoot(req, res, next) {
  return next();
}

module.exports = { isAdminHost, requireAdminHost, redirectAdminRoot };

