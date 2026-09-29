const { generateToken } = require('../middleware/auth');

class AuthController {
  async login(req, res) {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'admin123';

    if (username === adminUser && password === adminPass) {
      const token = generateToken({ username, role: 'admin' });
      return res.json({
        success: true,
        message: 'Login successful',
        token
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
}

module.exports = new AuthController();
