import { useState, useCallback } from 'react';
import type { useStore } from '../store';
import type { Invoice } from '../types';

type Store = ReturnType<typeof useStore>;

// ─── escapeHTML ───────────────────────────────────
function escHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── PDF builder ─────────────────────────────────
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
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700;900&family=Space+Mono:wght@400;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans JP','Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;
  background:#fff;color:#1a1a1a;font-size:11px;line-height:1.7;
  -webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;margin:0 auto}
.hdr{background:#080a0c;padding:28px 40px 24px;display:flex;justify-content:space-between;align-items:flex-end}
.hdr-logo{font-size:20px;font-weight:900;color:#fff;letter-spacing:-0.5px;font-family:'Space Mono',monospace}
.hdr-logo small{display:block;font-size:9px;font-weight:400;color:rgba(255,255,255,.4);letter-spacing:.15em;margin-top:2px}
.hdr-meta{text-align:right}
.inv-label{font-size:10px;font-weight:700;letter-spacing:.2em;color:rgba(255,255,255,.4);margin-bottom:3px;font-family:'Space Mono',monospace}
.inv-number{font-size:18px;font-weight:700;color:#4af4c8;letter-spacing:-.5px;font-family:'Space Mono',monospace}
.body{padding:28px 40px 36px}
.meta-row{display:flex;gap:20px;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #f0f0f0}
.meta-item label{display:block;font-size:8px;font-weight:700;letter-spacing:.15em;color:#999;margin-bottom:2px;font-family:'Space Mono',monospace}
.meta-item span{font-size:11px;font-weight:600;color:#1a1a1a}
.billing{display:flex;justify-content:space-between;margin-bottom:24px}
.to-section .to-name{font-size:20px;font-weight:700;color:#111}
.to-section .to-name small{font-size:11px;font-weight:400;margin-left:4px}
.from-section{text-align:right;font-size:10px;color:#444}
.from-section .co-name{font-size:13px;font-weight:700;color:#111;margin-bottom:4px}
.amount-box{background:#f8f8f8;border-left:3px solid #4af4c8;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;border-radius:0 6px 6px 0}
.amount-box .label{font-size:10px;font-weight:700;letter-spacing:.1em;color:#666;font-family:'Space Mono',monospace}
.amount-box .val{font-size:28px;font-weight:900;color:#111;font-family:'Space Mono',monospace;letter-spacing:-1px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
thead tr{background:#111;color:#fff}
th{padding:9px 12px;text-align:left;font-size:9px;font-weight:700;letter-spacing:.15em;font-family:'Space Mono',monospace}
th.r{text-align:right}
td{padding:9px 12px;border-bottom:1px solid #f0f0f0}
td.r{text-align:right}
td.item-num{color:#999;font-size:10px}
.mono{font-family:'Space Mono',monospace}
.fw6{font-weight:600}
.totals{display:flex;justify-content:flex-end}
.totals-box{width:220px}
.totals-row{display:flex;justify-content:space-between;padding:4px 0;font-size:11px}
.totals-row.total{border-top:2px solid #111;padding-top:10px;margin-top:4px;font-size:14px;font-weight:900;font-family:'Space Mono',monospace}
.note-box{margin-top:24px;padding:12px 16px;background:#f8f8f8;border-radius:6px;font-size:10px;color:#555}
.note-box h4{font-size:9px;font-weight:700;letter-spacing:.15em;color:#999;margin-bottom:6px;font-family:'Space Mono',monospace}
@media print{.page{margin:0}.hdr{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head><body>
<div class="page">
  <div class="hdr">
    <div class="hdr-logo">${escHtml(co.name || 'BIRD FLIP INC.')}<small>${escHtml(co.nameEn || 'BIRD FLIP INC.')}</small></div>
    <div class="hdr-meta"><div class="inv-label">INVOICE</div><div class="inv-number">${escHtml(inv.number)}</div></div>
  </div>
  <div class="body">
    <div class="meta-row">
      ${inv.issueDate ? `<div class="meta-item"><label>ISSUE DATE</label><span>${escHtml(inv.issueDate)}</span></div>` : ''}
      ${inv.dueDate ? `<div class="meta-item"><label>DUE DATE</label><span>${escHtml(inv.dueDate)}</span></div>` : ''}
      ${inv.targetMonth ? `<div class="meta-item"><label>TARGET PERIOD</label><span>${escHtml(inv.targetMonth.replace('-', '/'))}</span></div>` : ''}
    </div>
    <div class="billing">
      <div class="to-section">
        <div style="font-size:9px;font-weight:700;letter-spacing:.15em;color:#999;margin-bottom:6px;font-family:'Space Mono',monospace">BILL TO</div>
        <div class="to-name">${escHtml(clientName)}<small>御中</small></div>
      </div>
      <div class="from-section">
        <div class="co-name">${escHtml(co.name || '')}</div>
        ${co.address ? `<div>${escHtml(co.address)}</div>` : ''}
        ${co.tel ? `<div>TEL: ${escHtml(co.tel)}</div>` : ''}
        ${co.email ? `<div>${escHtml(co.email)}</div>` : ''}
        ${co.bankInfo ? `<div style="margin-top:6px;white-space:pre-line;font-size:9px">${escHtml(co.bankInfo)}</div>` : ''}
      </div>
    </div>
    <div class="amount-box">
      <div class="label">TOTAL AMOUNT</div>
      <div class="val">${fmt(total)}</div>
    </div>
    <table>
      <thead><tr>
        <th style="width:36px">#</th>
        <th>品目 / DESCRIPTION</th>
        <th class="r" style="width:52px">数量</th>
        <th class="r" style="width:110px">単価</th>
        <th class="r" style="width:110px">金額</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row"><span>小計</span><span class="mono">${fmt(inv.taxType === 'inclusive' ? subtotal : sub)}</span></div>
        ${taxLabel ? `<div class="totals-row"><span>${taxLabel}</span><span class="mono">${fmt(tax)}</span></div>` : ''}
        <div class="totals-row total"><span>合計</span><span>${fmt(total)}</span></div>
      </div>
    </div>
    ${inv.note ? `<div class="note-box"><h4>NOTES / 備考</h4><div>${escHtml(inv.note)}</div></div>` : ''}
  </div>
</div>
</body></html>`;
}

function openPDFPreview(html: string) {
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

// ─────────────────────────────────────────────────
//  InvoiceView
// ─────────────────────────────────────────────────
export function InvoiceView({ store }: { store: Store }) {
  const { data, addInvoice, updateInvoice, importTasksToInvoice } = store;
  const td = store.today();
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [importedId, setImportedId] = useState<string | null>(null);

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
    openPDFPreview(buildPDFHtml(inv, client?.name || '—', data.company));
  };

  // タスク取込 + フィードバック
  const handleImport = (invId: string) => {
    importTasksToInvoice(invId);
    setImportedId(invId);
    setTimeout(() => setImportedId(null), 2000);
  };

  // 取込可能タスク数を計算（プレビュー）
  const countImportable = (inv: Invoice) => {
    return data.tasks.filter(t => {
      if (t.status !== 'done') return false;
      if (t.clientId !== inv.clientId) return false;
      const dateStr = t.completedAt || t.deadline || t.createdAt || '';
      if (!dateStr) return true;
      return dateStr.startsWith(inv.targetMonth);
    }).filter(t => !inv.items.some(it => it.taskId === t.id)).length;
  };

  return (
    <div style={{ padding:'24px', maxWidth:920, margin:'0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', letterSpacing:'0.2em', marginBottom:4 }}>
            INVOICE MANAGEMENT
          </div>
          <div style={{ fontFamily:'var(--head)', fontSize:20, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px' }}>
            請求書
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <select
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
            style={{ padding:'8px 12px', fontSize:11, width:160 }}>
            <option value="">クライアントを選択</option>
            {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="btn-accent"
            onClick={() => { if (selectedClientId) { addInvoice(selectedClientId); setSelectedClientId(''); } }}
            disabled={!selectedClientId}
            style={{ opacity: selectedClientId ? 1 : 0.4, cursor: selectedClientId ? 'pointer' : 'not-allowed' }}>
            ＋ 新規作成
          </button>
        </div>
      </div>

      {/* ── EMPTY ── */}
      {data.invoices.length === 0 && (
        <div style={{ textAlign:'center', padding:'80px 0', color:'var(--text3)' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:32, marginBottom:12, opacity:0.15 }}>¥</div>
          <div style={{ fontSize:12, fontFamily:'var(--mono)', letterSpacing:'0.1em' }}>NO INVOICES</div>
          <div style={{ fontSize:11, marginTop:6 }}>クライアントを選択して新規作成してください</div>
        </div>
      )}

      {/* ── LIST ── */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {data.invoices.map(inv => {
          const client = data.clients.find(c => c.id === inv.clientId);
          const { sub, tax, total } = calcTotals(inv);
          const isLate = inv.dueDate && inv.dueDate < td && !inv.paid;
          const isOpen = openId === inv.id;
          const importable = countImportable(inv);
          const justImported = importedId === inv.id;

          return (
            <div key={inv.id} style={{
              background: 'var(--surface)',
              border: `1px solid ${inv.paid ? 'rgba(34,197,94,0.2)' : isLate ? 'rgba(255,77,109,0.25)' : 'var(--border)'}`,
              borderRadius: 10,
              overflow: 'hidden',
              transition: 'border-color 0.15s',
            }}>
              {/* ── ROW ── */}
              <div className="inv-row" onClick={() => setOpenId(isOpen ? null : inv.id)}>
                {/* Status bar */}
                <div style={{ width:3, height:36, borderRadius:2, background: inv.paid ? '#22c55e' : isLate ? 'var(--red)' : 'var(--border2)', flexShrink:0 }} />

                {/* Number */}
                <div style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:700, color:'var(--accent)', minWidth:120 }}>
                  {inv.number}
                </div>

                {/* Client */}
                <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', minWidth:100 }}>
                  {client?.name || '—'}
                </div>

                {/* Month */}
                {inv.targetMonth && (
                  <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:4, padding:'2px 8px' }}>
                    {inv.targetMonth.replace('-', '/')}
                  </div>
                )}

                {/* Items count */}
                <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--mono)' }}>
                  {inv.items.length}件
                </div>

                {/* Status badge */}
                {inv.paid && (
                  <span className="tag" style={{ background:'rgba(34,197,94,0.1)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.2)' }}>
                    PAID
                  </span>
                )}
                {isLate && !inv.paid && (
                  <span className="tag" style={{ background:'rgba(255,77,109,0.1)', color:'var(--red)', border:'1px solid rgba(255,77,109,0.2)' }}>
                    OVERDUE
                  </span>
                )}
                {importable > 0 && !inv.paid && (
                  <span className="tag" style={{ background:'rgba(74,244,200,0.08)', color:'var(--accent)', border:'1px solid rgba(74,244,200,0.18)' }}>
                    タスク{importable}件
                  </span>
                )}

                <div style={{ flex:1 }} />

                {/* Total */}
                <div style={{ fontFamily:'var(--mono)', fontSize:15, fontWeight:700, color: inv.paid ? '#22c55e' : 'var(--text)' }}>
                  {fmt(total)}
                </div>

                {/* Chevron */}
                <div style={{ fontSize:10, color:'var(--text3)', transition:'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</div>
              </div>

              {/* ── DETAIL ── */}
              {isOpen && (
                <div style={{ borderTop:'1px solid var(--border)', padding:'20px 24px', animation:'fadeSlideIn 0.2s ease' }}>

                  {/* Config row */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
                    {[
                      { label:'請求書番号', key:'number', type:'text', mono:true },
                    ].map(f => (
                      <div key={f.key}>
                        <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--mono)', letterSpacing:'0.1em', marginBottom:4 }}>{f.label}</div>
                        <input value={inv.number} onChange={e => updateInvoice(inv.id, { number: e.target.value })}
                          style={{ width:'100%', padding:'7px 10px', fontSize:11, fontFamily:'var(--mono)' }} />
                      </div>
                    ))}
                    <div>
                      <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--mono)', letterSpacing:'0.1em', marginBottom:4 }}>宛先</div>
                      <select value={inv.clientId} onChange={e => updateInvoice(inv.id, { clientId: e.target.value })}
                        style={{ width:'100%', padding:'7px 10px', fontSize:11 }}>
                        {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--mono)', letterSpacing:'0.1em', marginBottom:4 }}>対象月</div>
                      <input type="month" value={inv.targetMonth} onChange={e => updateInvoice(inv.id, { targetMonth: e.target.value })}
                        style={{ width:'100%', padding:'7px 10px', fontSize:11 }} />
                    </div>
                    <div>
                      <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--mono)', letterSpacing:'0.1em', marginBottom:4 }}>支払期限</div>
                      <input type="date" value={inv.dueDate} onChange={e => updateInvoice(inv.id, { dueDate: e.target.value })}
                        style={{ width:'100%', padding:'7px 10px', fontSize:11 }} />
                    </div>
                    <div>
                      <div style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--mono)', letterSpacing:'0.1em', marginBottom:4 }}>税区分</div>
                      <select value={inv.taxType} onChange={e => updateInvoice(inv.id, { taxType: e.target.value as Invoice['taxType'] })}
                        style={{ width:'100%', padding:'7px 10px', fontSize:11 }}>
                        <option value="exclusive">税別(+10%)</option>
                        <option value="inclusive">税込(内税)</option>
                        <option value="none">非課税</option>
                      </select>
                    </div>
                  </div>

                  {/* Items table */}
                  <table className="bf-table" style={{ marginBottom:12 }}>
                    <thead>
                      <tr>
                        <th style={{ width:32 }}>#</th>
                        <th>品目 / DESCRIPTION</th>
                        <th style={{ textAlign:'right', width:60 }}>数量</th>
                        <th style={{ textAlign:'right', width:120 }}>単価</th>
                        <th style={{ textAlign:'right', width:120 }}>金額</th>
                        <th style={{ width:28 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {inv.items.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--text3)', padding:'20px', fontSize:11, fontFamily:'var(--mono)' }}>
                          明細なし — タスクから取込むか手動追加
                        </td></tr>
                      )}
                      {inv.items.map((it, li) => (
                        <tr key={li}>
                          <td style={{ color:'var(--text3)', fontFamily:'var(--mono)', fontSize:10 }}>{li + 1}</td>
                          <td>
                            <input value={it.name}
                              onChange={e => {
                                const items = [...inv.items]; items[li] = { ...items[li], name: e.target.value };
                                updateInvoice(inv.id, { items });
                              }}
                              style={{ background:'transparent', border:'none', width:'100%', fontSize:12, color:'var(--text)', padding:'2px 4px', borderRadius:4 }}
                              onFocus={e => e.currentTarget.style.background = 'var(--surface2)'}
                              onBlur={e => e.currentTarget.style.background = 'transparent'}
                            />
                            {it.taskId && <span style={{ fontSize:9, color:'var(--accent)', fontFamily:'var(--mono)', marginLeft:4, opacity:0.6 }}>TASK</span>}
                          </td>
                          <td style={{ textAlign:'right' }}>
                            <input type="number" value={it.qty}
                              onChange={e => {
                                const items = [...inv.items]; const q = Number(e.target.value) || 1;
                                items[li] = { ...items[li], qty: q, amount: q * items[li].unitPrice };
                                updateInvoice(inv.id, { items });
                              }}
                              style={{ background:'transparent', border:'none', width:50, textAlign:'right', fontFamily:'var(--mono)', fontSize:11, color:'var(--text2)' }} />
                          </td>
                          <td style={{ textAlign:'right' }}>
                            <input type="number" value={it.unitPrice}
                              onChange={e => {
                                const items = [...inv.items]; const p = Number(e.target.value) || 0;
                                items[li] = { ...items[li], unitPrice: p, amount: items[li].qty * p };
                                updateInvoice(inv.id, { items });
                              }}
                              style={{ background:'transparent', border:'none', width:100, textAlign:'right', fontFamily:'var(--mono)', fontSize:11, color:'var(--text2)' }} />
                          </td>
                          <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:12, fontWeight:600, color:'var(--text)' }}>
                            {fmt(it.amount)}
                          </td>
                          <td>
                            <button onClick={() => updateInvoice(inv.id, { items: inv.items.filter((_, j) => j !== li) })}
                              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:11, padding:'0 4px', opacity:0.5 }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                            >✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Add buttons */}
                  <div style={{ display:'flex', gap:8, marginBottom:20 }}>
                    <button className="btn-ghost"
                      onClick={() => updateInvoice(inv.id, { items: [...inv.items, { taskId: '', name: '', qty: 1, unitPrice: 0, amount: 0 }] })}
                      style={{ fontSize:11 }}>
                      ＋ 明細追加
                    </button>
                    <button
                      onClick={() => handleImport(inv.id)}
                      style={{
                        padding:'7px 16px', fontSize:11, borderRadius:8, cursor:'pointer',
                        background: justImported ? 'rgba(74,244,200,0.15)' : importable > 0 ? 'rgba(74,244,200,0.1)' : 'transparent',
                        border: importable > 0 ? '1px solid rgba(74,244,200,0.3)' : '1px solid var(--border2)',
                        color: justImported ? 'var(--accent)' : importable > 0 ? 'var(--accent)' : 'var(--text3)',
                        transition: 'all 0.15s',
                        fontFamily: 'var(--mono)',
                        letterSpacing: '0.05em',
                      }}>
                      {justImported ? '✓ 取込完了' : importable > 0 ? `📋 タスク${importable}件を取込` : `📋 ${inv.targetMonth?.replace('-','/')} タスク取込`}
                    </button>
                  </div>

                  {/* Totals + Actions */}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
                    {/* Actions */}
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <button className="btn-accent" onClick={() => handlePDF(inv)} style={{ fontSize:11 }}>
                        🖨 PDF出力
                      </button>
                      <button onClick={() => updateInvoice(inv.id, { paid: !inv.paid, paidAt: inv.paid ? '' : td })}
                        style={{
                          padding:'7px 16px', fontSize:11, borderRadius:8, cursor:'pointer',
                          background: inv.paid ? 'rgba(255,77,109,0.08)' : 'rgba(34,197,94,0.1)',
                          border: inv.paid ? '1px solid rgba(255,77,109,0.2)' : '1px solid rgba(34,197,94,0.25)',
                          color: inv.paid ? 'var(--red)' : '#22c55e',
                          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing:'0.05em',
                        }}>
                        {inv.paid ? '✕ 未入金に戻す' : '✓ 入金済にする'}
                      </button>
                      <input value={inv.note || ''} onChange={e => updateInvoice(inv.id, { note: e.target.value })}
                        placeholder="備考..."
                        style={{ padding:'7px 12px', fontSize:11, width:160 }} />
                      <button onClick={() => { if (confirm('削除しますか？')) store.update(d => { d.invoices = d.invoices.filter(x => x.id !== inv.id); }); }}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text3)', fontSize:14, padding:'4px 8px' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                      >🗑</button>
                    </div>

                    {/* Totals */}
                    <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, padding:'12px 20px', minWidth:200 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
                        <span style={{ color:'var(--text3)' }}>小計</span>
                        <span style={{ fontFamily:'var(--mono)' }}>{fmt(inv.taxType === 'inclusive' ? sub - tax : sub)}</span>
                      </div>
                      {inv.taxType !== 'none' && (
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:8 }}>
                          <span style={{ color:'var(--text3)' }}>{inv.taxType === 'exclusive' ? '消費税(10%)' : 'うち消費税'}</span>
                          <span style={{ fontFamily:'var(--mono)' }}>{fmt(tax)}</span>
                        </div>
                      )}
                      <div style={{ borderTop:'1px solid var(--border2)', paddingTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--accent)', letterSpacing:'0.1em' }}>TOTAL</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:700, color: inv.paid ? '#22c55e' : 'var(--accent)' }}>
                          {fmt(total)}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
