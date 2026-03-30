import { useRef } from 'react';
import { STATUS_CONFIG } from '../types';
import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

export function GanttView({ store }: { store: Store }) {
  const { data, updateTask } = store;
  const td = store.today();
  const scrollRef = useRef<HTMLDivElement>(null);

  const tasks = data.tasks
    .filter(t => t.status !== 'stop')
    .sort((a, b) => (a.deadline || 'z').localeCompare(b.deadline || 'z'));

  const todayDate = new Date(td);
  const rangeStart = new Date(todayDate); rangeStart.setDate(rangeStart.getDate() - 7);
  const rangeEnd = new Date(todayDate); rangeEnd.setDate(rangeEnd.getDate() + 49);
  const totalDays = Math.round((rangeEnd.getTime() - rangeStart.getTime()) / 864e5);
  const dayW = 30;
  const rowH = 36;
  const leftW = 200;

  const todayOffset = Math.round((todayDate.getTime() - rangeStart.getTime()) / 864e5);

  const fmtDate = (d: Date) => d.toISOString().split('T')[0];

  // スクロール位置を今日に合わせる
  const initScroll = (el: HTMLDivElement | null) => {
    if (el && el.scrollLeft === 0) {
      el.scrollLeft = Math.max(0, (todayOffset - 3) * dayW);
    }
  };

  // 週単位のグループ
  const weeks: { label: string; start: number; days: number }[] = [];
  let weekStart = 0;
  for (let d = 0; d < totalDays; d++) {
    const dt = new Date(rangeStart); dt.setDate(rangeStart.getDate() + d);
    if (dt.getDay() === 1 || d === 0) {
      if (weeks.length > 0) weeks[weeks.length - 1].days = d - weekStart;
      weeks.push({ label: `${dt.getMonth() + 1}/${dt.getDate()}週`, start: d, days: 0 });
      weekStart = d;
    }
  }
  if (weeks.length > 0) weeks[weeks.length - 1].days = totalDays - weekStart;

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="px-4 py-2.5 border-b border-zinc-800/50 flex items-center gap-3 bg-zinc-950/80 flex-shrink-0">
        <span className="text-xs font-bold text-zinc-300">📅 ガントチャート</span>
        <span className="text-[10px] text-zinc-500">{tasks.length}件</span>
        <div className="flex items-center gap-3 ml-auto text-[10px] text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-sm bg-teal-400/50" />進行中</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-sm bg-emerald-500/50" />完了</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rotate-45 inline-block bg-orange-400/80" style={{ borderRadius: 2 }} />締切</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左固定: タスク名 */}
        <div className="flex-shrink-0 border-r border-zinc-800/50 bg-zinc-950 z-10"
          style={{ width: leftW }}>
          {/* ヘッダー2行分の高さ */}
          <div style={{ height: rowH * 2 }} className="border-b border-zinc-800/50 flex items-end px-3 pb-1">
            <span className="text-[10px] text-zinc-500 font-bold">タスク名</span>
          </div>
          {tasks.map(t => {
            const sta = STATUS_CONFIG[t.status];
            const isLate = t.deadline && t.deadline < td && t.status !== 'done';
            const client = data.clients.find(c => c.id === t.clientId);
            return (
              <div key={t.id} style={{ height: rowH }}
                className="border-b border-zinc-800/20 flex items-center gap-1.5 px-2 hover:bg-zinc-800/20 cursor-default">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: sta.color }} />
                <div className="min-w-0">
                  <div className={`text-[11px] truncate ${isLate ? 'text-red-400' : 'text-zinc-300'}`}>{t.title}</div>
                  {client && <div className="text-[9px] text-zinc-600 truncate">{client.name}</div>}
                </div>
              </div>
            );
          })}
        </div>

        {/* 右: タイムライン (横スクロール) */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden" ref={el => { scrollRef.current = el; initScroll(el); }}>
          <div style={{ width: totalDays * dayW, position: 'relative' }}>

            {/* 週ラベル行 */}
            <div style={{ height: rowH }} className="border-b border-zinc-800/20 flex items-end">
              {weeks.map((w, i) => (
                <div key={i} className="border-r border-zinc-800/30 flex-shrink-0 px-1 pb-0.5"
                  style={{ width: w.days * dayW }}>
                  <span className="text-[9px] text-zinc-600">{w.label}</span>
                </div>
              ))}
            </div>

            {/* 日付ヘッダー行 */}
            <div style={{ height: rowH }} className="border-b border-zinc-800/50 flex">
              {Array.from({ length: totalDays }, (_, d) => {
                const dt = new Date(rangeStart); dt.setDate(rangeStart.getDate() + d);
                const isToday = fmtDate(dt) === td;
                const isSun = dt.getDay() === 0;
                const isSat = dt.getDay() === 6;
                return (
                  <div key={d} className={`flex-shrink-0 border-r text-center flex flex-col justify-center
                    ${isToday ? 'bg-teal-400/10 border-teal-400/30' : 'border-zinc-800/10'}
                    ${(isSun || isSat) && !isToday ? 'bg-zinc-800/10' : ''}`}
                    style={{ width: dayW }}>
                    <div className={`text-[8px] ${isToday ? 'text-teal-400' : isSun ? 'text-red-400/60' : isSat ? 'text-blue-400/50' : 'text-zinc-700'}`}>
                      {'日月火水木金土'[dt.getDay()]}
                    </div>
                    <div className={`text-[10px] font-mono ${isToday ? 'text-teal-400 font-bold' : 'text-zinc-500'}`}>
                      {dt.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* タスク行 */}
            {tasks.map(t => {
              const sta = STATUS_CONFIG[t.status];
              const dlDate = t.deadline ? new Date(t.deadline) : null;
              const dlDay = dlDate ? Math.round((dlDate.getTime() - rangeStart.getTime()) / 864e5) : -1;
              const isLate = t.deadline && t.deadline < td && t.status !== 'done';
              const isDone = t.status === 'done';

              // createdAtから締切までのバー
              const createdDate = t.createdAt ? new Date(t.createdAt) : null;
              const startDay = createdDate
                ? Math.max(0, Math.round((createdDate.getTime() - rangeStart.getTime()) / 864e5))
                : -1;
              const barEnd = dlDay >= 0 ? dlDay : -1;
              const barWidth = (startDay >= 0 && barEnd >= startDay) ? (barEnd - startDay + 1) * dayW : 0;
              const barLeft = startDay >= 0 ? startDay * dayW : 0;

              return (
                <div key={t.id} style={{ height: rowH }} className="border-b border-zinc-800/10 relative">
                  {/* 週末のシェード */}
                  {Array.from({ length: totalDays }, (_, d) => {
                    const dt = new Date(rangeStart); dt.setDate(rangeStart.getDate() + d);
                    return (dt.getDay() === 0 || dt.getDay() === 6)
                      ? <div key={d} className="absolute top-0 bottom-0 bg-zinc-800/10 pointer-events-none"
                          style={{ left: d * dayW, width: dayW }} />
                      : null;
                  })}

                  {/* 工程バー */}
                  {barWidth > 0 && (
                    <div className="absolute top-1/2 -translate-y-1/2 rounded"
                      style={{
                        left: barLeft,
                        width: barWidth,
                        height: 10,
                        background: isDone ? '#22c55e30' : sta.color + '25',
                        border: `1px solid ${isDone ? '#22c55e60' : sta.color + '40'}`,
                      }}>
                      {/* 進捗 */}
                      {t.progress > 0 && (
                        <div className="absolute inset-y-0 left-0 rounded"
                          style={{
                            width: t.progress + '%',
                            background: isDone ? '#22c55e50' : sta.color + '50',
                          }} />
                      )}
                    </div>
                  )}

                  {/* 締切マーカー ◆ */}
                  {dlDay >= 0 && dlDay < totalDays && (
                    <div
                      className="absolute cursor-pointer transition-transform hover:scale-125"
                      title={`締切: ${t.deadline}`}
                      onClick={() => {
                        const nd = prompt('新しい締切日 (YYYY-MM-DD):', t.deadline);
                        if (nd && /^\d{4}-\d{2}-\d{2}$/.test(nd)) updateTask(t.id, { deadline: nd });
                      }}
                      style={{
                        left: dlDay * dayW + dayW / 2 - 5,
                        top: rowH / 2 - 5,
                        width: 10, height: 10,
                        transform: 'rotate(45deg)',
                        background: isDone ? '#22c55e' : isLate ? '#f87171' : sta.color,
                        borderRadius: 2,
                      }} />
                  )}
                </div>
              );
            })}

            {/* 今日ライン */}
            <div className="absolute top-0 bottom-0 pointer-events-none z-10"
              style={{ left: todayOffset * dayW + dayW / 2 - 1, width: 2, background: 'rgba(94,234,212,0.4)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
