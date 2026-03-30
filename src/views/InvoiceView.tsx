import { useState } from 'react';
import type { useStore } from '../store';
import type { Invoice } from '../types';

type Store = ReturnType<typeof useStore>;

export function InvoiceView({ store }: { store: Store }) {
  const { data, addInvoice, updateInvoice, importTasksToInvoice } = store;
  const td = store.today();
  const [openId, setOpenId] = useState<string | null>(null);

  const fmt = (n: number) => '¥' + n.toLocaleString();

  const calcTotals = (inv: Invoice) => {
    const sub = inv.items.reduce((a, it) => a + (it.amount || 0), 0);
    const tax = inv.taxType === 'exclusive' ? Math.round(sub * 0.1) : inv.taxType === 'inclusive' ? Math.round(sub - sub / 1.1) : 0;
    const total = inv.taxType === 'exclusive' ? sub + tax : sub;
    return { sub, tax, total };
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-bold text-teal-400">📄 請求書</h1>
        <div className="flex gap-2">
          <select id="inv-client" className="bg-zinc-800/50 border border-zinc-700/50 rounded px-2 py-1 text-xs text-zinc-300 outline-none">
            {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => {
            const sel = (document.getElementById('inv-client') as HTMLSelectElement)?.value;
            if (sel) addInvoice(sel);
          }} className="bg-teal-400/10 text-teal-400 text-xs font-medium px-3 py-1.5 rounded hover:bg-teal-400/20">+ 新規</button>
        </div>
      </div>

      {data.invoices.length === 0 && (
        <div className="text-center py-16 text-zinc-500 text-xs">請求書がありません</div>
      )}

      {data.invoices.map(inv => {
        const client = data.clients.find(c => c.id === inv.clientId);
        const { sub, tax, total } = calcTotals(inv);
        const isLate = inv.dueDate && inv.dueDate < td && !inv.paid;
        const isOpen = openId === inv.id;

        return (
          <div key={inv.id} className={`border rounded-lg overflow-hidden ${inv.paid ? 'border-emerald-800/30' : isLate ? 'border-red-800/40' : 'border-zinc-800/50'}`}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/40 cursor-pointer hover:bg-zinc-800/30"
              onClick={() => setOpenId(isOpen ? null : inv.id)}>
              <span className="text-xs font-mono font-bold text-teal-400">{inv.number}</span>
              <span className="text-xs text-zinc-300">{client?.name || '—'}</span>
              {inv.targetMonth && <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">{inv.targetMonth.replace('-','/')}</span>}
              {inv.paid && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-900/50 text-emerald-400 rounded">入金済</span>}
              {isLate && <span className="text-[9px] px-1.5 py-0.5 bg-red-900/50 text-red-400 rounded">期限超過</span>}
              <div className="flex-1" />
              <span className="font-mono font-bold text-sm text-teal-400">{fmt(total)}</span>
              <span className="text-zinc-500 text-xs">{isOpen ? '▴' : '▾'}</span>
            </div>

            {/* Detail */}
            {isOpen && (
              <div className="px-4 py-3 border-t border-zinc-800/30 space-y-3">
                {/* Settings */}
                <div className="grid grid-cols-5 gap-2">
                  <Field label="番号" value={inv.number} onChange={v => updateInvoice(inv.id, { number: v })} />
                  <div>
                    <label className="text-[9px] text-zinc-500 block mb-0.5">宛先</label>
                    <select value={inv.clientId} onChange={e => updateInvoice(inv.id, { clientId: e.target.value })}
                      className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded px-2 py-1.5 text-xs outline-none text-zinc-300">
                      {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 block mb-0.5">対象月</label>
                    <input type="month" value={inv.targetMonth} onChange={e => updateInvoice(inv.id, { targetMonth: e.target.value })}
                      className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded px-2 py-1.5 text-xs outline-none text-zinc-300" />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 block mb-0.5">支払期限</label>
                    <input type="date" value={inv.dueDate} onChange={e => updateInvoice(inv.id, { dueDate: e.target.value })}
                      className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded px-2 py-1.5 text-xs outline-none text-zinc-300" />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 block mb-0.5">税区分</label>
                    <select value={inv.taxType} onChange={e => updateInvoice(inv.id, { taxType: e.target.value as Invoice['taxType'] })}
                      className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded px-2 py-1.5 text-xs outline-none text-zinc-300">
                      <option value="exclusive">税別(+10%)</option>
                      <option value="inclusive">税込(内税)</option>
                      <option value="none">非課税</option>
                    </select>
                  </div>
                </div>

                {/* Items */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-zinc-500 border-b border-zinc-800/30">
                      <th className="text-left py-1 w-8">#</th>
                      <th className="text-left py-1">品目</th>
                      <th className="text-right py-1 w-16">数量</th>
                      <th className="text-right py-1 w-24">単価</th>
                      <th className="text-right py-1 w-24">金額</th>
                      <th className="w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((it, li) => (
                      <tr key={li} className="border-b border-zinc-800/20">
                        <td className="py-1 text-zinc-600">{li + 1}</td>
                        <td><input value={it.name} onChange={e => {
                          const items = [...inv.items]; items[li] = {...items[li], name: e.target.value};
                          updateInvoice(inv.id, { items });
                        }} className="bg-transparent outline-none w-full text-zinc-300 focus:bg-zinc-800/30 rounded px-1" /></td>
                        <td className="text-right"><input type="number" value={it.qty} onChange={e => {
                          const items = [...inv.items]; const q = Number(e.target.value) || 1;
                          items[li] = {...items[li], qty: q, amount: q * items[li].unitPrice};
                          updateInvoice(inv.id, { items });
                        }} className="bg-transparent outline-none w-12 text-right font-mono text-zinc-400" /></td>
                        <td className="text-right"><input type="number" value={it.unitPrice} onChange={e => {
                          const items = [...inv.items]; const p = Number(e.target.value) || 0;
                          items[li] = {...items[li], unitPrice: p, amount: items[li].qty * p};
                          updateInvoice(inv.id, { items });
                        }} className="bg-transparent outline-none w-20 text-right font-mono text-zinc-400" /></td>
                        <td className="text-right font-mono font-medium text-zinc-300">{fmt(it.amount)}</td>
                        <td><button onClick={() => {
                          const items = inv.items.filter((_, j) => j !== li);
                          updateInvoice(inv.id, { items });
                        }} className="text-zinc-600 hover:text-red-400 text-[10px]">✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex gap-2">
                  <button onClick={() => {
                    const items = [...inv.items, { taskId: '', name: '', qty: 1, unitPrice: 0, amount: 0 }];
                    updateInvoice(inv.id, { items });
                  }} className="text-[10px] text-teal-400 border border-dashed border-zinc-700 rounded px-3 py-1 hover:border-teal-400/40">+ 明細追加</button>
                  <button onClick={() => importTasksToInvoice(inv.id)}
                    className="text-[10px] text-zinc-400 border border-dashed border-zinc-700 rounded px-3 py-1 hover:border-zinc-500">
                    📋 {inv.targetMonth?.replace('-','/')}のタスクから取込
                  </button>
                </div>

                {/* Totals */}
                <div className="text-right space-y-0.5 bg-zinc-800/20 rounded p-3">
                  <div className="flex justify-between text-xs"><span className="text-zinc-500">小計</span><span className="font-mono">{fmt(inv.taxType === 'inclusive' ? sub - tax : sub)}</span></div>
                  {inv.taxType !== 'none' && <div className="flex justify-between text-xs"><span className="text-zinc-500">{inv.taxType === 'exclusive' ? '消費税(10%)' : 'うち消費税'}</span><span className="font-mono">{fmt(tax)}</span></div>}
                  <div className="flex justify-between text-sm font-bold border-t border-zinc-700/40 pt-1 mt-1"><span className="text-teal-400">合計</span><span className="font-mono text-teal-400">{fmt(total)}</span></div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => updateInvoice(inv.id, { paid: !inv.paid, paidAt: inv.paid ? '' : td })}
                    className={`text-xs px-3 py-1.5 rounded ${inv.paid ? 'bg-zinc-800 text-zinc-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                    {inv.paid ? '❌ 未入金に戻す' : '✅ 入金済にする'}
                  </button>
                  <button onClick={() => {
                    if (confirm('削除？')) store.update(d => { d.invoices = d.invoices.filter(x => x.id !== inv.id); });
                  }} className="text-xs px-3 py-1.5 rounded bg-zinc-800 text-red-400 hover:bg-red-900/20">🗑</button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[9px] text-zinc-500 block mb-0.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded px-2 py-1.5 text-xs outline-none text-zinc-300 font-mono" />
    </div>
  );
}
