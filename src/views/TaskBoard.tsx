import { useState } from 'react';
import { STATUS_CONFIG, type TaskStatus, type Task } from '../types';
import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

const COLUMNS: TaskStatus[] = ['todo', 'hearing', 'plan', 'shoot', 'edit', 'thumb', 'review', 'fix', 'done'];

// ─── タスク編集モーダル ───
function TaskModal({ task, store, onClose }: { task: Task; store: Store; onClose: () => void }) {
  const { updateTask, deleteTask, data } = store;
  const sta = STATUS_CONFIG[task.status];
  const td = store.today();
  const isLate = task.deadline && task.deadline < td && task.status !== 'done';

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700/60 rounded-xl w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-zinc-800/40">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sta.color }} />
          <input value={task.title}
            onChange={e => updateTask(task.id, { title: e.target.value })}
            className="flex-1 bg-transparent outline-none text-sm font-bold text-zinc-100 placeholder-zinc-600" />
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 text-xs px-1">✕</button>
        </div>

        {/* フォーム */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-zinc-500 font-bold tracking-wide block mb-1">案件</label>
              <select value={task.clientId} onChange={e => updateTask(task.id, { clientId: e.target.value })}
                className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-1.5 text-xs outline-none text-zinc-300">
                <option value="">—</option>
                {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-zinc-500 font-bold tracking-wide block mb-1">ステータス</label>
              <select value={task.status} onChange={e => updateTask(task.id, { status: e.target.value as TaskStatus })}
                className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-1.5 text-xs outline-none text-zinc-300">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[9px] text-zinc-500 font-bold tracking-wide block mb-1">締切</label>
              <input type="date" value={task.deadline} onChange={e => updateTask(task.id, { deadline: e.target.value })}
                className={`w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-1.5 text-xs outline-none ${isLate ? 'text-red-400' : 'text-zinc-300'}`} />
            </div>
            <div>
              <label className="text-[9px] text-zinc-500 font-bold tracking-wide block mb-1">担当</label>
              <input value={task.assignee} onChange={e => updateTask(task.id, { assignee: e.target.value })}
                placeholder="—" className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-1.5 text-xs outline-none text-zinc-300 placeholder-zinc-600" />
            </div>
            <div>
              <label className="text-[9px] text-zinc-500 font-bold tracking-wide block mb-1">売上</label>
              <input type="number" value={task.revenue || ''} onChange={e => updateTask(task.id, { revenue: Number(e.target.value) })}
                placeholder="0" className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-1.5 text-xs outline-none text-zinc-300 font-mono placeholder-zinc-600" />
            </div>
            <div>
              <label className="text-[9px] text-zinc-500 font-bold tracking-wide block mb-1">外注費</label>
              <input type="number" value={task.outsourceCost || ''} onChange={e => updateTask(task.id, { outsourceCost: Number(e.target.value) })}
                placeholder="0" className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-1.5 text-xs outline-none text-zinc-300 font-mono placeholder-zinc-600" />
            </div>
          </div>

          {/* 進捗スライダー */}
          <div>
            <label className="text-[9px] text-zinc-500 font-bold tracking-wide block mb-1.5">
              進捗 <span className="text-zinc-400 font-mono">{task.progress}%</span>
            </label>
            <input type="range" min="0" max="100" step="5" value={task.progress}
              onChange={e => updateTask(task.id, { progress: Number(e.target.value) })}
              className="w-full accent-teal-400" />
          </div>

          {/* メモ */}
          <div>
            <label className="text-[9px] text-zinc-500 font-bold tracking-wide block mb-1">メモ</label>
            <textarea value={task.notes || ''} onChange={e => updateTask(task.id, { notes: e.target.value })}
              rows={2} placeholder="メモを入力..."
              className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-1.5 text-xs outline-none text-zinc-300 placeholder-zinc-600 resize-none" />
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center gap-2 px-4 pb-4">
          <button onClick={() => { if (confirm('削除？')) { deleteTask(task.id); onClose(); } }}
            className="text-xs text-red-500/60 hover:text-red-400 px-2 py-1.5 rounded hover:bg-red-900/20 transition-colors">
            🗑 削除
          </button>
          <div className="flex-1" />
          <button onClick={onClose}
            className="text-xs bg-teal-400/10 text-teal-400 border border-teal-400/20 rounded-lg px-4 py-1.5 font-medium hover:bg-teal-400/20 transition-colors">
            完了
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskBoard({ store }: { store: Store }) {
  const { data, addTask, updateTask } = store;
  const td = store.today();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [addingCol, setAddingCol] = useState<TaskStatus | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('taskId');
    if (id) updateTask(id, { status });
  };

  const handleAddInCol = (col: TaskStatus) => {
    if (!newTitle.trim()) { setAddingCol(null); return; }
    addTask({ title: newTitle.trim(), status: col });
    setNewTitle('');
    setAddingCol(null);
  };

  // editTaskを最新stateと同期
  const currentEditTask = editTask ? data.tasks.find(t => t.id === editTask.id) || editTask : null;

  return (
    <div className="flex h-full overflow-x-auto p-3 gap-2">
      {editTask && currentEditTask && (
        <TaskModal task={currentEditTask} store={store} onClose={() => setEditTask(null)} />
      )}

      {COLUMNS.map(col => {
        const sta = STATUS_CONFIG[col];
        const tasks = data.tasks.filter(t => t.status === col);
        const isAddingHere = addingCol === col;

        return (
          <div key={col} className="w-44 flex-shrink-0 flex flex-col"
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleDrop(e, col)}>

            {/* カラムヘッダー */}
            <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sta.color }} />
              <span className="text-[10px] font-bold text-zinc-400">{sta.label}</span>
              <span className="text-[9px] text-zinc-700 ml-auto">{tasks.length}</span>
            </div>

            {/* タスクカード */}
            <div className="flex-1 space-y-1.5 overflow-y-auto pb-2">
              {tasks.map(t => {
                const isLate = t.deadline && t.deadline < td && col !== 'done';
                const client = data.clients.find(c => c.id === t.clientId);
                return (
                  <div key={t.id}
                    draggable
                    onDragStart={e => e.dataTransfer.setData('taskId', t.id)}
                    onClick={() => setEditTask(t)}
                    className={`bg-zinc-900/80 border rounded-lg p-2.5 cursor-pointer active:cursor-grabbing hover:border-zinc-600 transition-all hover:bg-zinc-800/60 ${isLate ? 'border-red-800/50' : 'border-zinc-800/50'}`}>
                    <div className="text-[11px] font-medium text-zinc-200 leading-tight">{t.title}</div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[9px] text-zinc-500">
                      {client && <span className="truncate flex-1">{client.name}</span>}
                      {t.deadline && (
                        <span className={`flex-shrink-0 ${isLate ? 'text-red-400 font-bold' : ''}`}>
                          {t.deadline.slice(5)}
                        </span>
                      )}
                    </div>
                    {t.progress > 0 && t.progress < 100 && (
                      <div className="h-0.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: t.progress + '%', background: sta.color }} />
                      </div>
                    )}
                    {t.revenue ? (
                      <div className="text-[9px] text-zinc-600 font-mono mt-1">¥{t.revenue.toLocaleString()}</div>
                    ) : null}
                  </div>
                );
              })}

              {/* インライン追加 */}
              {isAddingHere ? (
                <div className="bg-zinc-900/60 border border-teal-400/20 rounded-lg p-2">
                  <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddInCol(col);
                      if (e.key === 'Escape') { setAddingCol(null); setNewTitle(''); }
                    }}
                    placeholder="タスク名..." maxLength={60}
                    className="bg-transparent outline-none w-full text-xs text-zinc-200 placeholder-zinc-600" />
                  <div className="flex gap-1 mt-1.5">
                    <button onClick={() => handleAddInCol(col)}
                      className="text-[9px] text-teal-400 font-bold hover:text-teal-300">追加</button>
                    <button onClick={() => { setAddingCol(null); setNewTitle(''); }}
                      className="text-[9px] text-zinc-600 hover:text-zinc-400 ml-1">✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setAddingCol(col); setNewTitle(''); }}
                  className="w-full text-[10px] text-zinc-700 hover:text-zinc-400 py-1.5 rounded-lg hover:bg-zinc-800/30 transition-colors text-left px-2">
                  ＋ 追加
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
