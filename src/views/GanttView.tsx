import { STATUS_CONFIG } from '../types';
import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

export function GanttView({ store }: { store: Store }) {
  const { data, updateTask } = store;
  const td = store.today();
  const tasks = data.tasks.filter(t => t.status !== 'stop');
  const sorted = [...tasks].sort((a, b) => (a.deadline || 'z').localeCompare(b.deadline || 'z'));

  const todayDate = new Date(td);
  const rangeStart = new Date(todayDate); rangeStart.setDate(rangeStart.getDate() - 14);
  const rangeEnd = new Date(todayDate); rangeEnd.setDate(rangeEnd.getDate() + 42);
  const totalDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 864e5);
  const dayW = 28;

  const todayOffset = Math.round((todayDate.getTime() - rangeStart.getTime()) / 864e5);

  const fmtDate = (d: Date) => d.toISOString().split('T')[0];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b border-zinc-800/50 flex items-center gap-3">
        <span className="text-sm font-bold text-teal-400">📅 ガントチャート</span>
        <span className="text-[10px] text-zinc-500">{sorted.length}件</span>
      </div>
      <div className="flex-1 overflow-auto" ref={el => {
        if (el) el.scrollLeft = Math.max(0, (todayOffset - 3) * dayW);
      }}>
        <div className="flex" style={{ minWidth: 220 + totalDays * dayW }}>
          {/* Left: task names */}
          <div className="w-[220px] flex-shrink-0 border-r border-zinc-800/50 sticky left-0 z-10 bg-zinc-950">
            <div className="h-10 border-b border-zinc-800/50 px-3 flex items-center text-[10px] text-zinc-500 font-bold">タスク名</div>
            {sorted.map(t => {
              const sta = STATUS_CONFIG[t.status];
              const isLate = t.deadline && t.deadline < td && t.status !== 'done';
              return (
                <div key={t.id} className="h-8 border-b border-zinc-800/20 flex items-center gap-1.5 px-2 text-[11px] hover:bg-zinc-800/20">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sta.color }} />
                  <span className={`truncate ${isLate ? 'text-red-400' : 'text-zinc-300'}`}>{t.title}</span>
                </div>
              );
            })}
          </div>
          {/* Right: timeline */}
          <div className="flex-1 relative">
            {/* Date header */}
            <div className="h-10 border-b border-zinc-800/50 flex">
              {Array.from({ length: totalDays }, (_, d) => {
                const dt = new Date(rangeStart); dt.setDate(rangeStart.getDate() + d);
                const isToday = fmtDate(dt) === td;
                const isSun = dt.getDay() === 0;
                return (
                  <div key={d} className="flex-shrink-0 text-center border-r border-zinc-800/10" style={{ width: dayW }}>
                    <div className={`text-[7px] ${isToday ? 'text-teal-400' : isSun ? 'text-red-400/60' : 'text-zinc-600'}`}>
                      {'日月火水木金土'[dt.getDay()]}
                    </div>
                    <div className={`text-[10px] ${isToday ? 'text-teal-400 font-bold' : 'text-zinc-500'}`}>{dt.getDate()}</div>
                  </div>
                );
              })}
            </div>
            {/* Task rows */}
            {sorted.map(t => {
              const sta = STATUS_CONFIG[t.status];
              const dlDate = t.deadline ? new Date(t.deadline) : null;
              const dlDay = dlDate ? Math.round((dlDate.getTime() - rangeStart.getTime()) / 864e5) : -1;
              const isLate = t.deadline && t.deadline < td && t.status !== 'done';
              return (
                <div key={t.id} className="h-8 border-b border-zinc-800/10 relative">
                  {dlDay >= 0 && dlDay < totalDays && (
                    <div className="absolute cursor-pointer" title={`締切: ${t.deadline}`}
                      onClick={() => {
                        const nd = prompt('新しい締切日 (YYYY-MM-DD):', t.deadline);
                        if (nd && /^\d{4}-\d{2}-\d{2}$/.test(nd)) updateTask(t.id, { deadline: nd });
                      }}
                      style={{
                        left: dlDay * dayW + dayW / 2 - 5,
                        top: 8,
                        width: 10, height: 10,
                        transform: 'rotate(45deg)',
                        background: isLate ? '#f87171' : sta.color,
                        borderRadius: 2,
                      }} />
                  )}
                </div>
              );
            })}
            {/* Today line */}
            <div className="absolute top-0 bottom-0 w-0.5 bg-teal-400/30 pointer-events-none z-0"
              style={{ left: todayOffset * dayW + dayW / 2 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
