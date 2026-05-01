import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = Router();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });

    const exists = await User.findOne({ email });
    if (exists)
      return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ name, email, password: hashed });
    const token  = signToken(user._id);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: 'Invalid email or password' });

    await user.populate({ path: 'role', select: 'name permissions modules' });

    const token = signToken(user._id);

    // Build permissions map from new schema
    const permsMap = {};
    const permsArr = user.role?.permissions;

    if (permsArr && permsArr.length > 0) {
      permsArr.forEach(p => {
        permsMap[p.key] = { view: p.view, create: p.create, edit: p.edit, delete: p.delete };
      });
    } else if (user.role?.modules?.length > 0) {
      // backward-compat: migrate old modules[] format
      user.role.modules.forEach(key => {
        permsMap[key] = { view: 'all', create: true, edit: 'all', delete: 'all' };
      });
    }

    // modules = keys where view is not 'none' (used for nav visibility)
    const modules = Object.keys(permsMap).filter(k => permsMap[k].view !== 'none');

    res.json({
      token,
      user: {
        id:          user._id,
        name:        user.name,
        email:       user.email,
        role:        user.role?.name || null,
        modules,
        permissions: permsMap,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

export default router;
