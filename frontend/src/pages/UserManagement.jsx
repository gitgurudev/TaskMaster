import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';

const PAGE_SIZE = 5;

// ── Reusable select ──────────────────────────────────────────────────────────
function SelectField({ label, value, onChange, options, placeholder, required }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          style={{ colorScheme: 'dark' }}
          className="w-full appearance-none rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 pr-9 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
        >
          <option value="" className="text-slate-400 bg-slate-800">{placeholder}</option>
          {options.map(o => (
            <option key={o._id} value={o._id} className="text-white bg-slate-800">{o.name}</option>
          ))}
        </select>
        {/* Custom chevron */}
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
    </div>
  );
}

// ── Text / email / password input ────────────────────────────────────────────
function InputField({ label, type = 'text', value, onChange, placeholder, required, hint }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-slate-600 bg-slate-700/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
      />
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

// ── Avatar initials ──────────────────────────────────────────────────────────
function Avatar({ name }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 flex-shrink-0">
      {initials}
    </div>
  );
}

// ── List view ────────────────────────────────────────────────────────────────
function ListView({ onAdd, onEdit }) {
  const [rows,       setRows]       = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading,    setLoading]    = useState(true);
  const [deleting,   setDeleting]   = useState(null);
  const [error,      setError]      = useState('');

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/api/users?page=${page}&limit=${PAGE_SIZE}`);
      setRows(data.users);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    setDeleting(id);
    try {
      await api.delete(`/api/users/${id}`);
      const newTotal = pagination.total - 1;
      const maxPage  = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      load(Math.min(pagination.page, maxPage));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">User Management</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {pagination.total} user{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add User
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-12">#</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">User</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Department</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest hidden md:table-cell">Role</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest hidden xl:table-cell">Joined</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/30">
                  {[48, 160, 100, 80, 80, 80].map((w, j) => (
                    <td key={j} className={`px-5 py-4 ${j >= 2 ? 'hidden md:table-cell' : ''}`}>
                      <div className={`h-3.5 rounded bg-slate-700 animate-pulse`} style={{ width: w }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500 text-sm">
                  No users yet. Click <span className="text-indigo-400 font-medium">Add User</span> to create one.
                </td>
              </tr>
            ) : (
              rows.map((user, idx) => (
                <tr key={user._id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3.5 text-slate-500 tabular-nums">
                    {(pagination.page - 1) * PAGE_SIZE + idx + 1}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} />
                      <div>
                        <p className="text-white font-medium leading-none">{user.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden lg:table-cell">
                    {user.department
                      ? <span className="text-slate-300">{user.department.name}</span>
                      : <span className="text-slate-600 italic text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    {user.role
                      ? <span className="text-[12px] px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">{user.role.name}</span>
                      : <span className="text-slate-600 italic text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs hidden xl:table-cell">
                    {new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(user)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user._id)}
                        disabled={deleting === user._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {deleting === user._id
                          ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                          : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>}
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-700/60">
            <p className="text-xs text-slate-400">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-1.5">
              <button type="button" onClick={() => load(pagination.page - 1)} disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-slate-600 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                ← Prev
              </button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                <button key={p} type="button" onClick={() => load(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${p === pagination.page ? 'bg-indigo-500 text-white' : 'text-slate-400 border border-slate-600 hover:bg-slate-700'}`}>
                  {p}
                </button>
              ))}
              <button type="button" onClick={() => load(pagination.page + 1)} disabled={pagination.page >= pagination.pages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-slate-600 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Shared form (Create + Edit) ──────────────────────────────────────────────
function UserForm({ initial, onSubmit, onBack, submitLabel, saving }) {
  const isEdit = !!initial;

  const [form, setForm] = useState({
    name:       initial?.name                         ?? '',
    email:      initial?.email                        ?? '',
    password:   '',
    confirm:    '',
    department: initial?.department?._id              ?? '',
    role:       initial?.role?._id                    ?? '',
  });
  const [departments, setDepartments] = useState([]);
  const [roles,       setRoles]       = useState([]);
  const [dropLoading, setDropLoading] = useState(true);
  const [error,       setError]       = useState('');

  const set = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    Promise.all([
      api.get('/api/departments?page=1&limit=100'),
      api.get('/api/roles?page=1&limit=100'),
    ])
      .then(([dRes, rRes]) => {
        setDepartments(dRes.data.departments);
        setRoles(rRes.data.roles);
      })
      .catch(() => setError('Failed to load departments/roles'))
      .finally(() => setDropLoading(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!isEdit) {
      if (!form.password)               { setError('Password is required'); return; }
      if (form.password.length < 6)     { setError('Password must be at least 6 characters'); return; }
      if (form.password !== form.confirm){ setError('Passwords do not match'); return; }
    } else if (form.password) {
      if (form.password.length < 6)     { setError('New password must be at least 6 characters'); return; }
      if (form.password !== form.confirm){ setError('Passwords do not match'); return; }
    }

    onSubmit({
      name:       form.name.trim(),
      email:      form.email.trim(),
      password:   form.password   || undefined,
      department: form.department || undefined,
      role:       form.role       || undefined,
    });
  };

  return (
    <div className="max-w-xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">{isEdit ? 'Edit User' : 'Add User'}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isEdit ? 'Update user details' : 'Create a new user account'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Name + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField label="Full Name" value={form.name} onChange={set('name')} placeholder="Yash Dharme" required />
            <InputField label="Email" type="email" value={form.email} onChange={set('email')} placeholder="user@example.com" required />
          </div>

          {/* Department + Role */}
          {dropLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-[62px] rounded-lg bg-slate-700/40 animate-pulse" />
              <div className="h-[62px] rounded-lg bg-slate-700/40 animate-pulse" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField
                label="Department"
                value={form.department}
                onChange={set('department')}
                options={departments}
                placeholder="Select department"
              />
              <SelectField
                label="Role"
                value={form.role}
                onChange={set('role')}
                options={roles}
                placeholder="Select role"
              />
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-700/60 pt-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
              {isEdit ? 'Change Password' : 'Password'}
              {isEdit && <span className="ml-2 normal-case font-normal text-slate-500">(leave blank to keep current)</span>}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label={isEdit ? 'New Password' : 'Password'}
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Min. 6 characters"
                required={!isEdit}
              />
              <InputField
                label="Confirm Password"
                type="password"
                value={form.confirm}
                onChange={set('confirm')}
                placeholder="••••••••"
                required={!isEdit}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
            >
              {saving
                ? <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>Saving…</>
                : submitLabel}
            </button>
            <button type="button" onClick={onBack}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-400 border border-slate-600 hover:bg-slate-700 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const [view,       setView]       = useState('list');
  const [editTarget, setEditTarget] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [listKey,    setListKey]    = useState(0);

  const goList   = () => { setView('list'); setListKey(k => k + 1); };
  const goCreate = () => { setEditTarget(null); setView('create'); };
  const goEdit   = (user) => { setEditTarget(user); setView('edit'); };

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await api.post('/api/users', payload);
      goList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (payload) => {
    setSaving(true);
    try {
      await api.put(`/api/users/${editTarget._id}`, payload);
      goList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="fade-up">
        {view === 'list'   && <ListView key={listKey} onAdd={goCreate} onEdit={goEdit} />}
        {view === 'create' && <UserForm onBack={goList} onSubmit={handleCreate} submitLabel="Create User" saving={saving} />}
        {view === 'edit'   && <UserForm initial={editTarget} onBack={goList} onSubmit={handleUpdate} submitLabel="Update User" saving={saving} />}
      </div>
    </Layout>
  );
}
