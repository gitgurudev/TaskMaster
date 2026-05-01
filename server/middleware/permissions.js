import User from '../models/User.js';

export function requirePermission(moduleKey) {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id)
        .populate({ path: 'role', select: 'permissions modules' });

      const permsArr = user?.role?.permissions;
      let perm;

      if (permsArr && permsArr.length > 0) {
        const found = permsArr.find(p => p.key === moduleKey);
        perm = found
          ? { view: found.view, create: found.create, edit: found.edit, delete: found.delete }
          : { view: 'none', create: false, edit: 'none', delete: 'none' };
      } else {
        // backward-compat: old roles still have modules[]
        const hasAccess = user?.role?.modules?.includes(moduleKey);
        perm = hasAccess
          ? { view: 'all', create: true, edit: 'all', delete: 'all' }
          : { view: 'none', create: false, edit: 'none', delete: 'none' };
      }

      req.perm       = perm;
      req.userId     = req.user.id.toString();
      req.userDeptId = user?.department?.toString() || null;
      next();
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
}
