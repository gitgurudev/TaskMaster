import { Router }   from 'express';
import mongoose      from 'mongoose';
import Task          from '../models/Task.js';
import TaskMessage   from '../models/TaskMessage.js';
import requireAuth   from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';
import { getIO }     from '../socket.js';

const router = Router();
router.use(requireAuth);

const perm = requirePermission('tasks');

const POPULATE = [
  { path: 'assignedTo', select: 'name email' },
  { path: 'department', select: 'name' },
  { path: 'createdBy',  select: 'name' },
];

// ── GET /api/tasks/unread — unread message counts per task (for badges) ───────
// Must be defined before /:id routes so "unread" isn't matched as an id param
router.get('/unread', async (req, res) => {
  try {
    const uid    = new mongoose.Types.ObjectId(req.user.id);
    const counts = await TaskMessage.aggregate([
      { $match: { readBy: { $ne: uid } } },
      { $group: { _id: '$taskId', count: { $sum: 1 } } },
    ]);
    const result = {};
    counts.forEach(c => { result[c._id.toString()] = c.count; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/tasks — list ─────────────────────────────────────────────────────
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

// ── POST /api/tasks — create ──────────────────────────────────────────────────
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

// ── PUT /api/tasks/:id — update ───────────────────────────────────────────────
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

    if (title !== undefined && !title?.trim())
      return res.status(400).json({ message: 'Title is required' });

    // Build patch with only provided fields — supports status-only updates from non-admin
    const patch = {};
    if (title       !== undefined) patch.title       = title.trim();
    if (description !== undefined) patch.description = description?.trim() || '';
    if (assignedTo  !== undefined) patch.assignedTo  = assignedTo  || null;
    if (department  !== undefined) patch.department  = department  || null;
    if (priority    !== undefined) patch.priority    = priority;
    if (status      !== undefined) patch.status      = status;
    if (dueDate     !== undefined) patch.dueDate     = dueDate     || null;

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: patch },
      { returnDocument: 'after', runValidators: true },
    ).populate(POPULATE);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/tasks/:id — delete ───────────────────────────────────────────
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

// ── GET /api/tasks/:id/messages — fetch chat messages ────────────────────────
router.get('/:id/messages', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const messages = await TaskMessage.find({ taskId: req.params.id })
      .populate('senderId', 'name')
      .sort({ createdAt: 1 })
      .lean();

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/tasks/:id/messages — send a message ────────────────────────────
router.post('/:id/messages', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim())
      return res.status(400).json({ message: 'Message content is required' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const senderId      = req.user.id.toString();
    const isParticipant =
      task.assignedTo?.toString() === senderId ||
      task.createdBy?.toString()  === senderId;

    if (!isParticipant)
      return res.status(403).json({ message: 'Only the assignee and task creator can chat' });

    const msg = await TaskMessage.create({
      taskId:   req.params.id,
      senderId: req.user.id,
      content:  content.trim(),
      readBy:   [req.user.id],
    });

    await msg.populate('senderId', 'name');
    const obj = msg.toObject();

    const io = getIO();
    // Deliver full message to users who have this chat open
    io.to(`task:${req.params.id}`).emit('new_message', obj);

    // Send lightweight notification to all other participants for badge update
    const participants = [
      task.assignedTo?.toString(),
      task.createdBy?.toString(),
    ].filter(Boolean);

    participants.forEach(pid => {
      if (pid !== senderId) {
        io.to(`user:${pid}`).emit('task_notification', { taskId: req.params.id });
      }
    });

    res.status(201).json(obj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/tasks/:id/messages/read — mark all messages as read ─────────────
router.post('/:id/messages/read', async (req, res) => {
  try {
    const uid = new mongoose.Types.ObjectId(req.user.id);
    await TaskMessage.updateMany(
      { taskId: req.params.id, readBy: { $ne: uid } },
      { $addToSet: { readBy: uid } },
    );

    const io = getIO();
    io.to(`task:${req.params.id}`).emit('messages_read', {
      taskId: req.params.id,
      userId: req.user.id.toString(),
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
