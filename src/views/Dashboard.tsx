import { STATUS_CONFIG } from '../types';
import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

export function Dashboard({ store, onNavigate }: { store: Store; onNavigate: (v: string) => void }) {
  const { data } = store;
  const td = store.today();
  const month = store.thisMonth();
  
  const active = data.tasks.filter(t => t.status !== 'done' && t.status !== 'stop');
  const late = active.filter(t => t.deadline && t.deadline < td);
  const todayDue = active.filter(t => t.deadline === td);
  const done = data.tasks.filter(t => t.status === 'done');
  const monthDone = done.filter(t => (t.completedAt || t.deadline || '').startsWith(month));
  
  const mRev = monthDone.reduce((a, t) => a + (t.revenue || 0), 0);
  const mOut = monthDone.reduce((a, t) => a + (t.outsourceCost || 0), 0);
  const profit = mRev - mOut;
  const pipeline = active.reduce((a, t) => a + (t.revenue || 0), 0);
  const outRate = mRev > 0 ? Math.round(mOut / mRev * 100) : 0;
  
  const fmt = (n: number) => '¥' + n.toLocaleString();

  // Group by client
  const byClient: Record<string, typeof active> = {};
  active.forEach(t => {
    const cName = data.clients.find(c => c.id === t.clientId)?.name || '未分類';
    if (!byClient[cName]) byClient[cName] = [];
    byClient[cName].push(t);
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-teal-400/10 flex items-center justify-center text-sm">🐤</div>
        <div>
          <div className="text-xs font-bold text-zinc-300">
            {new Date().getHours() < 12 ? 'おはようございます' : 'お疲れさまです'}
          </div>
          <div className="text-[10px] text-zinc-500">
            {late.length > 0 && <span className="text-red-400 font-bold">⚠ {late.length}件遅延 </span>}
            {todayDue.length > 0 && <span className="text-amber-400">⚡{todayDue.length}件今日 </span>}
            進行中{active.length}件
          </div>
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card label="今月の売上" value={fmt(mRev)} sub={month.replace('-','/')} color="text-teal-400" />
        <Card label="利益" value={fmt(profit)} sub={mRev > 0 ? Math.round(profit/mRev*100)+'%' : '—'} color={profit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <Card label="外注費" value={fmt(mOut)} sub={outRate+'%'} color={outRate > 73 ? 'text-red-400' : outRate > 50 ? 'text-amber-400' : 'text-emerald-400'} />
        <Card label="パイプライン" value={fmt(pipeline)} sub={active.length+'件進行中'} color="text-teal-400" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Late tasks */}
        <div className="col-span-2 bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-zinc-300">
              {late.length > 0 ? <span className="text-red-400">⚠ 期限タスク ({late.length + todayDue.length}件)</span> : '📋 進行中タスク'}
            </h3>
            <button onClick={() => onNavigate('table')} className="text-[10px] text-teal-400 hover:underline">全て見る →</button>
          </div>
          <div className="space-y-1.5">
            {[...late, ...todayDue].slice(0, 6).map(t => {
              const daysLate = t.deadline < td ? Math.abs(Math.round((new Date(td).getTime() - new Date(t.deadline).getTime()) / 864e5)) : 0;
              const client = data.clients.find(c => c.id === t.clientId);
              return (
                <div key={t.id} className="flex items-center gap-2 py-1.5 px-2 rounded bg-zinc-800/30 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.deadline < td ? '#f87171' : '#fbbf24' }} />
                  <span className="font-medium flex-1 truncate">{t.title}</span>
                  <span className="text-zinc-500 text-[10px]">{client?.name || ''}</span>
                  {daysLate > 0 && <span className="text-red-400 text-[10px] font-bold">{daysLate}日超過</span>}
                  <span className="text-zinc-500 text-[10px]">{t.deadline?.slice(5)}</span>
                </div>
              );
            })}
            {late.length === 0 && todayDue.length === 0 && (
              <div className="text-zinc-500 text-[10px] text-center py-4">期限超過タスクはありません</div>
            )}
          </div>
        </div>

        {/* Client summary */}
        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-4">
          <h3 className="text-xs font-bold text-zinc-300 mb-3">📂 案件別</h3>
          <div className="space-y-2">
            {Object.entries(byClient).slice(0, 6).map(([name, tasks]) => {
              const avg = Math.round(tasks.reduce((a, t) => a + t.progress, 0) / tasks.length);
              const hasLate = tasks.some(t => t.deadline && t.deadline < td);
              return (
                <div key={name} className="flex items-center gap-2 text-[11px]">
                  <span className={`w-1.5 h-1.5 rounded-full ${hasLate ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <span className="flex-1 truncate">{name}</span>
                  <span className="text-zinc-500">{tasks.length}件</span>
                  <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-400 rounded-full" style={{ width: avg + '%' }} />
                  </div>
                  <span className="text-zinc-500 w-7 text-right">{avg}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-lg p-3">
      <div className="text-[10px] text-zinc-500 font-medium mb-1">{label}</div>
      <div className={`text-lg font-extrabold font-mono tracking-tight ${color}`}>{value}</div>
      <div className="text-[10px] text-zinc-500 mt-0.5">{sub}</div>
    </div>
  );
}
