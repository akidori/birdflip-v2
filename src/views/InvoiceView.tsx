import { useState } from 'react';
import type { useStore } from '../store';
import type { Invoice } from '../types';

type Store = ReturnType<typeof useStore>;

// ─────────────────────────────────────────
//  PDF出力
// ─────────────────────────────────────────
function buildPDFHtml(inv: Invoice, clientName: string, co: Store['data']['company']): string {
  const sub = inv.items.reduce((a, it) => a + (it.amount || 0), 0);
  const tax = inv.taxType === 'exclusive' ? Math.round(sub * 0.1)
    : inv.taxType === 'inclusive' ? Math.round(sub - sub / 1.1) : 0;
  const total = inv.taxType === 'exclusive' ? sub + tax : sub;
  const subtotal = inv.taxType === 'inclusive' ? sub - tax : sub;
  const taxLabel = inv.taxType === 'exclusive' ? '消費税（10%）' : inv.taxType === 'inclusive' ? 'うち消費税' : '';
  const fmt = (n: number) => '¥' + n.toLocaleString();

  const rows = inv.items.map((it, i) => `
    <tr>
      <td class="r item-num">${i + 1}</td>
      <td>${escHtml(it.name)}</td>
      <td class="r">${it.qty}</td>
      <td class="r mono">${fmt(it.unitPrice)}</td>
      <td class="r mono fw6">${fmt(it.amount)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"><title>請求書 ${inv.number}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;
  background:#fff;color:#1a1a1a;font-size:11px;line-height:1.7;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;margin:0 auto}
/* ヘッダー */
.hdr{background:#0d1b2a;padding:28px 40px 24px;display:flex;justify-content:space-between;align-items:flex-end}
.hdr-logo{font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px}
.hdr-logo small{display:block;font-size:9px;font-weight:400;color:rgba(255,255,255,.4);letter-spacing:.1em;margin-top:2px}
.hdr-meta{text-align:right}
.inv-label{font-size:10px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.5);margin-bottom:3px}
.inv-number{font-size:18px;font-weight:900;color:#7ec8e3;letter-spacing:-.5px;font-family:monospace}
/* ボディ */
.body{padding:28px 40px 36px}
/* 日付行 */
.meta-row{display:flex;gap:20px;margin-bottom:24px;padding-bottom:16px;border-bottom:1px solid #e8e8e8}
.meta-item label{display:block;font-size:8px;font-weight:700;letter-spacing:.1em;color:#888;margin-bottom:2px}
.meta-item span{font-size:11px;font-weight:600;color:#1a1a1a}
/* 宛先・発行元 */
.parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}
.party-box{padding:14px 16px;border-radius:6px}
.party-box.to{background:#f7f8fa;border:1px solid #e4e6ea}
.party-box.from{background:transparent;border:1px solid #e8e8e8}
.party-label{font-size:8px;font-weight:700;letter-spacing:.12em;color:#888;margin-bottom:6px;text-transform:uppercase}
.party-name{font-size:15px;font-weight:800;color:#0d1b2a;margin-bottom:2px;letter-spacing:-.3px}
.party-sub{font-size:10px;color:#666;line-height:1.6}
.party-reg{font-size:9px;color:#999;margin-top:5px;padding-top:5px;border-top:1px solid #eee}
/* テーブル */
.items-label{font-size:9px;font-weight:700;letter-spacing:.1em;color:#888;margin-bottom:8px}
table{width:100%;border-collapse:collapse}
thead th{background:#0d1b2a;color:#fff;padding:8px 10px;font-size:9px;font-weight:700;letter-spacing:.06em;text-align:left}
thead th.r{text-align:right}
tbody td{padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:11px;vertical-align:middle}
tbody td.r{text-align:right}
tbody tr:last-child td{border-bottom:2px solid #e0e0e0}
.item-num{color:#aaa;font-size:10px;width:28px}
.mono{font-variant-numeric:tabular-nums;font-family:monospace}
.fw6{font-weight:600}
/* 合計 */
.total-section{display:flex;justify-content:flex-end;margin-top:16px}
.total-box{width:220px}
.total-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:11px;color:#555}
.total-row.sep{border-bottom:1px solid #e8e8e8;margin-bottom:2px}
.total-final{background:#0d1b2a;border-radius:5px;padding:10px 12px;margin-top:7px}
.total-final .lbl{font-size:11px;font-weight:700;color:#fff}
.total-final .amt{font-size:18px;font-weight:900;color:#7ec8e3;letter-spacing:-.5px;font-family:monospace}
/* 振込先 */
.bank{margin-top:28px;padding:14px 16px;background:#f7f8fa;border-radius:6px;border:1px solid #e4e6ea}
.bank-label{font-size:9px;font-weight:700;letter-spacing:.1em;color:#888;margin-bottom:8px}
.bank-grid{display:grid;grid-template-columns:72px 1fr;gap:3px 10px}
.bk{font-size:10px;color:#888}
.bv{font-size:10px;font-weight:600;color:#1a1a1a}
/* 備考 */
.note{margin-top:14px;font-size:10px;color:#888;padding:8px 12px;background:#fafafa;border-radius:5px;border-left:3px solid #e0e0e0}
/* フッター */
.footer{margin-top:28px;padding-top:14px;border-top:1px solid #e8e8e8;display:flex;justify-content:space-between;font-size:9px;color:#bbb}
@media print{body{background:#fff}.page{margin:0}.hdr{-webkit-print-color-adjust:exact;print-color-adjust:exact}.total-final{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="page">

<div class="hdr">
  <div class="hdr-logo">${escHtml(co.name || 'COMPANY')}<small>${escHtml(co.tel || co.email || '')}</small></div>
  <div class="hdr-meta">
    <div class="inv-label">INVOICE</div>
    <div class="inv-number">${escHtml(inv.number)}</div>
  </div>
</div>

<div class="body">
  <div class="meta-row">
    <div class="meta-item"><label>発行日</label><span>${escHtml(new Date().toISOString().split('T')[0])}</span></div>
    ${inv.dueDate ? `<div class="meta-item"><label>お支払期限</label><span>${escHtml(inv.dueDate)}</span></div>` : ''}
    ${inv.targetMonth ? `<div class="meta-item"><label>対象月</label><span>${escHtml(inv.targetMonth.replace('-', '/'))}</span></div>` : ''}
  </div>

  <div class="parties">
    <div class="party-box to">
      <div class="party-label">請求先</div>
      <div class="party-name">${escHtml(clientName)}<span style="font-size:12px;font-weight:500"> 御中</span></div>
    </div>
    <div class="party-box from">
      <div class="party-label">発行元</div>
      <div class="party-name">${escHtml(co.name || '')}</div>
      <div class="party-sub">${co.zip ? '〒' + escHtml(co.zip) + ' ' : ''}${escHtml(co.addr || '')}</div>
      ${co.tel ? `<div class="party-sub">TEL: ${escHtml(co.tel)}</div>` : ''}
      ${co.email ? `<div class="party-sub">${escHtml(co.email)}</div>` : ''}
      ${co.reg ? `<div class="party-reg">インボイス登録番号: ${escHtml(co.reg)}</div>` : ''}
    </div>
  </div>

  <div class="items-label">明細</div>
  <table>
    <thead><tr>
      <th class="r" style="width:28px">#</th>
      <th>品目・内容</th>
      <th class="r" style="width:50px">数量</th>
      <th class="r" style="width:105px">単価</th>
      <th class="r" style="width:115px">金額</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="total-section"><div class="total-box">
    <div class="total-row sep"><span>小計</span><span class="mono">${fmt(subtotal)}</span></div>
    ${taxLabel ? `<div class="total-row"><span>${taxLabel}</span><span class="mono">${fmt(tax)}</span></div>` : ''}
    <div class="total-final"><div style="display:flex;justify-content:space-between;align-items:center">
      <span class="lbl">合計金額</span><span class="amt">${fmt(total)}</span>
    </div></div>
  </div></div>

  ${(co.bank || co.aNo) ? `
  <div class="bank">
    <div class="bank-label">お振込先</div>
    <div class="bank-grid">
      ${co.bank ? `<span class="bk">銀行名</span><span class="bv">${escHtml(co.bank)}</span>` : ''}
      ${co.branch ? `<span class="bk">支店名</span><span class="bv">${escHtml(co.branch)}</span>` : ''}
      ${co.aType ? `<span class="bk">口座種別</span><span class="bv">${escHtml(co.aType)}</span>` : ''}
      ${co.aNo ? `<span class="bk">口座番号</span><span class="bv">${escHtml(co.aNo)}</span>` : ''}
      ${co.aName ? `<span class="bk">口座名義</span><span class="bv">${escHtml(co.aName)}</span>` : ''}
    </div>
  </div>` : ''}

  ${inv.note ? `<div class="note"><strong>備考:</strong> ${escHtml(inv.note)}</div>` : ''}

  <div class="footer">
    <span>${escHtml(co.name || '')}</span>
    <span>発行日: ${new Date().toISOString().split('T')[0]}</span>
  </div>
</div>

</div></body></html>`;
}

function escHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openPDFPreview(html: string) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px';

  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:8px;margin-bottom:12px';
  bar.innerHTML = `
    <button id="pdf-print" style="display:flex;align-items:center;gap:6px;padding:8px 20px;background:#7ec8e3;color:#0d1b2a;border:none;border-radius:6px;font-weight:800;cursor:pointer;font-size:13px">🖨 印刷 / PDF保存</button>
    <button id="pdf-close" style="padding:8px 16px;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:6px;cursor:pointer;font-size:13px">✕ 閉じる</button>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:820px;max-width:95vw;height:82vh;border:none;border-radius:8px;background:#fff;box-shadow:0 24px 80px rgba(0,0,0,.5)';

  overlay.appendChild(bar);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);

  bar.querySelector('#pdf-print')!.addEventListener('click', () => iframe.contentWindow?.print());
  bar.querySelector('#pdf-close')!.addEventListener('click', () => overlay.remove());

  iframe.contentDocument?.write(html);
  iframe.contentDocument?.close();
}

// ─────────────────────────────────────────
//  InvoiceView component
// ─────────────────────────────────────────
export function InvoiceView({ store }: { store: Store }) {
  const { data, addInvoice, updateInvoice, importTasksToInvoice } = store;
  const td = store.today();
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');

  const fmt = (n: number) => '¥' + n.toLocaleString();

  const calcTotals = (inv: Invoice) => {
    const sub = inv.items.reduce((a, it) => a + (it.amount || 0), 0);
    const tax = inv.taxType === 'exclusive' ? Math.round(sub * 0.1)
      : inv.taxType === 'inclusive' ? Math.round(sub - sub / 1.1) : 0;
    const total = inv.taxType === 'exclusive' ? sub + tax : sub;
    return { sub, tax, total };
  };

  const handlePDF = (inv: Invoice) => {
    const client = data.clients.find(c => c.id === inv.clientId);
    const html = buildPDFHtml(inv, client?.name || '—', data.company);
    openPDFPreview(html);
  };

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-3">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-sm font-bold text-zinc-200">📄 請求書</h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 outline-none">
            <option value="">クライアント選択</option>
            {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button
            onClick={() => { if (selectedClientId) { addInvoice(selectedClientId); setSelectedClientId(''); } }}
            disabled={!selectedClientId}
            className="bg-teal-400/10 text-teal-400 border border-teal-400/20 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-teal-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            ＋ 新規請求書
          </button>
        </div>
      </div>

      {data.invoices.length === 0 && (
        <div className="text-center py-20 text-zinc-600 text-xs">
          <div className="text-3xl mb-3 opacity-20">📄</div>
          請求書がありません
        </div>
      )}

      {data.invoices.map(inv => {
        const client = data.clients.find(c => c.id === inv.clientId);
        const { sub, tax, total } = calcTotals(inv);
        const isLate = inv.dueDate && inv.dueDate < td && !inv.paid;
        const isOpen = openId === inv.id;

        const borderColor = inv.paid
          ? 'border-emerald-800/30'
          : isLate ? 'border-red-800/40'
          : 'border-zinc-800/50';

        return (
          <div key={inv.id} className={`border rounded-xl overflow-hidden ${borderColor} bg-zinc-900/40`}>

            {/* ── 一覧行 ── */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-zinc-800/20 transition-colors"
              onClick={() => setOpenId(isOpen ? null : inv.id)}>
              <span className="text-xs font-mono font-bold text-teal-400 flex-shrink-0">{inv.number}</span>
              <span className="text-xs text-zinc-300 flex-shrink-0">{client?.name || '—'}</span>
              {inv.targetMonth && (
                <span className="text-[9px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                  {inv.targetMonth.replace('-', '/')}
                </span>
              )}
              {inv.paid && <span className="text-[9px] px-1.5 py-0.5 bg-emerald-900/40 text-emerald-400 rounded">入金済</span>}
              {isLate && <span className="text-[9px] px-1.5 py-0.5 bg-red-900/40 text-red-400 rounded">期限超過</span>}
              <div className="flex-1" />
              <span className="font-mono font-bold text-sm text-teal-400">{fmt(total)}</span>
              <span className="text-zinc-600 text-xs">{isOpen ? '▴' : '▾'}</span>
            </div>

            {/* ── 詳細 ── */}
            {isOpen && (
              <div className="border-t border-zinc-800/30 px-4 py-4 space-y-4">

                {/* 設定行 */}
                <div className="grid grid-cols-5 gap-2">
                  <InvField label="請求書番号" value={inv.number} onChange={v => updateInvoice(inv.id, { number: v })} mono />
                  <div>
                    <label className="text-[9px] text-zinc-500 block mb-1">宛先</label>
                    <select value={inv.clientId}
                      onChange={e => updateInvoice(inv.id, { clientId: e.target.value })}
                      className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded-lg px-2 py-1.5 text-xs outline-none text-zinc-300">
                      {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 block mb-1">対象月</label>
                    <input type="month" value={inv.targetMonth}
                      onChange={e => updateInvoice(inv.id, { targetMonth: e.target.value })}
                      className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded-lg px-2 py-1.5 text-xs outline-none text-zinc-300" />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 block mb-1">支払期限</label>
                    <input type="date" value={inv.dueDate}
                      onChange={e => updateInvoice(inv.id, { dueDate: e.target.value })}
                      className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded-lg px-2 py-1.5 text-xs outline-none text-zinc-300" />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 block mb-1">税区分</label>
                    <select value={inv.taxType}
                      onChange={e => updateInvoice(inv.id, { taxType: e.target.value as Invoice['taxType'] })}
                      className="w-full bg-zinc-800/50 border border-zinc-700/40 rounded-lg px-2 py-1.5 text-xs outline-none text-zinc-300">
                      <option value="exclusive">税別(+10%)</option>
                      <option value="inclusive">税込(内税)</option>
                      <option value="none">非課税</option>
                    </select>
                  </div>
                </div>

                {/* 明細テーブル */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-zinc-500 border-b border-zinc-800/40">
                      <th className="text-left pb-1.5 w-7">#</th>
                      <th className="text-left pb-1.5">品目</th>
                      <th className="text-right pb-1.5 w-14">数量</th>
                      <th className="text-right pb-1.5 w-24">単価</th>
                      <th className="text-right pb-1.5 w-24">金額</th>
                      <th className="w-6"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {inv.items.map((it, li) => (
                      <tr key={li} className="border-b border-zinc-800/20 group">
                        <td className="py-1.5 text-zinc-600">{li + 1}</td>
                        <td>
                          <input value={it.name}
                            onChange={e => {
                              const items = [...inv.items]; items[li] = { ...items[li], name: e.target.value };
                              updateInvoice(inv.id, { items });
                            }}
                            className="bg-transparent outline-none w-full text-zinc-300 focus:bg-zinc-800/30 rounded px-1 py-0.5" />
                        </td>
                        <td className="text-right">
                          <input type="number" value={it.qty}
                            onChange={e => {
                              const items = [...inv.items]; const q = Number(e.target.value) || 1;
                              items[li] = { ...items[li], qty: q, amount: q * items[li].unitPrice };
                              updateInvoice(inv.id, { items });
                            }}
                            className="bg-transparent outline-none w-12 text-right font-mono text-zinc-400" />
                        </td>
                        <td className="text-right">
                          <input type="number" value={it.unitPrice}
                            onChange={e => {
                              const items = [...inv.items]; const p = Number(e.target.value) || 0;
                              items[li] = { ...items[li], unitPrice: p, amount: items[li].qty * p };
                              updateInvoice(inv.id, { items });
                            }}
                            className="bg-transparent outline-none w-20 text-right font-mono text-zinc-400" />
                        </td>
                        <td className="text-right font-mono font-semibold text-zinc-300">{fmt(it.amount)}</td>
                        <td>
                          <button onClick={() => {
                            const items = inv.items.filter((_, j) => j !== li);
                            updateInvoice(inv.id, { items });
                          }} className="text-zinc-700 hover:text-red-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const items = [...inv.items, { taskId: '', name: '', qty: 1, unitPrice: 0, amount: 0 }];
                      updateInvoice(inv.id, { items });
                    }}
                    className="text-[10px] text-teal-400 border border-dashed border-zinc-700 rounded-lg px-3 py-1.5 hover:border-teal-400/40 transition-colors">
                    ＋ 明細追加
                  </button>
                  <button
                    onClick={() => importTasksToInvoice(inv.id)}
                    className="text-[10px] text-zinc-400 border border-dashed border-zinc-700 rounded-lg px-3 py-1.5 hover:border-zinc-600 transition-colors">
                    📋 {inv.targetMonth?.replace('-', '/')}のタスクから取込
                  </button>
                </div>

                {/* 合計 */}
                <div className="flex justify-end">
                  <div className="w-56 space-y-0.5 bg-zinc-800/30 rounded-xl p-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">小計</span>
                      <span className="font-mono">{fmt(inv.taxType === 'inclusive' ? sub - tax : sub)}</span>
                    </div>
                    {inv.taxType !== 'none' && (
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-500">
                          {inv.taxType === 'exclusive' ? '消費税(10%)' : 'うち消費税'}
                        </span>
                        <span className="font-mono">{fmt(tax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold border-t border-zinc-700/40 pt-2 mt-1">
                      <span className="text-teal-400">合計</span>
                      <span className="font-mono text-teal-400">{fmt(total)}</span>
                    </div>
                  </div>
                </div>

                {/* アクション */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handlePDF(inv)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-teal-400/10 text-teal-400 border border-teal-400/20 hover:bg-teal-400/20 transition-colors font-medium">
                    🖨 PDF出力
                  </button>
                  <button
                    onClick={() => updateInvoice(inv.id, { paid: !inv.paid, paidAt: inv.paid ? '' : td })}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${inv.paid
                      ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                      : 'bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900/30'}`}>
                    {inv.paid ? '❌ 未入金に戻す' : '✅ 入金済にする'}
                  </button>
                  <div className="flex-1" />
                  <div>
                    <input
                      value={inv.note || ''}
                      onChange={e => updateInvoice(inv.id, { note: e.target.value })}
                      placeholder="備考"
                      className="bg-zinc-800/40 border border-zinc-700/40 rounded-lg px-2.5 py-1.5 text-xs outline-none text-zinc-400 placeholder-zinc-600 w-40" />
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('この請求書を削除しますか？'))
                        store.update(d => { d.invoices = d.invoices.filter(x => x.id !== inv.id); });
                    }}
                    className="text-xs px-2.5 py-1.5 rounded-lg text-red-500/60 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                    🗑
                  </button>
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InvField({ label, value, onChange, mono }: {
  label: string; value: string; onChange: (v: string) => void; mono?: boolean;
}) {
  return (
    <div>
      <label className="text-[9px] text-zinc-500 block mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)}
        className={`w-full bg-zinc-800/50 border border-zinc-700/40 rounded-lg px-2 py-1.5 text-xs outline-none text-zinc-300 ${mono ? 'font-mono' : ''}`} />
    </div>
  );
}
