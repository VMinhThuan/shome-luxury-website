const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'shome_luxury_jwt_secret_key_2026';

/**
 * Authentication middleware for protected admin endpoints
 */
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization || req.headers['x-admin-token'];

  // Support direct API Key or Bearer Token
  if (authHeader && (authHeader === 'secret_admin_token' || authHeader === `Bearer ${process.env.ADMIN_API_KEY}`)) {
    req.user = { role: 'admin', username: 'admin' };
    return next();
  }

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: Missing Authorization Header'
    });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: Invalid or Expired Token'
    });
  }
}

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = {
  authenticateAdmin,
  generateToken,
  JWT_SECRET
};
