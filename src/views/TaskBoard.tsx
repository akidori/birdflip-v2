import { STATUS_CONFIG, type TaskStatus } from '../types';
import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

const COLUMNS: TaskStatus[] = ['todo', 'hearing', 'plan', 'shoot', 'edit', 'thumb', 'review', 'fix', 'done'];

export function TaskBoard({ store }: { store: Store }) {
  const { data, updateTask } = store;
  const td = store.today();

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('taskId');
    if (id) updateTask(id, { status });
  };

  return (
    <div className="flex h-full overflow-x-auto p-3 gap-2">
      {COLUMNS.map(col => {
        const sta = STATUS_CONFIG[col];
        const tasks = data.tasks.filter(t => t.status === col);
        return (
          <div key={col} className="w-48 flex-shrink-0 flex flex-col"
            onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, col)}>
            <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: sta.color }} />
              <span className="text-[11px] font-bold text-zinc-400">{sta.label}</span>
              <span className="text-[10px] text-zinc-600 ml-auto">{tasks.length}</span>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto pb-4">
              {tasks.map(t => {
                const isLate = t.deadline && t.deadline < td && col !== 'done';
                const client = data.clients.find(c => c.id === t.clientId);
                return (
                  <div key={t.id} draggable onDragStart={e => e.dataTransfer.setData('taskId', t.id)}
                    className={`bg-zinc-900/80 border rounded-md p-2.5 cursor-grab active:cursor-grabbing hover:border-zinc-600 transition-colors ${isLate ? 'border-red-800/50' : 'border-zinc-800/50'}`}>
                    <div className="text-[11px] font-medium text-zinc-200 leading-tight">{t.title}</div>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-zinc-500">
                      {client && <span className="truncate">{client.name}</span>}
                      {t.deadline && <span className={isLate ? 'text-red-400 font-bold' : ''}>{t.deadline.slice(5)}</span>}
                      {t.assignee && <span className="ml-auto">{t.assignee}</span>}
                    </div>
                    {t.progress > 0 && (
                      <div className="h-0.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: t.progress + '%', background: sta.color }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
