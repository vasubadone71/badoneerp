const jwt = require('jsonwebtoken');

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'Malformed token' });

  jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_for_vps_erp', (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

module.exports = { verifyToken };
