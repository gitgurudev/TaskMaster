import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import requireAuth from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const POPULATE = [
  { path: 'department', select: 'name' },
  { path: 'role',       select: 'name modules' },
];

// GET /api/users?page=1&limit=5&department=<id>&role=<id>
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 5);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.role)       filter.role       = req.query.role;

    const [users, total] = await Promise.all([
      User.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    // strip password from response
    const safe = users.map(u => {
      const obj = u.toObject();
      delete obj.password;
      return obj;
    });

    res.json({
      users: safe,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users
router.post('/', async (req, res) => {
  try {
    const { name, email, password, department, role } = req.body;

    if (!name?.trim())     return res.status(400).json({ message: 'Name is required' });
    if (!email?.trim())    return res.status(400).json({ message: 'Email is required' });
    if (!password)         return res.status(400).json({ message: 'Password is required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists)  return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      department: department || null,
      role:       role       || null,
    });

    await user.populate(POPULATE);
    const obj = user.toObject();
    delete obj.password;
    res.status(201).json(obj);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: 'Email already registered' });
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, email, password, department, role } = req.body;

    if (!name?.trim())  return res.status(400).json({ message: 'Name is required' });
    if (!email?.trim()) return res.status(400).json({ message: 'Email is required' });

    const update = {
      name:       name.trim(),
      email:      email.toLowerCase().trim(),
      department: department || null,
      role:       role       || null,
    };

    // only update password if a new one is provided
    if (password) {
      if (password.length < 6)
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      update.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      returnDocument: 'after',
      runValidators: true,
    }).populate(POPULATE);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const obj = user.toObject();
    delete obj.password;
    res.json(obj);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: 'Email already registered' });
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
