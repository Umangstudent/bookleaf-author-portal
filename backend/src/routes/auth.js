const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../config/database');
const { authenticate, generateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.', code: 'VALIDATION_ERROR' });
    if (!role || !['author', 'admin'].includes(role)) return res.status(400).json({ error: 'Role must be "author" or "admin".', code: 'VALIDATION_ERROR' });

    const db = getDb();
    const table = role === 'admin' ? 'admins' : 'authors';
    const user = await db(table).where({ email: email.toLowerCase().trim() }).first();

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.', code: 'INVALID_CREDENTIALS' });
    }

    const tokenPayload = {
      id: user.id, email: user.email, name: user.name, role,
      ...(role === 'author' && { authorId: user.author_id })
    };
    const token = generateToken(tokenPayload);
    const { password_hash, ...userSafe } = user;
    res.json({ token, user: { ...userSafe, role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const db = getDb();
    let user;
    if (req.user.role === 'admin') {
      user = await db('admins').select('id', 'name', 'email', 'created_at').where({ id: req.user.id }).first();
    } else {
      user = await db('authors').select('id', 'author_id', 'name', 'email', 'phone', 'city', 'joined_date').where({ id: req.user.id }).first();
    }
    if (!user) return res.status(404).json({ error: 'User not found.', code: 'NOT_FOUND' });
    res.json({ user: { ...user, role: req.user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

module.exports = router;
