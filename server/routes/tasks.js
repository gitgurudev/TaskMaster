import { Router } from 'express';
import mongoose   from 'mongoose';
import Task       from '../models/Task.js';
import requireAuth from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

const perm = requirePermission('tasks');

const POPULATE = [
  { path: 'assignedTo', select: 'name email' },
  { path: 'department', select: 'name' },
  { path: 'createdBy',  select: 'name' },
];

// GET /api/tasks?page=1&limit=5&status=&priority=
router.get('/', perm, async (req, res) => {
  try {
    if (req.perm.view === 'none')
      return res.status(403).json({ message: 'Access denied' });

    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 5);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.perm.view === 'own') {
      const uid = new mongoose.Types.ObjectId(req.userId);
      filter.$or = [{ assignedTo: uid }, { createdBy: uid }];
    }
    if (req.query.status)   filter.status   = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;

    const [tasks, total] = await Promise.all([
      Task.find(filter).populate(POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Task.countDocuments(filter),
    ]);

    res.json({
      tasks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/tasks
router.post('/', perm, async (req, res) => {
  try {
    if (!req.perm.create)
      return res.status(403).json({ message: 'No create permission' });

    const { title, description, assignedTo, department, priority, status, dueDate } = req.body;
    if (!title?.trim())
      return res.status(400).json({ message: 'Title is required' });

    const task = await Task.create({
      title:       title.trim(),
      description: description?.trim() || '',
      assignedTo:  assignedTo  || null,
      department:  department  || null,
      priority:    priority    || 'Medium',
      status:      status      || 'Pending',
      dueDate:     dueDate     || null,
      createdBy:   req.user.id,
    });

    await task.populate(POPULATE);
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', perm, async (req, res) => {
  try {
    if (req.perm.edit === 'none')
      return res.status(403).json({ message: 'No edit permission' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.perm.edit === 'own') {
      const isOwn =
        task.assignedTo?.toString() === req.userId ||
        task.createdBy?.toString()  === req.userId;
      if (!isOwn)
        return res.status(403).json({ message: 'You can only edit your own tasks' });
    }

    const { title, description, assignedTo, department, priority, status, dueDate } = req.body;
    if (!title?.trim())
      return res.status(400).json({ message: 'Title is required' });

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      {
        title:       title.trim(),
        description: description?.trim() || '',
        assignedTo:  assignedTo  || null,
        department:  department  || null,
        priority:    priority    || 'Medium',
        status:      status      || 'Pending',
        dueDate:     dueDate     || null,
      },
      { returnDocument: 'after', runValidators: true },
    ).populate(POPULATE);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', perm, async (req, res) => {
  try {
    if (req.perm.delete === 'none')
      return res.status(403).json({ message: 'No delete permission' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.perm.delete === 'own') {
      const isOwn =
        task.assignedTo?.toString() === req.userId ||
        task.createdBy?.toString()  === req.userId;
      if (!isOwn)
        return res.status(403).json({ message: 'You can only delete your own tasks' });
    }

    await task.deleteOne();
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
