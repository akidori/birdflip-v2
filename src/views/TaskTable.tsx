import { useState } from 'react';
import { STATUS_CONFIG, type Task, type TaskStatus } from '../types';
import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

export function TaskTable({ store }: { store: Store }) {
  const { data, addTask, updateTask, deleteTask, addClient } = store;
  const [filter, setFilter] = useState({ search: '', status: 'active' as string, client: 'all' });
  const [sortKey, setSortKey] = useState<'deadline' | 'status' | 'priority' | 'title'>('deadline');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const td = store.today();

  const clients = data.clients;
  let tasks = [...data.tasks];

  // Filter
  if (filter.status === 'active') tasks = tasks.filter(t => t.status !== 'done' && t.status !== 'stop');
  else if (filter.status !== 'all') tasks = tasks.filter(t => t.status === filter.status);
  if (filter.client !== 'all') tasks = tasks.filter(t => t.clientId === filter.client);
  if (filter.search) {
    const s = filter.search.toLowerCase();
    tasks = tasks.filter(t => t.title.toLowerCase().includes(s) || t.assignee.toLowerCase().includes(s));
  }

  // Sort
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

  const handleAdd = () => {
    const title = prompt('タスク名:');
    if (!title) return;
    addTask({ title });
  };

  const handleNewClient = () => {
    const name = prompt('案件名:');
    if (name) addClient(name);
  };

  const SortIcon = ({ k }: { k: string }) => (
    sortKey === k ? <span className="text-teal-400 ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span> : null
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/50 flex-shrink-0">
        <input value={filter.search} onChange={e => setFilter({...filter, search: e.target.value})}
          placeholder="検索..." className="bg-zinc-800/50 border border-zinc-700/50 rounded px-2.5 py-1.5 text-xs outline-none w-40 focus:border-teal-400/40" />
        <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})}
          className="bg-zinc-800/50 border border-zinc-700/50 rounded px-2 py-1.5 text-xs outline-none text-zinc-300">
          <option value="active">進行中</option>
          <option value="all">全て</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filter.client} onChange={e => setFilter({...filter, client: e.target.value})}
          className="bg-zinc-800/50 border border-zinc-700/50 rounded px-2 py-1.5 text-xs outline-none text-zinc-300">
          <option value="all">全案件</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={handleNewClient} className="text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-1">+ 案件</button>
        <button onClick={handleAdd} className="bg-teal-400/10 text-teal-400 text-xs font-medium px-3 py-1.5 rounded hover:bg-teal-400/20">+ タスク</button>
        <span className="text-[10px] text-zinc-500">{tasks.length}件</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-zinc-900">
            <tr className="text-zinc-500 text-[10px] uppercase tracking-wider">
              <th className="text-left px-3 py-2 w-8">#</th>
              <th className="text-left px-2 py-2 cursor-pointer hover:text-zinc-300" onClick={() => handleSort('title')}>タスク名 <SortIcon k="title" /></th>
              <th className="text-left px-2 py-2 w-24">案件</th>
              <th className="text-left px-2 py-2 w-20 cursor-pointer hover:text-zinc-300" onClick={() => handleSort('status')}>ステータス <SortIcon k="status" /></th>
              <th className="text-left px-2 py-2 w-16">担当</th>
              <th className="text-left px-2 py-2 w-24 cursor-pointer hover:text-zinc-300" onClick={() => handleSort('deadline')}>締切 <SortIcon k="deadline" /></th>
              <th className="text-left px-2 py-2 w-16 cursor-pointer hover:text-zinc-300" onClick={() => handleSort('priority')}>優先 <SortIcon k="priority" /></th>
              <th className="text-right px-2 py-2 w-20">売上</th>
              <th className="text-right px-2 py-2 w-20">外注</th>
              <th className="text-center px-2 py-2 w-12">進捗</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t, i) => (
              <TaskRow key={t.id} task={t} index={i} store={store} td={td} />
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && (
          <div className="text-center py-16 text-zinc-500 text-xs">
            タスクがありません<br/>
            <button onClick={handleAdd} className="mt-2 text-teal-400 hover:underline">+ 追加</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task: t, index, store, td }: { task: Task; index: number; store: ReturnType<typeof useStore>; td: string }) {
  const { updateTask, deleteTask, data } = store;
  const sta = STATUS_CONFIG[t.status];
  const isLate = t.deadline && t.deadline < td && t.status !== 'done' && t.status !== 'stop';
  const client = data.clients.find(c => c.id === t.clientId);

  const Cell = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <td className={`px-2 py-1.5 border-b border-zinc-800/30 ${className}`}>{children}</td>
  );

  return (
    <tr className={`hover:bg-zinc-800/20 transition-colors ${isLate ? 'bg-red-950/10' : ''}`}>
      <Cell className="px-3 text-zinc-600">{index + 1}</Cell>
      <Cell>
        <input value={t.title} onChange={e => updateTask(t.id, { title: e.target.value })}
          className="bg-transparent outline-none w-full font-medium text-zinc-200 focus:bg-zinc-800/40 rounded px-1 -ml-1" />
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
          className="rounded px-1.5 py-0.5 text-[10px] font-medium border-0 outline-none"
          style={{ background: sta.color + '18', color: sta.color }}>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </Cell>
      <Cell>
        <input value={t.assignee} onChange={e => updateTask(t.id, { assignee: e.target.value })}
          className="bg-transparent outline-none w-full text-zinc-400 focus:bg-zinc-800/40 rounded px-1 -ml-1" placeholder="—" />
      </Cell>
      <Cell>
        <input type="date" value={t.deadline} onChange={e => updateTask(t.id, { deadline: e.target.value })}
          className={`bg-transparent outline-none text-[11px] w-full focus:bg-zinc-800/40 rounded ${isLate ? 'text-red-400 font-bold' : 'text-zinc-400'}`} />
      </Cell>
      <Cell>
        <select value={t.priority} onChange={e => updateTask(t.id, { priority: e.target.value as Task['priority'] })}
          className="bg-transparent outline-none text-[11px] text-zinc-400 w-full">
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
          <option value="urgent">緊急</option>
        </select>
      </Cell>
      <Cell className="text-right">
        <input type="number" value={t.revenue || ''} onChange={e => updateTask(t.id, { revenue: Number(e.target.value) })}
          className="bg-transparent outline-none w-full text-right font-mono text-zinc-400 focus:bg-zinc-800/40 rounded" placeholder="0" />
      </Cell>
      <Cell className="text-right">
        <input type="number" value={t.outsourceCost || ''} onChange={e => updateTask(t.id, { outsourceCost: Number(e.target.value) })}
          className="bg-transparent outline-none w-full text-right font-mono text-zinc-400 focus:bg-zinc-800/40 rounded" placeholder="0" />
      </Cell>
      <Cell className="text-center">
        <div className="flex items-center gap-1">
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: t.progress + '%', background: sta.color }} />
          </div>
          <span className="text-[9px] text-zinc-500 w-6">{t.progress}%</span>
        </div>
      </Cell>
      <Cell>
        <button onClick={() => { if (confirm('削除？')) deleteTask(t.id); }}
          className="text-zinc-600 hover:text-red-400 text-[10px]">✕</button>
      </Cell>
    </tr>
  );
}
