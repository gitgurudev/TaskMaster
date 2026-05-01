import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes       from './routes/auth.js';
import departmentRoutes from './routes/departments.js';
import moduleRoutes     from './routes/modules.js';
import roleRoutes       from './routes/roles.js';
import userRoutes       from './routes/users.js';
import taskRoutes       from './routes/tasks.js';
import dashboardRoutes  from './routes/dashboard.js';
import Module from './models/Module.js';
import Role   from './models/Role.js';

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/auth',        authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/modules',     moduleRoutes);
app.use('/api/roles',       roleRoutes);
app.use('/api/users',       userRoutes);
app.use('/api/tasks',       taskRoutes);
app.use('/api/dashboard',   dashboardRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }));

// ── Seed modules & default Admin role ────────────────────────────────────────
const MODULE_DEFS = [
  { key: 'dashboard',          label: 'Dashboard',          order: 1 },
  { key: 'department_master',  label: 'Department Master',  order: 2 },
  { key: 'role_master',        label: 'Role Master',        order: 3 },
  { key: 'user_management',    label: 'User Management',    order: 4 },
  { key: 'tasks',              label: 'Tasks',              order: 5 },
];

const ADMIN_PERMS = (defs) => defs.map(m => ({
  key:    m.key,
  view:   'all',
  create: m.key !== 'dashboard',
  edit:   m.key !== 'dashboard' ? 'all' : 'none',
  delete: m.key !== 'dashboard' ? 'all' : 'none',
}));

async function seed() {
  // Upsert every module definition
  await Promise.all(
    MODULE_DEFS.map(m =>
      Module.findOneAndUpdate({ key: m.key }, m, { upsert: true, returnDocument: 'after' })
    )
  );

  const adminPerms = ADMIN_PERMS(MODULE_DEFS);
  const admin      = await Role.findOne({ name: 'Admin' });

  if (!admin) {
    await Role.create({ name: 'Admin', permissions: adminPerms, isSystem: true });
    console.log('Seeded: Admin role');
  } else {
    // Sync: ensure every current module exists in admin permissions at full access
    const existingKeys = (admin.permissions || []).map(p => p.key);
    const missing      = adminPerms.filter(p => !existingKeys.includes(p.key));
    if (missing.length || !admin.permissions?.length) {
      const existingMap  = Object.fromEntries((admin.permissions || []).map(p => [p.key, p.toObject ? p.toObject() : p]));
      const mergedPerms  = adminPerms.map(ap => existingMap[ap.key] || ap);
      await Role.updateOne({ _id: admin._id }, { $set: { permissions: mergedPerms } });
      console.log('Admin permissions synced');
    }
  }
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await seed();
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
