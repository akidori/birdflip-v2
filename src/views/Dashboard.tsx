import { STATUS_CONFIG } from '../types';
import type { View } from '../App';
import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

export function Dashboard({ store, onNavigate }: { store: Store; onNavigate: (v: View) => void }) {
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
  const profitRate = mRev > 0 ? Math.round(profit / mRev * 100) : 0;

  const fmt = (n: number) => '¥' + n.toLocaleString();
  const hr = new Date().getHours();
  const greeting = hr < 12 ? 'おはようございます' : hr < 18 ? 'お疲れさまです' : 'お疲れさまです';

  // Group by client
  const byClient: Record<string, typeof active> = {};
  active.forEach(t => {
    const cName = data.clients.find(c => c.id === t.clientId)?.name || '未分類';
    if (!byClient[cName]) byClient[cName] = [];
    byClient[cName].push(t);
  });

  // Upcoming deadlines (next 7 days)
  const upcoming = active
    .filter(t => t.deadline && t.deadline >= td)
    .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
    .slice(0, 5);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-teal-400/10 border border-teal-400/20 flex items-center justify-center text-base">🐤</div>
          <div>
            <div className="text-sm font-bold text-zinc-200">{greeting}</div>
            <div className="flex items-center gap-2 mt-0.5">
              {late.length > 0 && (
                <span className="text-[10px] font-bold text-red-400 bg-red-900/20 px-2 py-0.5 rounded-full">
                  ⚠ {late.length}件遅延
                </span>
              )}
              {todayDue.length > 0 && (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-900/20 px-2 py-0.5 rounded-full">
                  ⚡ 今日{todayDue.length}件
                </span>
              )}
              <span className="text-[10px] text-zinc-500">進行中 {active.length}件</span>
            </div>
          </div>
        </div>
        <div className="text-[10px] text-zinc-600 font-mono">{month.replace('-', '/')}</div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-4 gap-3">
        {/* 今月売上 — 2col相当の重みを視覚的に */}
        <div className="col-span-2 bg-zinc-900/70 border border-zinc-800/60 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-400/5 to-transparent pointer-events-none" />
          <div className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase mb-2">今月の売上</div>
          <div className="text-3xl font-black font-mono tracking-tight text-teal-400 leading-none">{fmt(mRev)}</div>
          <div className="mt-3 flex items-center gap-4 text-[10px] text-zinc-500">
            <span>利益率 <strong className={profitRate >= 30 ? 'text-emerald-400' : profitRate >= 0 ? 'text-amber-400' : 'text-red-400'}>{profitRate}%</strong></span>
            <span>外注率 <strong className={outRate > 73 ? 'text-red-400' : outRate > 50 ? 'text-amber-400' : 'text-zinc-300'}>{outRate}%</strong></span>
          </div>
        </div>

        {/* 利益 */}
        <KPICard
          label="利益"
          value={fmt(profit)}
          sub={mRev > 0 ? profitRate + '%' : '—'}
          color={profit >= 0 ? 'text-emerald-400' : 'text-red-400'}
          glow={profit >= 0 ? 'from-emerald-400/5' : 'from-red-400/5'}
        />

        {/* パイプライン */}
        <KPICard
          label="パイプライン"
          value={fmt(pipeline)}
          sub={active.length + '件進行中'}
          color="text-zinc-200"
          glow="from-zinc-400/5"
        />
      </div>

      {/* ── 2col main content ── */}
      <div className="grid grid-cols-3 gap-3">

        {/* 左: 期限タスク + 直近予定 */}
        <div className="col-span-2 space-y-3">

          {/* 期限タスク */}
          <Section
            title={late.length > 0 || todayDue.length > 0
              ? <span className="text-red-400">⚠ 期限タスク ({late.length + todayDue.length}件)</span>
              : '✓ 期限タスク'
            }
            action={<button onClick={() => onNavigate('table')} className="text-[10px] text-teal-400 hover:underline">全て →</button>}
          >
            {[...late, ...todayDue].length === 0 ? (
              <div className="text-[10px] text-zinc-500 text-center py-5">期限超過なし 🎉</div>
            ) : (
              <div className="space-y-1">
                {[...late, ...todayDue].slice(0, 5).map(t => {
                  const days = t.deadline! < td
                    ? Math.abs(Math.round((new Date(td).getTime() - new Date(t.deadline!).getTime()) / 864e5))
                    : 0;
                  const client = data.clients.find(c => c.id === t.clientId);
                  return (
                    <div key={t.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-zinc-800/30 text-xs group">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: t.deadline! < td ? '#f87171' : '#fbbf24' }} />
                      <span className="font-medium flex-1 truncate text-zinc-200">{t.title}</span>
                      <span className="text-zinc-500 text-[10px] flex-shrink-0">{client?.name || ''}</span>
                      {days > 0 && (
                        <span className="text-[9px] font-bold text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded">
                          {days}日超過
                        </span>
                      )}
                      {days === 0 && <span className="text-[9px] text-amber-400">今日</span>}
                      <span className="text-zinc-600 text-[10px] font-mono">{t.deadline?.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* 直近の締め切り */}
          {upcoming.length > 0 && (
            <Section title="📅 直近の締め切り">
              <div className="space-y-1">
                {upcoming.map(t => {
                  const client = data.clients.find(c => c.id === t.clientId);
                  const daysLeft = Math.round((new Date(t.deadline!).getTime() - new Date(td).getTime()) / 864e5);
                  return (
                    <div key={t.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/20 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0" />
                      <span className="flex-1 truncate text-zinc-300">{t.title}</span>
                      <span className="text-zinc-500 text-[10px]">{client?.name || ''}</span>
                      <span className="text-[9px] font-mono text-zinc-500">{t.deadline?.slice(5)}</span>
                      <span className={`text-[9px] font-bold ${daysLeft <= 3 ? 'text-amber-400' : 'text-zinc-500'}`}>
                        あと{daysLeft}日
                      </span>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* クイックアクション */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: '≡', label: 'タスク', nav: 'table' },
              { icon: '▦', label: 'ボード', nav: 'board' },
              { icon: '▬', label: 'ガント', nav: 'gantt' },
              { icon: '¥', label: '請求書', nav: 'invoice' },
            ] as { icon: string; label: string; nav: View }[]).map(btn => (
              <button key={btn.nav} onClick={() => onNavigate(btn.nav)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800/50 hover:border-zinc-700/60 hover:bg-zinc-800/40 transition-all text-zinc-400 hover:text-zinc-200">
                <span className="text-base font-mono">{btn.icon}</span>
                <span className="text-[9px] tracking-wide">{btn.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 右: 案件別サマリー */}
        <Section title="📂 案件別">
          {Object.keys(byClient).length === 0 ? (
            <div className="text-[10px] text-zinc-500 text-center py-8">タスクがありません</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(byClient).slice(0, 8).map(([name, tasks]) => {
                const avg = Math.round(tasks.reduce((a, t) => a + t.progress, 0) / tasks.length);
                const hasLate = tasks.some(t => t.deadline && t.deadline < td);
                const totalRev = tasks.reduce((a, t) => a + (t.revenue || 0), 0);
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasLate ? 'bg-red-400' : 'bg-emerald-400/60'}`} />
                      <span className="flex-1 truncate text-zinc-300 font-medium">{name}</span>
                      <span className="text-zinc-500 text-[10px]">{tasks.length}件</span>
                    </div>
                    <div className="flex items-center gap-2 pl-3">
                      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-teal-400/60 transition-all"
                          style={{ width: avg + '%' }} />
                      </div>
                      <span className="text-[9px] text-zinc-500 w-6 text-right">{avg}%</span>
                    </div>
                    {totalRev > 0 && (
                      <div className="pl-3 text-[9px] text-zinc-600 font-mono">
                        {fmt(totalRev)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>

      </div>
    </div>
  );
}

function KPICard({ label, value, sub, color, glow }: {
  label: string; value: string; sub: string; color: string; glow: string;
}) {
  return (
    <div className="bg-zinc-900/70 border border-zinc-800/60 rounded-xl p-4 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${glow} to-transparent pointer-events-none`} />
      <div className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase mb-2">{label}</div>
      <div className={`text-xl font-black font-mono tracking-tight leading-none ${color}`}>{value}</div>
      <div className="text-[10px] text-zinc-500 mt-2">{sub}</div>
    </div>
  );
}

function Section({ title, action, children }: {
  title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-zinc-300">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
