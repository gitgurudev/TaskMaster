import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';

const PAGE_SIZE = 5;

// ── Shared field ────────────────────────────────────────────────────────────
function DeptField({ value, onChange, error }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        Department Name <span className="text-red-400">*</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. Engineering"
        maxLength={100}
        className={`w-full rounded-lg border px-4 py-2.5 text-sm text-white bg-slate-700/60 placeholder-slate-500 outline-none transition-colors
          ${error ? 'border-red-500/70 focus:border-red-500' : 'border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'}`}
      />
      {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
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
      const { data } = await api.get(`/api/departments?page=${page}&limit=${PAGE_SIZE}`);
      setRows(data.departments);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this department?')) return;
    setDeleting(id);
    try {
      await api.delete(`/api/departments/${id}`);
      // stay on current page, fall back if last item on page
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
          <h1 className="text-lg font-bold text-white">Department Master</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {pagination.total} department{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Department
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </div>
      )}

      {/* Table card */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-12">#</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Department Name</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest hidden sm:table-cell">Created</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/30">
                  <td className="px-5 py-3.5"><div className="h-3.5 w-5 rounded bg-slate-700 animate-pulse" /></td>
                  <td className="px-5 py-3.5"><div className="h-3.5 w-36 rounded bg-slate-700 animate-pulse" /></td>
                  <td className="px-5 py-3.5 hidden sm:table-cell"><div className="h-3.5 w-24 rounded bg-slate-700 animate-pulse" /></td>
                  <td className="px-5 py-3.5"><div className="h-3.5 w-16 rounded bg-slate-700 animate-pulse ml-auto" /></td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-slate-500 text-sm">
                  No departments yet. Click <span className="text-indigo-400 font-medium">Add Department</span> to create one.
                </td>
              </tr>
            ) : (
              rows.map((dept, idx) => (
                <tr key={dept._id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3.5 text-slate-500 tabular-nums">
                    {(pagination.page - 1) * PAGE_SIZE + idx + 1}
                  </td>
                  <td className="px-5 py-3.5 text-white font-medium">{dept.name}</td>
                  <td className="px-5 py-3.5 text-slate-400 hidden sm:table-cell">
                    {new Date(dept.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(dept)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 transition-colors"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(dept._id)}
                        disabled={deleting === dept._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {deleting === dept._id ? (
                          <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                        )}
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
            <p className="text-xs text-slate-400">
              Page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => load(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-slate-600 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => load(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                    p === pagination.page
                      ? 'bg-indigo-500 text-white'
                      : 'text-slate-400 border border-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => load(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-slate-600 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Create view ──────────────────────────────────────────────────────────────
function CreateView({ onBack, onCreated }) {
  const [name,    setName]    = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/departments', { name });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack}
          className="text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Add Department</h1>
          <p className="text-xs text-slate-400 mt-0.5">Create a new department</p>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-6 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DeptField value={name} onChange={setName} error={error} />

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                  Saving…
                </>
              ) : 'Save Department'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-400 border border-slate-600 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit view ────────────────────────────────────────────────────────────────
function EditView({ dept, onBack, onUpdated }) {
  const [name,    setName]    = useState(dept.name);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.put(`/api/departments/${dept._id}`, { name });
      onUpdated();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack}
          className="text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Edit Department</h1>
          <p className="text-xs text-slate-400 mt-0.5">Update department details</p>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-6 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DeptField value={name} onChange={setName} error={error} />

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading || !name.trim() || name.trim() === dept.name}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                  Updating…
                </>
              ) : 'Update Department'}
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-400 border border-slate-600 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function DepartmentMaster() {
  const [view,        setView]        = useState('list');   // 'list' | 'create' | 'edit'
  const [editTarget,  setEditTarget]  = useState(null);
  const [listKey,     setListKey]     = useState(0);        // bump to force list reload

  const goList    = () => { setView('list'); setListKey(k => k + 1); };
  const goCreate  = () => setView('create');
  const goEdit    = (dept) => { setEditTarget(dept); setView('edit'); };

  return (
    <Layout>
      <div className="fade-up">
        {view === 'list'   && <ListView    key={listKey} onAdd={goCreate} onEdit={goEdit} />}
        {view === 'create' && <CreateView  onBack={goList} onCreated={goList} />}
        {view === 'edit'   && <EditView    dept={editTarget} onBack={goList} onUpdated={goList} />}
      </div>
    </Layout>
  );
}
