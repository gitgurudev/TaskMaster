import { Router } from 'express';
import Role   from '../models/Role.js';
import Module from '../models/Module.js';
import requireAuth from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const SCOPE = ['all', 'own', 'none'];

function sanitizePerms(rawPerms, validKeys) {
  return rawPerms
    .filter(p => validKeys.includes(p.key))
    .map(p => ({
      key:    p.key,
      view:   SCOPE.includes(p.view)   ? p.view   : 'none',
      create: !!p.create,
      edit:   SCOPE.includes(p.edit)   ? p.edit   : 'none',
      delete: SCOPE.includes(p.delete) ? p.delete : 'none',
    }));
}

// GET /api/roles?page=1&limit=5
router.get('/', async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 5);
    const skip  = (page - 1) * limit;

    const [roles, total] = await Promise.all([
      Role.find().sort({ isSystem: -1, createdAt: -1 }).skip(skip).limit(limit),
      Role.countDocuments(),
    ]);

    res.json({
      roles,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/roles
router.post('/', async (req, res) => {
  try {
    const { name, permissions = [] } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: 'Role name is required' });

    const validKeys = (await Module.find()).map(m => m.key);
    const cleanPerms = sanitizePerms(permissions, validKeys);

    const role = await Role.create({ name: name.trim(), permissions: cleanPerms });
    res.status(201).json(role);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: 'Role name already exists' });
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/roles/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, permissions = [] } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: 'Role name is required' });

    const existing = await Role.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Role not found' });

    const validKeys  = (await Module.find()).map(m => m.key);
    const cleanPerms = sanitizePerms(permissions, validKeys);

    const update = existing.isSystem
      ? { permissions: cleanPerms }
      : { name: name.trim(), permissions: cleanPerms };

    const role = await Role.findByIdAndUpdate(req.params.id, update, { returnDocument: 'after', runValidators: true });
    res.json(role);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: 'Role name already exists' });
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/roles/:id
router.delete('/:id', async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role)          return res.status(404).json({ message: 'Role not found' });
    if (role.isSystem)  return res.status(403).json({ message: 'System roles cannot be deleted' });
    await role.deleteOne();
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
