import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../lib/api';

const STATUSES   = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
const PRIORITIES = ['High', 'Medium', 'Low'];

const S = {
  'Pending':     { text: 'text-amber-400',   bar: 'bg-amber-400',   badge: 'text-amber-400 bg-amber-400/10 border-amber-400/25'   },
  'In Progress': { text: 'text-blue-400',    bar: 'bg-blue-400',    badge: 'text-blue-400 bg-blue-400/10 border-blue-400/25'    },
  'Completed':   { text: 'text-emerald-400', bar: 'bg-emerald-400', badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/25' },
  'Cancelled':   { text: 'text-slate-400',   bar: 'bg-slate-400',   badge: 'text-slate-400 bg-slate-400/10 border-slate-400/25'   },
};
const P = {
  'High':   { text: 'text-red-400',   bar: 'bg-red-400'   },
  'Medium': { text: 'text-amber-400', bar: 'bg-amber-400' },
  'Low':    { text: 'text-slate-400', bar: 'bg-slate-400' },
};

// ── Small components ─────────────────────────────────────────────────────────

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-700/60 bg-slate-800/50 p-5 ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, children }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-bold text-white">{title}</h2>
      {children}
    </div>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ colorScheme: 'dark' }}
        className="appearance-none rounded-lg border border-slate-700 bg-slate-800 pl-3 pr-7 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500 transition-colors cursor-pointer"
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </div>
  );
}

function BarRow({ label, count, max, colorClass, suffix = '' }) {
  const pct = max ? Math.round((count / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-semibold ${colorClass}`}>{label}</span>
        <span className="text-xs text-slate-400">{count}{suffix}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-700">
        <div className={`h-1.5 rounded-full transition-all ${colorClass.replace('text-', 'bg-')}`}
             style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const c = S[status] || S['Cancelled'];
  return (
    <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}>
      {status}
    </span>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [deptTaskFilter, setDeptTaskFilter] = useState('');
  const [userRankFilter, setUserRankFilter] = useState('');
  const [todayFilter,    setTodayFilter]    = useState('');
  const [monthFilter,    setMonthFilter]    = useState('');

  useEffect(() => {
    api.get('/api/dashboard')
      .then(r  => setData(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin text-indigo-400" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25" />
          <path d="M21 12a9 9 0 00-9-9" />
        </svg>
      </div>
    </Layout>
  );

  if (error) return (
    <Layout>
      <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">{error}</div>
    </Layout>
  );

  const { summary, tasksByStatus, tasksByPriority, departmentTasks, departmentUsers, userRankings, todayTasks, thisMonth } = data;

  const statusOpts = [{ value: '', label: 'All Status' }, ...STATUSES.map(s => ({ value: s, label: s }))];

  // Derived: user rankings sorted by selected filter
  const sortedUsers = [...userRankings].sort((a, b) =>
    userRankFilter
      ? (b.byStatus[userRankFilter] || 0) - (a.byStatus[userRankFilter] || 0)
      : b.total - a.total
  );

  // Today tasks filtered
  const todayFiltered = todayFilter ? todayTasks.filter(t => t.status === todayFilter) : todayTasks;

  // This month statuses
  const monthRows = (monthFilter ? [monthFilter] : STATUSES).map(s => ({
    status: s,
    count:  thisMonth.byStatus[s] || 0,
  }));

  return (
    <Layout>
      <div className="space-y-5 fade-up">

        {/* Page title */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-bold text-white">Dashboard</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {data?.scope === 'personal' ? 'Your tasks and department overview' : 'Live overview across tasks, users and departments'}
            </p>
          </div>
          {data?.scope === 'personal' && (
            <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              Personal View
            </span>
          )}
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              label: 'Total Tasks', value: summary.totalTasks,
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12l2 2 4-4"/></svg>,
              color: 'bg-indigo-500/15 text-indigo-400',
            },
            {
              label: 'Total Users', value: summary.totalUsers,
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
              color: 'bg-blue-500/15 text-blue-400',
            },
            {
              label: 'Departments', value: summary.totalDepartments,
              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
              color: 'bg-purple-500/15 text-purple-400',
            },
          ].map(({ label, value, icon, color }) => (
            <Card key={label}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</p>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
              </div>
              <p className="text-3xl font-bold text-white">{value}</p>
            </Card>
          ))}
        </div>

        {/* ── Tasks by Status + Priority ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Tasks by Status" />
            <div className="space-y-3">
              {STATUSES.map(s => {
                const count = tasksByStatus.find(t => t.status === s)?.count || 0;
                const pct   = summary.totalTasks ? Math.round((count / summary.totalTasks) * 100) : 0;
                return (
                  <div key={s}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${S[s].text}`}>{s}</span>
                      <span className="text-xs text-slate-400">{count} <span className="text-slate-600">({pct}%)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700">
                      <div className={`h-2 rounded-full transition-all ${S[s].bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <CardHeader title="Tasks by Priority" />
            <div className="space-y-3">
              {PRIORITIES.map(p => {
                const count = tasksByPriority.find(t => t.priority === p)?.count || 0;
                const pct   = summary.totalTasks ? Math.round((count / summary.totalTasks) * 100) : 0;
                return (
                  <div key={p}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold ${P[p].text}`}>{p}</span>
                      <span className="text-xs text-slate-400">{count} <span className="text-slate-600">({pct}%)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700">
                      <div className={`h-2 rounded-full transition-all ${P[p].bar}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ── Department Tasks + Department Users ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader title="Department Tasks">
              <FilterSelect value={deptTaskFilter} onChange={setDeptTaskFilter} options={statusOpts} />
            </CardHeader>
            {departmentTasks.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No department tasks yet</p>
            ) : (
              <div className="space-y-3">
                {departmentTasks.map(dept => {
                  const count  = deptTaskFilter ? (dept.byStatus[deptTaskFilter] || 0) : dept.total;
                  const maxVal = deptTaskFilter
                    ? Math.max(...departmentTasks.map(d => d.byStatus[deptTaskFilter] || 0), 1)
                    : Math.max(...departmentTasks.map(d => d.total), 1);
                  const pct = Math.round((count / maxVal) * 100);
                  return (
                    <div key={dept.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-300 truncate max-w-[150px]">{dept.name}</span>
                        <span className="text-xs text-slate-400">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-700">
                        <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Users per Department" />
            {departmentUsers.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No department data yet</p>
            ) : (
              <div className="space-y-3">
                {departmentUsers.map(dept => {
                  const maxVal = Math.max(...departmentUsers.map(d => d.count), 1);
                  const pct    = Math.round((dept.count / maxVal) * 100);
                  return (
                    <div key={dept.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-300 truncate max-w-[150px]">{dept.name}</span>
                        <span className="text-xs text-slate-400">{dept.count} user{dept.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-700">
                        <div className="h-1.5 rounded-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ── User Task Rankings ── */}
        <Card>
          <CardHeader title="User Task Rankings">
            <FilterSelect
              value={userRankFilter}
              onChange={setUserRankFilter}
              options={[{ value: '', label: 'Sort by Total' }, ...STATUSES.map(s => ({ value: s, label: `By ${s}` }))]}
            />
          </CardHeader>
          {sortedUsers.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No assigned tasks yet</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[186px] overflow-y-auto">
                <table className="w-full text-sm min-w-[540px]">
                  <thead className="sticky top-0 bg-slate-800 z-10">
                    <tr className="border-b border-slate-700/60">
                      <th className="text-left pb-2.5 pt-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest w-8">#</th>
                      <th className="text-left pb-2.5 pt-1 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">User</th>
                      <th className={`text-center pb-2.5 pt-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${!userRankFilter ? 'text-white' : 'text-slate-500'}`}>
                        Total {!userRankFilter && '↓'}
                      </th>
                      {STATUSES.map(s => {
                        const isActive = userRankFilter === s;
                        return (
                          <th key={s} className={`text-center pb-2.5 pt-1 text-[10px] font-semibold uppercase tracking-widest transition-colors ${isActive ? S[s].text : 'text-slate-500'}`}>
                            {s === 'In Progress' ? 'In Prog.' : s}{isActive && ' ↓'}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedUsers.map((u, i) => (
                      <tr key={u.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                        <td className="py-3 text-slate-500 text-xs tabular-nums">{i + 1}</td>
                        <td className="py-3">
                          <p className="text-xs font-medium text-slate-200">{u.name}</p>
                          <p className="text-[10px] text-slate-500">{u.email}</p>
                        </td>
                        <td className={`py-3 text-center text-xs font-bold transition-colors ${!userRankFilter ? 'text-white' : 'text-slate-500'}`}>
                          {u.total}
                        </td>
                        {STATUSES.map(s => {
                          const isActive = userRankFilter === s;
                          return (
                            <td key={s} className={`py-3 text-center text-xs font-semibold transition-colors ${isActive ? S[s].text : 'text-slate-600'}`}>
                              {u.byStatus[s] || 0}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>

        {/* ── Today's Tasks + This Month ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader title={`Today's Tasks (${todayFiltered.length})`}>
              <FilterSelect value={todayFilter} onChange={setTodayFilter} options={statusOpts} />
            </CardHeader>
            {todayFiltered.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No tasks due today</p>
            ) : (
              <div className="space-y-0 max-h-72 overflow-y-auto">
                {todayFiltered.map(task => (
                  <div key={task._id} className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-700/30 last:border-0">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-200 truncate">{task.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {task.assignedTo?.name || 'Unassigned'}
                        {task.department && <> · {task.department.name}</>}
                      </p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title={`This Month's Tasks (${thisMonth.total})`}>
              <FilterSelect value={monthFilter} onChange={setMonthFilter} options={statusOpts} />
            </CardHeader>
            {thisMonth.total === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No tasks created this month</p>
            ) : (
              <div className="space-y-3">
                {monthRows.map(({ status, count }) => {
                  const pct = thisMonth.total ? Math.round((count / thisMonth.total) * 100) : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold ${S[status].text}`}>{status}</span>
                        <span className="text-xs text-slate-400">{count} <span className="text-slate-600">({pct}%)</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-700">
                        <div className={`h-2 rounded-full transition-all ${S[status].bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

      </div>
    </Layout>
  );
}
