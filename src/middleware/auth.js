const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'shome_luxury_jwt_secret_key_2026');
const ADMIN_SESSION_COOKIE = 'shome_admin_session';

function readCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const prefix = `${name}=`;
  return cookies.split(';').map(value => value.trim()).find(value => value.startsWith(prefix))?.slice(prefix.length);
}

function getRequestToken(req) {
  const authHeader = req.headers.authorization || req.headers['x-admin-token'];
  if (authHeader) return authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  return readCookie(req, ADMIN_SESSION_COOKIE);
}

function verifyAdminToken(token) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.role !== 'admin') throw new Error('Admin role is required');
  return decoded;
}

function sessionCookieOptions() {
  const options = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/'
  };
  if (process.env.ADMIN_COOKIE_DOMAIN) options.domain = process.env.ADMIN_COOKIE_DOMAIN;
  return options;
}

/**
 * Authentication middleware for protected admin endpoints
 */
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization || req.headers['x-admin-token'];

  // API key is optional for server-to-server integrations. There is no hard-coded bypass.
  if (process.env.ADMIN_API_KEY && authHeader && (authHeader === process.env.ADMIN_API_KEY || authHeader === `Bearer ${process.env.ADMIN_API_KEY}`)) {
    req.user = { role: 'admin', username: 'admin' };
    return next();
  }

  const token = getRequestToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập quản trị không tồn tại hoặc đã hết hạn.'
    });
  }

  try {
    req.user = verifyAdminToken(token);
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập quản trị không hợp lệ hoặc đã hết hạn.'
    });
  }
}

function requireAdminPage(req, res, next) {
  const token = getRequestToken(req);
  try {
    req.user = verifyAdminToken(token);
    return next();
  } catch (error) {
    return res.redirect('/admin/login');
  }
}

function generateToken(payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = {
  authenticateAdmin,
  requireAdminPage,
  generateToken,
  getRequestToken,
  verifyAdminToken,
  JWT_SECRET,
  ADMIN_SESSION_COOKIE,
  sessionCookieOptions
};
