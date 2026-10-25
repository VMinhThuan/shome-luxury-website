const { generateToken, ADMIN_SESSION_COOKIE, sessionCookieOptions, JWT_SECRET } = require('../middleware/auth');

class AuthController {
  async login(req, res) {
    const { username, password } = req.body;
    const isProduction = process.env.NODE_ENV === 'production';
    const adminUser = process.env.ADMIN_USER || (isProduction ? null : 'admin');
    const adminPass = process.env.ADMIN_PASS || (isProduction ? null : 'admin123');

    if (!adminUser || !adminPass || !JWT_SECRET) {
      return res.status(503).json({
        success: false,
        message: 'Tài khoản quản trị chưa được cấu hình trên máy chủ.'
      });
    }

    if (username === adminUser && password === adminPass) {
      const token = generateToken({ username, role: 'admin' });
      res.cookie(ADMIN_SESSION_COOKIE, token, sessionCookieOptions());
      return res.json({
        success: true,
        message: 'Login successful',
        // Kept for existing server-to-server clients; the admin UI uses the HTTP-only cookie.
        token,
        redirectUrl: req.body.redirectUrl || '/admin/images'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }

  async logout(req, res) {
    const options = sessionCookieOptions();
    delete options.maxAge;
    res.clearCookie(ADMIN_SESSION_COOKIE, options);
    return res.json({ success: true });
  }
}

module.exports = new AuthController();
