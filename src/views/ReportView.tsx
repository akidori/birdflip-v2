import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

export function ReportView({ store }: { store: Store }) {
  const { data } = store;
  const fmt = (n: number) => '¥' + n.toLocaleString();

  // 過去6ヶ月のデータ生成
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.now() + 9 * 3600000);
    d.setMonth(d.getMonth() - i);
    months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }

  const monthlyData = months.map(m => {
    const done = data.tasks.filter(t => t.status === 'done' && (t.completedAt || t.deadline || '').startsWith(m));
    const rev = done.reduce((a, t) => a + (t.revenue || 0), 0);
    const out = done.reduce((a, t) => a + (t.outsourceCost || 0), 0);
    const profit = rev - out;
    const inv = data.invoices.filter(i => i.targetMonth === m);
    const billed = inv.reduce((a, i) => {
      const sub = i.items.reduce((s, it) => s + (it.amount || 0), 0);
      return a + (i.taxType === 'exclusive' ? sub * 1.1 : sub);
    }, 0);
    const paid = inv.filter(i => i.paid).reduce((a, i) => {
      const sub = i.items.reduce((s, it) => s + (it.amount || 0), 0);
      return a + (i.taxType === 'exclusive' ? sub * 1.1 : sub);
    }, 0);
    return { m, rev, out, profit, billed: Math.round(billed), paid: Math.round(paid), count: done.length };
  });

  const maxRev = Math.max(...monthlyData.map(d => d.rev), 1);
  const currentMonth = store.thisMonth();
  const current = monthlyData.find(d => d.m === currentMonth) || { rev: 0, out: 0, profit: 0, count: 0, billed: 0, paid: 0, m: currentMonth };
  const prev = monthlyData[monthlyData.length - 2];
  const profitRate = current.rev > 0 ? Math.round(current.profit / current.rev * 100) : 0;
  const outRate = current.rev > 0 ? Math.round(current.out / current.rev * 100) : 0;
  const revDiff = prev?.rev > 0 ? Math.round((current.rev - prev.rev) / prev.rev * 100) : 0;

  // 案件別売上
  const clientRevenue = data.clients.map(c => {
    const tasks = data.tasks.filter(t => t.clientId === c.id && t.status === 'done');
    const rev = tasks.reduce((a, t) => a + (t.revenue || 0), 0);
    const out = tasks.reduce((a, t) => a + (t.outsourceCost || 0), 0);
    return { ...c, rev, out, profit: rev - out, count: tasks.length };
  }).filter(c => c.rev > 0).sort((a, b) => b.rev - a.rev);

  const totalRev = data.tasks.filter(t => t.status === 'done').reduce((a, t) => a + (t.revenue || 0), 0);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-5">
      <h1 className="text-sm font-bold text-zinc-200">📊 売上レポート</h1>

      {/* 今月KPI */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '今月売上', value: fmt(current.rev), sub: revDiff !== 0 ? `先月比 ${revDiff > 0 ? '+' : ''}${revDiff}%` : '—', color: 'text-teal-400' },
          { label: '今月利益', value: fmt(current.profit), sub: `利益率 ${profitRate}%`, color: current.profit >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: '外注費', value: fmt(current.out), sub: `売上比 ${outRate}%`, color: outRate > 70 ? 'text-red-400' : 'text-amber-400' },
          { label: '完了タスク', value: `${current.count}件`, sub: `請求 ${fmt(current.billed)}`, color: 'text-zinc-200' },
        ].map(card => (
          <div key={card.label} className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4">
            <div className="text-[9px] text-zinc-500 font-bold tracking-widest uppercase mb-2">{card.label}</div>
            <div className={`text-xl font-black font-mono leading-none ${card.color}`}>{card.value}</div>
            <div className="text-[10px] text-zinc-500 mt-1.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* 月別グラフ */}
      <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4">
        <div className="text-xs font-bold text-zinc-300 mb-4">月別売上・利益</div>
        <div className="flex items-end gap-2 h-32">
          {monthlyData.map(d => {
            const revH = maxRev > 0 ? Math.round(d.rev / maxRev * 112) : 0;
            const profH = maxRev > 0 ? Math.round(Math.max(0, d.profit) / maxRev * 112) : 0;
            const isCurrent = d.m === currentMonth;
            return (
              <div key={d.m} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[9px] text-zinc-500 font-mono">
                  {d.rev > 0 ? (d.rev >= 1000000 ? Math.round(d.rev / 10000) + '万' : Math.round(d.rev / 1000) + 'k') : ''}
                </div>
                <div className="relative w-full flex items-end justify-center gap-0.5" style={{ height: 112 }}>
                  {/* 売上バー */}
                  <div className="flex-1 rounded-t-sm transition-all"
                    style={{ height: revH, background: isCurrent ? '#2dd4bf60' : '#2dd4bf25', minHeight: revH > 0 ? 2 : 0 }} />
                  {/* 利益バー */}
                  <div className="flex-1 rounded-t-sm transition-all"
                    style={{ height: profH, background: isCurrent ? '#34d39970' : '#34d39930', minHeight: profH > 0 ? 2 : 0 }} />
                </div>
                <div className={`text-[9px] font-mono ${isCurrent ? 'text-teal-400 font-bold' : 'text-zinc-600'}`}>
                  {d.m.slice(5)}月
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2 text-[9px] text-zinc-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-teal-400/40" />売上</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-400/40" />利益</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 案件別売上 */}
        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4">
          <div className="text-xs font-bold text-zinc-300 mb-3">案件別売上（累計）</div>
          {clientRevenue.length === 0 ? (
            <div className="text-[10px] text-zinc-600 text-center py-6">完了タスクがありません</div>
          ) : (
            <div className="space-y-2.5">
              {clientRevenue.slice(0, 8).map((c, i) => {
                const share = totalRev > 0 ? Math.round(c.rev / totalRev * 100) : 0;
                return (
                  <div key={c.id}>
                    <div className="flex items-center gap-2 text-[11px] mb-1">
                      <span className="text-zinc-500 w-4 font-mono">{i + 1}</span>
                      <span className="flex-1 truncate text-zinc-300">{c.name}</span>
                      <span className="text-zinc-500 text-[10px]">{c.count}件</span>
                      <span className="font-mono text-teal-400">{fmt(c.rev)}</span>
                    </div>
                    <div className="ml-6 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-400/50 rounded-full" style={{ width: share + '%' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* P/L サマリー */}
        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4">
          <div className="text-xs font-bold text-zinc-300 mb-3">P/L サマリー（全期間）</div>
          {(() => {
            const allDone = data.tasks.filter(t => t.status === 'done');
            const totalOut = allDone.reduce((a, t) => a + (t.outsourceCost || 0), 0);
            const totalProfit = totalRev - totalOut;
            const totalProfitRate = totalRev > 0 ? Math.round(totalProfit / totalRev * 100) : 0;
            const totalOutRate = totalRev > 0 ? Math.round(totalOut / totalRev * 100) : 0;
            const unpaid = data.invoices.filter(i => !i.paid).reduce((a, i) => {
              const sub = i.items.reduce((s, it) => s + (it.amount || 0), 0);
              return a + (i.taxType === 'exclusive' ? Math.round(sub * 1.1) : sub);
            }, 0);
            return (
              <div className="space-y-2">
                {[
                  { label: '累計売上', value: fmt(totalRev), color: 'text-teal-400' },
                  { label: '累計外注費', value: fmt(totalOut), sub: totalOutRate + '%', color: 'text-zinc-300' },
                  { label: '累計利益', value: fmt(totalProfit), sub: totalProfitRate + '%', color: totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
                  { label: '未回収', value: fmt(unpaid), sub: data.invoices.filter(i => !i.paid).length + '件', color: unpaid > 0 ? 'text-amber-400' : 'text-zinc-600' },
                  { label: '完了タスク', value: allDone.length + '件', color: 'text-zinc-300' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-zinc-800/30 last:border-0">
                    <span className="text-[10px] text-zinc-500">{row.label}</span>
                    <div className="text-right">
                      <span className={`text-xs font-mono font-bold ${row.color}`}>{row.value}</span>
                      {row.sub && <span className="text-[9px] text-zinc-600 ml-1.5">{row.sub}</span>}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      {/* 月次詳細テーブル */}
      <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800/40">
          <div className="text-xs font-bold text-zinc-300">月次詳細</div>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] text-zinc-500 border-b border-zinc-800/30">
              <th className="text-left px-4 py-2">月</th>
              <th className="text-right px-3 py-2">売上</th>
              <th className="text-right px-3 py-2">外注費</th>
              <th className="text-right px-3 py-2">利益</th>
              <th className="text-right px-3 py-2">利益率</th>
              <th className="text-right px-3 py-2">請求</th>
              <th className="text-right px-3 py-2">入金</th>
              <th className="text-right px-3 py-2">完了</th>
            </tr>
          </thead>
          <tbody>
            {[...monthlyData].reverse().map(d => {
              const rate = d.rev > 0 ? Math.round(d.profit / d.rev * 100) : 0;
              const isCurrent = d.m === currentMonth;
              return (
                <tr key={d.m} className={`border-b border-zinc-800/20 ${isCurrent ? 'bg-teal-400/5' : 'hover:bg-zinc-800/10'}`}>
                  <td className={`px-4 py-2 font-mono ${isCurrent ? 'text-teal-400 font-bold' : 'text-zinc-400'}`}>
                    {d.m.replace('-', '/')}
                    {isCurrent && <span className="ml-1 text-[9px]">●</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{d.rev > 0 ? fmt(d.rev) : '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">{d.out > 0 ? fmt(d.out) : '—'}</td>
                  <td className={`px-3 py-2 text-right font-mono font-bold ${d.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {d.rev > 0 ? fmt(d.profit) : '—'}
                  </td>
                  <td className={`px-3 py-2 text-right text-[11px] ${rate >= 30 ? 'text-emerald-400' : rate >= 0 ? 'text-zinc-400' : 'text-red-400'}`}>
                    {d.rev > 0 ? rate + '%' : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">{d.billed > 0 ? fmt(d.billed) : '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">{d.paid > 0 ? fmt(d.paid) : '—'}</td>
                  <td className="px-3 py-2 text-right text-zinc-500">{d.count > 0 ? d.count + '件' : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
