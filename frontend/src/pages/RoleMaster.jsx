import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';

const PAGE_SIZE = 5;
const SCOPES    = ['none', 'own', 'all'];

// ── Segmented scope selector ─────────────────────────────────────────────────
function ScopeBtn({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {SCOPES.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-colors border ${
            value === opt
              ? opt === 'none'
                ? 'bg-slate-700 border-slate-500 text-slate-300'
                : opt === 'own'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
              : 'border-slate-700 text-slate-600 hover:text-slate-400 hover:border-slate-600'
          }`}
        >
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ── Permission matrix (replaces old checkbox grid) ───────────────────────────
function PermissionMatrix({ allModules, permissions, onChange, loading }) {
  const setField = (key, field, val) =>
    onChange(permissions.map(p => p.key === key ? { ...p, [field]: val } : p));

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-700/40 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[580px]">
        <thead>
          <tr className="border-b border-slate-700/60">
            <th className="text-left pb-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest w-40">Module</th>
            <th className="text-left pb-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">View</th>
            <th className="text-center pb-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest w-16">Create</th>
            <th className="text-left pb-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Edit</th>
            <th className="text-left pb-2.5 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Delete</th>
          </tr>
        </thead>
        <tbody>
          {allModules.map(mod => {
            const p = permissions.find(x => x.key === mod.key)
              || { key: mod.key, view: 'none', create: false, edit: 'none', delete: 'none' };
            const isDash = mod.key === 'dashboard';
            return (
              <tr key={mod.key} className="border-b border-slate-700/30">
                <td className="py-3 pr-4">
                  <span className="text-sm font-medium text-slate-300">{mod.label}</span>
                </td>
                <td className="py-3 pr-6">
                  <ScopeBtn value={p.view} onChange={val => setField(mod.key, 'view', val)} />
                </td>
                <td className="py-3 text-center pr-6">
                  {isDash ? (
                    <span className="text-slate-700">—</span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={p.create}
                      onChange={e => setField(mod.key, 'create', e.target.checked)}
                      className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                    />
                  )}
                </td>
                <td className="py-3 pr-6">
                  {isDash
                    ? <span className="text-slate-700">—</span>
                    : <ScopeBtn value={p.edit} onChange={val => setField(mod.key, 'edit', val)} />
                  }
                </td>
                <td className="py-3">
                  {isDash
                    ? <span className="text-slate-700">—</span>
                    : <ScopeBtn value={p.delete} onChange={val => setField(mod.key, 'delete', val)} />
                  }
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── List view ─────────────────────────────────────────────────────────────────
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
      const { data } = await api.get(`/api/roles?page=${page}&limit=${PAGE_SIZE}`);
      setRows(data.roles);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const handleDelete = async (role) => {
    if (role.isSystem) return;
    if (!window.confirm(`Delete role "${role.name}"?`)) return;
    setDeleting(role._id);
    try {
      await api.delete(`/api/roles/${role._id}`);
      const newTotal = pagination.total - 1;
      const maxPage  = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      load(Math.min(pagination.page, maxPage));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const scopeColor = (v) =>
    v === 'all' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25'
    : v === 'own' ? 'text-amber-400 bg-amber-400/10 border-amber-400/25'
    : 'text-slate-600 bg-slate-700/30 border-slate-700';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Role Master</h1>
          <p className="text-xs text-slate-400 mt-0.5">{pagination.total} role{pagination.total !== 1 ? 's' : ''} total</p>
        </div>
        <button type="button" onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Role
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
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Role Name</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest hidden md:table-cell">Permissions</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/30">
                  <td className="px-5 py-4"><div className="h-3.5 w-5 rounded bg-slate-700 animate-pulse" /></td>
                  <td className="px-5 py-4"><div className="h-3.5 w-32 rounded bg-slate-700 animate-pulse" /></td>
                  <td className="px-5 py-4 hidden md:table-cell"><div className="h-3.5 w-48 rounded bg-slate-700 animate-pulse" /></td>
                  <td className="px-5 py-4"><div className="h-3.5 w-16 rounded bg-slate-700 animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-slate-500 text-sm">
                  No roles yet. Click <span className="text-indigo-400 font-medium">Add Role</span> to create one.
                </td>
              </tr>
            ) : (
              rows.map((role, idx) => {
                const accessible = (role.permissions || []).filter(p => p.view !== 'none');
                return (
                  <tr key={role._id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-4 text-slate-500 tabular-nums">
                      {(pagination.page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{role.name}</span>
                        {role.isSystem && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase tracking-wide">
                            System
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      {accessible.length === 0 ? (
                        <span className="text-slate-500 text-xs italic">No access</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {accessible.map(p => (
                            <span key={p.key}
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${scopeColor(p.view)}`}>
                              {p.key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} · {p.view}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => onEdit(role)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 transition-colors">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(role)}
                          disabled={role.isSystem || deleting === role._id}
                          title={role.isSystem ? 'System roles cannot be deleted' : ''}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                          {deleting === role._id
                            ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>}
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

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

// ── Role form (Create + Edit) ─────────────────────────────────────────────────
function RoleForm({ initial, isSystem, onSubmit, onBack, submitLabel, loading: saving }) {
  const [name,        setName]        = useState(initial?.name ?? '');
  const [permissions, setPermissions] = useState([]);
  const [allModules,  setAllModules]  = useState([]);
  const [modLoading,  setModLoading]  = useState(true);
  const [error,       setError]       = useState('');

  useEffect(() => {
    api.get('/api/modules')
      .then(({ data }) => {
        setAllModules(data);
        const existingMap = Object.fromEntries(
          (initial?.permissions || []).map(p => [p.key, p])
        );
        setPermissions(
          data.map(m => existingMap[m.key]
            ? { key: m.key, view: existingMap[m.key].view, create: existingMap[m.key].create, edit: existingMap[m.key].edit, delete: existingMap[m.key].delete }
            : { key: m.key, view: 'none', create: false, edit: 'none', delete: 'none' }
          )
        );
      })
      .catch(() => setError('Failed to load modules'))
      .finally(() => setModLoading(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isSystem && !name.trim()) { setError('Role name is required'); return; }
    setError('');
    onSubmit({ name: isSystem ? initial.name : name, permissions });
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">{initial ? 'Edit Role' : 'Add Role'}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{initial ? 'Update role permissions' : 'Create a new role with granular permissions'}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Role Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Role Name {!isSystem && <span className="text-red-400">*</span>}
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. HR Manager"
              maxLength={100}
              disabled={isSystem}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm text-white bg-slate-700/60 placeholder-slate-500 outline-none transition-colors
                ${isSystem ? 'opacity-50 cursor-not-allowed border-slate-600' : 'border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'}`}
            />
            {isSystem && <p className="text-xs text-slate-500 mt-1">System role name cannot be changed.</p>}
          </div>

          {/* Permission matrix */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Module Permissions
              </label>
              <div className="flex gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />None</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Own</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />All</span>
              </div>
            </div>
            <PermissionMatrix
              allModules={allModules}
              permissions={permissions}
              onChange={setPermissions}
              loading={modLoading}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
              {saving ? (
                <><svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>Saving…</>
              ) : submitLabel}
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RoleMaster() {
  const [view,       setView]       = useState('list');
  const [editTarget, setEditTarget] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [listKey,    setListKey]    = useState(0);

  const goList   = () => { setView('list'); setListKey(k => k + 1); };
  const goCreate = () => { setEditTarget(null); setView('create'); };
  const goEdit   = (role) => { setEditTarget(role); setView('edit'); };

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await api.post('/api/roles', payload);
      goList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (payload) => {
    setSaving(true);
    try {
      await api.put(`/api/roles/${editTarget._id}`, payload);
      goList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="fade-up">
        {view === 'list'   && <ListView key={listKey} onAdd={goCreate} onEdit={goEdit} />}
        {view === 'create' && <RoleForm onBack={goList} onSubmit={handleCreate} submitLabel="Save Role" loading={saving} />}
        {view === 'edit'   && <RoleForm initial={editTarget} isSystem={editTarget?.isSystem} onBack={goList} onSubmit={handleUpdate} submitLabel="Update Role" loading={saving} />}
      </div>
    </Layout>
  );
}
