const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bookleaf-super-secret-jwt-key-2024';

/**
 * Middleware: Verify JWT token in Authorization header
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Please provide a Bearer token.',
      code: 'UNAUTHORIZED'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token.', code: 'INVALID_TOKEN' });
  }
}

/**
 * Middleware: Require admin role
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required.',
      code: 'FORBIDDEN'
    });
  }
  next();
}

/**
 * Middleware: Require author role
 */
function requireAuthor(req, res, next) {
  if (!req.user || req.user.role !== 'author') {
    return res.status(403).json({
      error: 'Author access required.',
      code: 'FORBIDDEN'
    });
  }
  next();
}

/**
 * Generate a signed JWT token
 */
function generateToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

module.exports = { authenticate, requireAdmin, requireAuthor, generateToken, JWT_SECRET };
