const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const login = async (req, res) => {
  const { username, password, rememberMe } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Determine token expiration (e.g., 7 days if rememberMe, otherwise 30 minutes)
    const expiresIn = rememberMe ? '7d' : '30m';

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'super_secret_jwt_key_for_vps_erp', // Fallback secret
      { expiresIn }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { login };
