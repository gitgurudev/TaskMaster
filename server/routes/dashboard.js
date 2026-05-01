import { Router }   from 'express';
import mongoose     from 'mongoose';
import Task         from '../models/Task.js';
import User         from '../models/User.js';
import Department   from '../models/Department.js';
import requireAuth  from '../middleware/auth.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('dashboard'), async (req, res) => {
  try {
    const isAll    = req.perm.view === 'all';
    const myId     = new mongoose.Types.ObjectId(req.userId);
    const myDeptId = req.userDeptId ? new mongoose.Types.ObjectId(req.userDeptId) : null;

    const now          = new Date();
    const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay     = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Task base filter for this user's scope
    const taskScope = isAll
      ? {}
      : { $or: [{ assignedTo: myId }, { createdBy: myId }] };

    const deptScope = (isAll || !myDeptId)
      ? {}
      : { department: myDeptId };

    const [
      totalTasks,
      totalUsers,
      totalDepartments,
      tasksByStatus,
      tasksByPriority,
      deptTasksRaw,
      deptUsersRaw,
      userRankingsRaw,
      todayTasks,
      monthTasksRaw,
    ] = await Promise.all([

      Task.countDocuments(taskScope),
      isAll ? User.countDocuments() : User.countDocuments(myDeptId ? { department: myDeptId } : {}),
      isAll ? Department.countDocuments() : (myDeptId ? 1 : 0),

      Task.aggregate([
        { $match: taskScope },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      Task.aggregate([
        { $match: taskScope },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),

      Task.aggregate([
        { $match: { ...taskScope, ...deptScope, department: { $ne: null } } },
        { $group: { _id: { dept: '$department', status: '$status' }, count: { $sum: 1 } } },
        { $lookup: { from: 'departments', localField: '_id.dept', foreignField: '_id', as: 'dept' } },
        { $unwind: '$dept' },
        { $group: {
            _id:      { id: '$_id.dept', name: '$dept.name' },
            statuses: { $push: { k: '$_id.status', v: '$count' } },
            total:    { $sum: '$count' },
        }},
        { $sort: { total: -1 } },
      ]),

      User.aggregate([
        { $match: { department: { $ne: null }, ...(isAll ? {} : myDeptId ? { department: myDeptId } : {}) } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
        { $unwind: '$dept' },
        { $project: { name: '$dept.name', count: 1 } },
        { $sort: { count: -1 } },
      ]),

      Task.aggregate([
        { $match: { ...taskScope, assignedTo: { $ne: null } } },
        { $group: { _id: { user: '$assignedTo', status: '$status' }, count: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id.user', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $group: {
            _id:      { id: '$_id.user', name: '$user.name', email: '$user.email' },
            statuses: { $push: { k: '$_id.status', v: '$count' } },
            total:    { $sum: '$count' },
        }},
        { $sort: { total: -1 } },
      ]),

      Task.find({ ...taskScope, dueDate: { $gte: startOfDay, $lte: endOfDay } })
        .populate([
          { path: 'assignedTo', select: 'name' },
          { path: 'department', select: 'name' },
        ])
        .sort({ createdAt: -1 }),

      Task.aggregate([
        { $match: { ...taskScope, createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const fmt = (arr) => Object.fromEntries(arr.map(({ k, v }) => [k, v]));

    res.json({
      scope: isAll ? 'all' : 'personal',

      summary: { totalTasks, totalUsers, totalDepartments },

      tasksByStatus:   tasksByStatus.map(s  => ({ status:   s._id, count: s.count })),
      tasksByPriority: tasksByPriority.map(p => ({ priority: p._id, count: p.count })),

      departmentTasks: deptTasksRaw.map(d => ({
        id:       d._id.id,
        name:     d._id.name,
        total:    d.total,
        byStatus: fmt(d.statuses),
      })),

      departmentUsers: deptUsersRaw.map(d => ({
        id:    d._id,
        name:  d.name,
        count: d.count,
      })),

      userRankings: userRankingsRaw.map(u => ({
        id:       u._id.id,
        name:     u._id.name,
        email:    u._id.email,
        total:    u.total,
        byStatus: fmt(u.statuses),
      })),

      todayTasks,

      thisMonth: {
        total:    monthTasksRaw.reduce((s, r) => s + r.count, 0),
        byStatus: Object.fromEntries(monthTasksRaw.map(r => [r._id, r.count])),
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
