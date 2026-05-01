import { Router } from 'express';
import Module from '../models/Module.js';
import requireAuth from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/modules  — all modules sorted by order
router.get('/', async (_req, res) => {
  try {
    const modules = await Module.find().sort({ order: 1 });
    res.json(modules);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
