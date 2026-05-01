import { Router } from 'express';
import Department from '../models/Department.js';
import requireAuth from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/departments?page=1&limit=5
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 5);
    const skip  = (page - 1) * limit;

    const [departments, total] = await Promise.all([
      Department.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Department.countDocuments(),
    ]);

    res.json({
      departments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/departments
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: 'Department name is required' });

    const dept = await Department.create({ name: name.trim() });
    res.status(201).json(dept);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: 'Department already exists' });
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/departments/:id
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: 'Department name is required' });

    const dept = await Department.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { returnDocument: 'after', runValidators: true },
    );
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json(dept);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: 'Department name already exists' });
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/departments/:id
router.delete('/:id', async (req, res) => {
  try {
    const dept = await Department.findByIdAndDelete(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
