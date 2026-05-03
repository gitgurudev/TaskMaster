import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import Layout   from '../components/Layout';
import TaskChat from '../components/TaskChat';
import api      from '../lib/api';

const PAGE_SIZE = 5;

const STATUS_META = {
  'Pending':     { color: 'text-amber-400   bg-amber-400/10   border-amber-400/25'   },
  'In Progress': { color: 'text-blue-400    bg-blue-400/10    border-blue-400/25'    },
  'Completed':   { color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25' },
  'Cancelled':   { color: 'text-slate-400   bg-slate-400/10   border-slate-400/25'   },
};

const PRIORITY_META = {
  'High':   { color: 'text-red-400    bg-red-400/10    border-red-400/25',    dot: 'bg-red-400'    },
  'Medium': { color: 'text-amber-400  bg-amber-400/10  border-amber-400/25',  dot: 'bg-amber-400'  },
  'Low':    { color: 'text-slate-400  bg-slate-400/10  border-slate-400/25',  dot: 'bg-slate-400'  },
};

function Badge({ value, meta }) {
  const m = meta[value];
  if (!m) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${m.color}`}>
      {m.dot && <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />}
      {value}
    </span>
  );
}

function SelectField({ label, value, onChange, options, required }) {
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
          {options.map(o => (
            <option key={o.value} value={o.value} className="bg-slate-800 text-white">
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
    </div>
  );
}

function RefSelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ colorScheme: 'dark' }}
          className="w-full appearance-none rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 pr-9 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer"
        >
          <option value="" className="bg-slate-800 text-slate-400">{placeholder}</option>
          {options.map(o => (
            <option key={o._id} value={o._id} className="bg-slate-800 text-white">{o.label || o.name}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
    </div>
  );
}

// ── Filter bar ───────────────────────────────────────────────────────────────
function FilterBar({ filters, onChange }) {
  const statusOpts = [
    { value: '', label: 'All Status' },
    ...Object.keys(STATUS_META).map(s => ({ value: s, label: s })),
  ];
  const priorityOpts = [
    { value: '', label: 'All Priority' },
    ...Object.keys(PRIORITY_META).map(p => ({ value: p, label: p })),
  ];

  return (
    <div className="flex gap-3 flex-wrap">
      {[
        { key: 'status',   opts: statusOpts   },
        { key: 'priority', opts: priorityOpts },
      ].map(({ key, opts }) => (
        <div key={key} className="relative">
          <select
            value={filters[key]}
            onChange={e => onChange({ ...filters, [key]: e.target.value })}
            style={{ colorScheme: 'dark' }}
            className="appearance-none rounded-lg border border-slate-700 bg-slate-800/60 pl-3 pr-8 py-2 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            {opts.map(o => (
              <option key={o.value} value={o.value} className="bg-slate-800 text-white">{o.label}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── List view ────────────────────────────────────────────────────────────────
function ListView({ onAdd, onEdit, onChat, unreadCounts }) {
  const storedUser = JSON.parse(localStorage.getItem('tm_user') || '{}');
  const taskPerm   = storedUser.permissions?.tasks || { view: 'none', create: false, edit: 'none', delete: 'none' };
  const myId       = storedUser.id;

  const canEdit   = (t) => taskPerm.edit   === 'all' || (taskPerm.edit   === 'own' && (t.assignedTo?._id === myId || t.createdBy?._id === myId));
  const canDelete = (t) => taskPerm.delete === 'all' || (taskPerm.delete === 'own' && (t.assignedTo?._id === myId || t.createdBy?._id === myId));
  // Chat is available to the assignee, the creator, or an admin
  const canChat   = (t) => taskPerm.edit === 'all' || t.assignedTo?._id === myId || t.createdBy?._id === myId;

  const [rows,       setRows]       = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters,    setFilters]    = useState({ status: '', priority: '' });
  const [loading,    setLoading]    = useState(true);
  const [deleting,   setDeleting]   = useState(null);
  const [error,      setError]      = useState('');

  const load = useCallback(async (page = 1, f = filters) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (f.status)   params.set('status',   f.status);
      if (f.priority) params.set('priority', f.priority);

      const { data } = await api.get(`/api/tasks?${params}`);
      setRows(data.tasks);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(1, filters); }, [filters]); // eslint-disable-line

  const handleFilterChange = (newFilters) => setFilters(newFilters);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    setDeleting(id);
    try {
      await api.delete(`/api/tasks/${id}`);
      const newTotal = pagination.total - 1;
      const maxPage  = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      load(Math.min(pagination.page, maxPage), filters);
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  const formatDue = (date) => {
    if (!date) return null;
    const d       = new Date(date);
    const now     = new Date();
    const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    const label   = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    if (diffDays < 0)  return { label, cls: 'text-red-400' };
    if (diffDays <= 2) return { label, cls: 'text-amber-400' };
    return { label, cls: 'text-slate-400' };
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-white">Tasks</h1>
          <p className="text-xs text-slate-400 mt-0.5">{pagination.total} task{pagination.total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <FilterBar filters={filters} onChange={handleFilterChange} />
          {taskPerm.create && (
            <button
              type="button"
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Task
            </button>
          )}
        </div>
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
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest w-10">#</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Task</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest hidden md:table-cell">Assigned To</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest hidden lg:table-cell">Priority</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest hidden sm:table-cell">Status</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-widest hidden xl:table-cell">Due</th>
              <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <tr key={i} className="border-b border-slate-700/30">
                  {[32, 180, 110, 80, 90, 80, 100].map((w, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-3.5 rounded bg-slate-700 animate-pulse" style={{ width: w }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-500 text-sm">
                  No tasks found. Click <span className="text-indigo-400 font-medium">Add Task</span> to create one.
                </td>
              </tr>
            ) : (
              rows.map((task, idx) => {
                const due   = formatDue(task.dueDate);
                const count = unreadCounts[task._id] || 0;
                return (
                  <tr key={task._id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-3.5 text-slate-500 tabular-nums">
                      {(pagination.page - 1) * PAGE_SIZE + idx + 1}
                    </td>
                    <td className="px-5 py-3.5 max-w-[220px]">
                      <p className="text-white font-medium truncate">{task.title}</p>
                      {task.department && (
                        <p className="text-xs text-slate-500 mt-0.5">{task.department.name}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {task.assignedTo
                        ? <div>
                            <p className="text-slate-300 text-sm">{task.assignedTo.name}</p>
                            <p className="text-xs text-slate-500">{task.assignedTo.email}</p>
                          </div>
                        : <span className="text-slate-600 italic text-xs">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <Badge value={task.priority} meta={PRIORITY_META} />
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <Badge value={task.status} meta={STATUS_META} />
                    </td>
                    <td className={`px-5 py-3.5 text-xs hidden xl:table-cell ${due ? due.cls : 'text-slate-600'}`}>
                      {due ? due.label : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        {/* Chat button — visible to assignee, creator, or admin */}
                        {canChat(task) && (
                          <button
                            type="button"
                            onClick={() => onChat(task)}
                            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/25 hover:bg-violet-500/20 transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                            </svg>
                            Chat
                            {count > 0 && (
                              <span className="absolute -top-2 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white leading-none">
                                {count > 9 ? '9+' : count}
                              </span>
                            )}
                          </button>
                        )}
                        {canEdit(task) && (
                          <button type="button" onClick={() => onEdit(task)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 transition-colors">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Edit
                          </button>
                        )}
                        {canDelete(task) && (
                          <button type="button" onClick={() => handleDelete(task._id)} disabled={deleting === task._id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                            {deleting === task._id
                              ? <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>}
                            Delete
                          </button>
                        )}
                        {!canChat(task) && !canEdit(task) && !canDelete(task) && (
                          <span className="text-xs text-slate-600 italic">View only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
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

// ── Task form (Create + Edit) ────────────────────────────────────────────────
function TaskForm({ initial, onBack, onSubmit, submitLabel, saving }) {
  const isEdit    = !!initial;
  const currUser  = JSON.parse(localStorage.getItem('tm_user') || '{}');
  const isAdmin   = currUser.role === 'Admin';
  const statusOnly = isEdit && !isAdmin;

  const [form, setForm] = useState({
    title:       initial?.title                  ?? '',
    description: initial?.description            ?? '',
    assignedTo:  initial?.assignedTo?._id        ?? '',
    department:  initial?.department?._id        ?? '',
    priority:    initial?.priority               ?? 'Medium',
    status:      initial?.status                 ?? 'Pending',
    dueDate:     initial?.dueDate
      ? new Date(initial.dueDate).toISOString().split('T')[0]
      : '',
  });

  const [allUsers,    setAllUsers]    = useState([]);
  const [departments, setDepartments] = useState([]);
  const [dropLoading, setDropLoading] = useState(true);
  const [error,       setError]       = useState('');

  const filteredUsers = form.department
    ? allUsers.filter(u => u.department?._id === form.department)
    : allUsers;

  const set = (key) => (val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleDeptChange = (deptId) => {
    setForm(prev => {
      const userStillValid = deptId
        ? allUsers.some(u => u._id === prev.assignedTo && u.department?._id === deptId)
        : true;
      return { ...prev, department: deptId, assignedTo: userStillValid ? prev.assignedTo : '' };
    });
  };

  useEffect(() => {
    Promise.all([
      api.get('/api/users?page=1&limit=100'),
      api.get('/api/departments?page=1&limit=100'),
    ])
      .then(([uRes, dRes]) => {
        setAllUsers(uRes.data.users);
        setDepartments(dRes.data.departments);
      })
      .catch(() => setError('Failed to load dropdown data'))
      .finally(() => setDropLoading(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!statusOnly && !form.title.trim()) { setError('Title is required'); return; }
    setError('');
    if (statusOnly) {
      onSubmit({ status: form.status });
      return;
    }
    onSubmit({
      title:       form.title.trim(),
      description: form.description.trim(),
      assignedTo:  form.assignedTo  || undefined,
      department:  form.department  || undefined,
      priority:    form.priority,
      status:      form.status,
      dueDate:     form.dueDate     || undefined,
    });
  };

  const statusOptions   = ['Pending','In Progress','Completed','Cancelled'].map(s => ({ value: s, label: s }));
  const priorityOptions = ['Low','Medium','High'].map(p => ({ value: p, label: p }));

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">{isEdit ? 'Edit Task' : 'Add Task'}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{isEdit ? 'Update task details' : 'Create a new task'}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-6">
        {statusOnly && (
          <div className="mb-5 flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/25 px-4 py-3 text-sm text-amber-400">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            You can only update the <strong className="mx-1">Status</strong> of this task.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Title {!statusOnly && <span className="text-red-400">*</span>}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title')(e.target.value)}
              placeholder="e.g. Prepare Q2 report"
              maxLength={200}
              disabled={statusOnly}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors ${
                statusOnly
                  ? 'border-slate-700 bg-slate-800/40 text-slate-500 cursor-not-allowed'
                  : 'border-slate-600 bg-slate-700/60 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description')(e.target.value)}
              placeholder="Add more details about this task..."
              rows={3}
              maxLength={2000}
              disabled={statusOnly}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none resize-none transition-colors ${
                statusOnly
                  ? 'border-slate-700 bg-slate-800/40 text-slate-500 cursor-not-allowed'
                  : 'border-slate-600 bg-slate-700/60 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
              }`}
            />
          </div>

          {dropLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="h-[62px] rounded-lg bg-slate-700/40 animate-pulse" />
              <div className="h-[62px] rounded-lg bg-slate-700/40 animate-pulse" />
            </div>
          ) : (
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${statusOnly ? 'opacity-40 pointer-events-none' : ''}`}>
              <RefSelectField label="Department" value={form.department} onChange={handleDeptChange} options={departments} placeholder="No department" />
              <RefSelectField label="Assigned To" value={form.assignedTo} onChange={set('assignedTo')} options={filteredUsers.map(u => ({ _id: u._id, label: u.name }))} placeholder="Unassigned" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={statusOnly ? 'opacity-40 pointer-events-none' : ''}>
              <SelectField label="Priority" value={form.priority} onChange={set('priority')} options={priorityOptions} />
            </div>
            <SelectField label="Status" value={form.status} onChange={set('status')} options={statusOptions} />
          </div>

          <div className={statusOnly ? 'opacity-40 pointer-events-none' : ''}>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Due Date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => set('dueDate')(e.target.value)}
              disabled={statusOnly}
              style={{ colorScheme: 'dark' }}
              className="w-full rounded-lg border border-slate-600 bg-slate-700/60 px-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
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
export default function Tasks() {
  const [view,         setView]         = useState('list');
  const [editTarget,   setEditTarget]   = useState(null);
  const [saving,       setSaving]       = useState(false);
  const [listKey,      setListKey]      = useState(0);
  const [chatTask,     setChatTask]     = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  const socketRef     = useRef(null);
  const chatTaskIdRef = useRef(null); // ref so socket listener always sees current value

  // Keep ref in sync with chatTask state
  useEffect(() => { chatTaskIdRef.current = chatTask?._id || null; }, [chatTask]);

  // Set up socket.io connection on mount
  useEffect(() => {
    const token = localStorage.getItem('tm_token');
    if (!token) return;

    const socket = io('http://localhost:5000', { auth: { token } });
    socketRef.current = socket;

    // Fetch initial unread counts from server
    api.get('/api/tasks/unread')
      .then(r => setUnreadCounts(r.data))
      .catch(() => {});

    // When a new message arrives for a task we're not currently viewing, bump the badge
    socket.on('task_notification', ({ taskId }) => {
      if (chatTaskIdRef.current !== taskId) {
        setUnreadCounts(prev => ({ ...prev, [taskId]: (prev[taskId] || 0) + 1 }));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const openChat = (task) => {
    setChatTask(task);
    // Optimistically clear the badge — server marks read when chat mounts
    setUnreadCounts(prev => ({ ...prev, [task._id]: 0 }));
  };

  const closeChat = () => setChatTask(null);

  const goList   = () => { setView('list'); setListKey(k => k + 1); };
  const goCreate = () => { setEditTarget(null); setView('create'); };
  const goEdit   = (task) => { setEditTarget(task); setView('edit'); };

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await api.post('/api/tasks', payload);
      goList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (payload) => {
    setSaving(true);
    try {
      await api.put(`/api/tasks/${editTarget._id}`, payload);
      goList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const currUser = JSON.parse(localStorage.getItem('tm_user') || '{}');

  return (
    <Layout>
      <div className="fade-up">
        {view === 'list'   && <ListView  key={listKey} onAdd={goCreate} onEdit={goEdit} onChat={openChat} unreadCounts={unreadCounts} />}
        {view === 'create' && <TaskForm  onBack={goList} onSubmit={handleCreate} submitLabel="Create Task" saving={saving} />}
        {view === 'edit'   && <TaskForm  initial={editTarget} onBack={goList} onSubmit={handleUpdate} submitLabel="Update Task" saving={saving} />}
      </div>

      {/* Chat drawer — rendered outside layout flow so it overlays everything */}
      {chatTask && socketRef.current && (
        <TaskChat
          task={chatTask}
          socket={socketRef.current}
          currentUserId={currUser.id}
          onClose={closeChat}
        />
      )}
    </Layout>
  );
}
