import { useState } from 'react';
import { STATUS_CONFIG, type Task, type TaskStatus } from '../types';
import type { useStore } from '../store';
import type { View } from '../App';

type Store = ReturnType<typeof useStore>;

// ─── インラインタスク追加フォーム ───
function AddTaskRow({ store, onDone }: { store: Store; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [deadline, setDeadline] = useState('');

  const submit = () => {
    if (!title.trim()) return;
    store.addTask({ title: title.trim(), clientId, deadline });
    setTitle(''); setClientId(''); setDeadline('');
    onDone();
  };

  return (
    <tr className="bg-teal-400/5 border-b border-teal-400/10">
      <td className="px-3 py-1.5 text-zinc-600 text-xs">new</td>
      <td className="px-2 py-1.5" colSpan={2}>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onDone(); }}
          placeholder="タスク名を入力..." maxLength={80}
          className="bg-transparent outline-none w-full text-zinc-200 text-xs placeholder-zinc-600 font-medium" />
      </td>
      <td className="px-2 py-1.5">
        <select value={clientId} onChange={e => setClientId(e.target.value)}
          className="bg-zinc-800/60 border border-zinc-700/40 rounded px-1.5 py-0.5 text-[11px] outline-none text-zinc-300 w-full">
          <option value="">案件なし</option>
          {store.data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
          className="bg-transparent outline-none text-[11px] text-zinc-400 w-full" />
      </td>
      <td colSpan={5} />
      <td className="px-2 py-1.5">
        <div className="flex gap-1">
          <button onClick={submit} className="text-[10px] text-teal-400 hover:text-teal-300 font-bold px-1.5 py-0.5 rounded bg-teal-400/10">追加</button>
          <button onClick={onDone} className="text-[10px] text-zinc-600 hover:text-zinc-400 px-1">✕</button>
        </div>
      </td>
    </tr>
  );
}

// ─── 案件追加モーダル ───
function AddClientModal({ store, onClose }: { store: Store; onClose: () => void }) {
  const [name, setName] = useState('');
  const submit = () => {
    if (!name.trim()) return;
    store.addClient(name.trim());
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-72 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-xs font-bold text-zinc-300 mb-3">案件を追加</div>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose(); }}
          placeholder="案件名 (例: FANTS様 4月)" maxLength={40}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none text-zinc-200 placeholder-zinc-600 mb-3" />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5">キャンセル</button>
          <button onClick={submit} className="text-xs bg-teal-400/15 text-teal-400 border border-teal-400/20 rounded-lg px-3 py-1.5 font-medium hover:bg-teal-400/25">追加</button>
        </div>
      </div>
    </div>
  );
}

export function TaskTable({ store }: { store: Store }) {
  const { data, updateTask, deleteTask } = store;
  const [filter, setFilter] = useState({ search: '', status: 'active' as string, client: 'all' });
  const [sortKey, setSortKey] = useState<'deadline' | 'status' | 'priority' | 'title'>('deadline');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [adding, setAdding] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const td = store.today();

  let tasks = [...data.tasks];
  if (filter.status === 'active') tasks = tasks.filter(t => t.status !== 'done' && t.status !== 'stop');
  else if (filter.status !== 'all') tasks = tasks.filter(t => t.status === filter.status);
  if (filter.client !== 'all') tasks = tasks.filter(t => t.clientId === filter.client);
  if (filter.search) {
    const s = filter.search.toLowerCase();
    tasks = tasks.filter(t => t.title.toLowerCase().includes(s) || t.assignee.toLowerCase().includes(s));
  }

  const priOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  const staOrder = Object.keys(STATUS_CONFIG);
  tasks.sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'deadline') cmp = (a.deadline || 'z').localeCompare(b.deadline || 'z');
    else if (sortKey === 'priority') cmp = (priOrder[a.priority] || 2) - (priOrder[b.priority] || 2);
    else if (sortKey === 'status') cmp = staOrder.indexOf(a.status) - staOrder.indexOf(b.status);
    else cmp = a.title.localeCompare(b.title);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: string }) =>
    sortKey === k ? <span className="text-teal-400 ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span> : null;

  // 月次売上合計
  const month = store.thisMonth();
  const monthRevenue = data.tasks
    .filter(t => t.status === 'done' && (t.completedAt || '').startsWith(month))
    .reduce((a, t) => a + (t.revenue || 0), 0);

  return (
    <div className="flex flex-col h-full">
      {showClientModal && <AddClientModal store={store} onClose={() => setShowClientModal(false)} />}

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/50 flex-shrink-0 bg-zinc-950/80">
        <input value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })}
          placeholder="検索..." className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs outline-none w-36 focus:border-teal-400/40 text-zinc-300 placeholder-zinc-600" />
        <select value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}
          className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-xs outline-none text-zinc-300">
          <option value="active">進行中</option>
          <option value="all">全て</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filter.client} onChange={e => setFilter({ ...filter, client: e.target.value })}
          className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2 py-1.5 text-xs outline-none text-zinc-300">
          <option value="all">全案件</option>
          {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex-1" />
        {monthRevenue > 0 && (
          <span className="text-[10px] text-zinc-500 font-mono">
            今月完了 <span className="text-teal-400">¥{monthRevenue.toLocaleString()}</span>
          </span>
        )}
        <span className="text-[10px] text-zinc-500">{tasks.length}件</span>
        <button onClick={() => setShowClientModal(true)}
          className="text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-1.5 rounded hover:bg-zinc-800/50">
          ＋ 案件
        </button>
        <button onClick={() => setAdding(true)}
          className="bg-teal-400/10 text-teal-400 border border-teal-400/20 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-teal-400/20 transition-colors">
          ＋ タスク
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-zinc-950">
            <tr className="text-zinc-500 text-[10px] uppercase tracking-wider border-b border-zinc-800/50">
              <th className="text-left px-3 py-2 w-8">#</th>
              <th className="text-left px-2 py-2 cursor-pointer hover:text-zinc-300" onClick={() => handleSort('title')}>
                タスク名 <SortIcon k="title" />
              </th>
              <th className="text-left px-2 py-2 w-28">案件</th>
              <th className="text-left px-2 py-2 w-24 cursor-pointer hover:text-zinc-300" onClick={() => handleSort('status')}>
                ステータス <SortIcon k="status" />
              </th>
              <th className="text-left px-2 py-2 w-20 cursor-pointer hover:text-zinc-300" onClick={() => handleSort('deadline')}>
                締切 <SortIcon k="deadline" />
              </th>
              <th className="text-left px-2 py-2 w-16 cursor-pointer hover:text-zinc-300" onClick={() => handleSort('priority')}>
                優先 <SortIcon k="priority" />
              </th>
              <th className="text-right px-2 py-2 w-20">売上</th>
              <th className="text-right px-2 py-2 w-20">外注</th>
              <th className="text-center px-2 py-2 w-16">進捗</th>
              <th className="text-left px-2 py-2 w-20">担当</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {adding && <AddTaskRow store={store} onDone={() => setAdding(false)} />}
            {tasks.map((t, i) => (
              <TaskRow key={t.id} task={t} index={i} store={store} td={td} />
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && !adding && (
          <div className="text-center py-16 text-zinc-600 text-xs">
            <div className="text-2xl mb-2 opacity-20">≡</div>
            タスクがありません
            <br />
            <button onClick={() => setAdding(true)} className="mt-2 text-teal-400 hover:underline">＋ タスクを追加</button>
          </div>
        )}
      </div>
    </div>
  );
}

const PRIORITY_CONFIG = {
  urgent: { label: '緊急', color: '#f87171' },
  high:   { label: '高',   color: '#fb923c' },
  medium: { label: '中',   color: '#a1a1aa' },
  low:    { label: '低',   color: '#52525b' },
};

function TaskRow({ task: t, index, store, td }: {
  task: Task; index: number; store: ReturnType<typeof useStore>; td: string;
}) {
  const { updateTask, deleteTask, data } = store;
  const sta = STATUS_CONFIG[t.status];
  const pri = PRIORITY_CONFIG[t.priority] || PRIORITY_CONFIG.medium;
  const isLate = t.deadline && t.deadline < td && t.status !== 'done' && t.status !== 'stop';
  const client = data.clients.find(c => c.id === t.clientId);

  const Cell = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <td className={`px-2 py-1 border-b border-zinc-800/20 ${className}`}>{children}</td>
  );

  return (
    <tr className={`group hover:bg-zinc-800/20 transition-colors ${isLate ? 'bg-red-950/10' : ''}`}>
      <Cell className="px-3 text-zinc-700">{index + 1}</Cell>
      <Cell>
        <input value={t.title} onChange={e => updateTask(t.id, { title: e.target.value })}
          className="bg-transparent outline-none w-full font-medium text-zinc-200 focus:bg-zinc-800/40 rounded px-1 -ml-1 text-xs" />
      </Cell>
      <Cell>
        <select value={t.clientId} onChange={e => updateTask(t.id, { clientId: e.target.value })}
          className="bg-transparent outline-none text-zinc-400 text-[11px] w-full focus:bg-zinc-800/40 rounded">
          <option value="">—</option>
          {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Cell>
      <Cell>
        <select value={t.status} onChange={e => updateTask(t.id, { status: e.target.value as TaskStatus })}
          className="rounded px-1.5 py-0.5 text-[10px] font-medium border-0 outline-none cursor-pointer"
          style={{ background: sta.color + '20', color: sta.color }}>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </Cell>
      <Cell>
        <input type="date" value={t.deadline} onChange={e => updateTask(t.id, { deadline: e.target.value })}
          className={`bg-transparent outline-none text-[11px] w-full focus:bg-zinc-800/40 rounded ${isLate ? 'text-red-400 font-bold' : 'text-zinc-400'}`} />
      </Cell>
      <Cell>
        <select value={t.priority} onChange={e => updateTask(t.id, { priority: e.target.value as Task['priority'] })}
          className="bg-transparent outline-none text-[11px] w-full cursor-pointer"
          style={{ color: pri.color }}>
          <option value="urgent">緊急</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
      </Cell>
      <Cell className="text-right">
        <input type="number" value={t.revenue || ''} onChange={e => updateTask(t.id, { revenue: Number(e.target.value) })}
          className="bg-transparent outline-none w-full text-right font-mono text-zinc-400 focus:bg-zinc-800/40 rounded text-[11px]" placeholder="0" />
      </Cell>
      <Cell className="text-right">
        <input type="number" value={t.outsourceCost || ''} onChange={e => updateTask(t.id, { outsourceCost: Number(e.target.value) })}
          className="bg-transparent outline-none w-full text-right font-mono text-zinc-400 focus:bg-zinc-800/40 rounded text-[11px]" placeholder="0" />
      </Cell>
      <Cell className="text-center">
        <div className="flex items-center gap-1">
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: t.progress + '%', background: sta.color }} />
          </div>
          <span className="text-[9px] text-zinc-600 w-5">{t.progress}%</span>
        </div>
      </Cell>
      <Cell>
        <input value={t.assignee} onChange={e => updateTask(t.id, { assignee: e.target.value })}
          className="bg-transparent outline-none w-full text-zinc-400 text-[11px] focus:bg-zinc-800/40 rounded px-1 -ml-1" placeholder="—" />
      </Cell>
      <Cell>
        <button onClick={() => { if (confirm('削除？')) deleteTask(t.id); }}
          className="text-zinc-700 hover:text-red-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
      </Cell>
    </tr>
  );
}
