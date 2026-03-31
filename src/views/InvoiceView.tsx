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
        ${co.zip ? `<div>〒${escHtml(co.zip)}</div>` : ''}
        ${co.addr ? `<div>${escHtml(co.addr)}</div>` : ''}
        ${co.tel ? `<div>TEL: ${escHtml(co.tel)}</div>` : ''}
        ${co.email ? `<div>${escHtml(co.email)}</div>` : ''}
        ${co.reg ? `<div style="margin-top:4px;font-size:9px">登録番号: ${escHtml(co.reg)}</div>` : ''}
        ${(co.bank||co.aNo) ? `<div style="margin-top:6px;font-size:9px">${[co.bank&&co.branch?escHtml(co.bank)+' '+escHtml(co.branch):co.bank?escHtml(co.bank):'',co.aType&&co.aNo?escHtml(co.aType)+' '+escHtml(co.aNo):'',co.aName?escHtml(co.aName):''].filter(Boolean).join('<br>')}</div>` : ''}
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
// ─────────────────────────────────────────────────
//  InvoiceView — 月次ビュー
// ─────────────────────────────────────────────────
export function InvoiceView({ store }: { store: Store }) {
  const { data, addInvoice, updateInvoice, deleteInvoice, importPendingTasks } = store;
  const td = store.today();

  // 月リスト: 存在する月 + 過去3ヶ月 + 今月 + 来月
  const allMonths = (() => {
    const set = new Set<string>();
    data.invoices.forEach(i => set.add(i.targetMonth));
    data.tasks.filter(t => t.billingMonth).forEach(t => set.add(t.billingMonth!));
    // 過去3ヶ月〜来月
    for (let i = -3; i <= 1; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      set.add(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }
    return [...set].sort().reverse(); // 新しい月が上
  })();

  const [activeMonth, setActiveMonth] = useState(store.thisMonth());
  const [openInvId, setOpenInvId]     = useState<string | null>(null);
  const [importedId, setImportedId]   = useState<string | null>(null);
  const fmt = (n: number) => '¥' + n.toLocaleString();

  // 対象月の集計
  const monthInvoices = data.invoices.filter(i => i.targetMonth === activeMonth);
  const monthTotal    = monthInvoices.reduce((a, inv) => {
    const sub = inv.items.reduce((s, it) => s + (it.amount || 0), 0);
    return a + (inv.taxType === 'exclusive' ? sub + Math.round(sub * 0.1) : sub);
  }, 0);
  const unpaidCount   = monthInvoices.filter(i => !i.paid).length;

  // 対象月の未追加タスク（billingMonth=activeMonth & !billingConfirmed）
  const pendingTasks = data.tasks.filter(t =>
    t.status === 'done' && t.billingMonth === activeMonth && !t.billingConfirmed && t.revenue > 0
  );

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
    // PDFを出力したらlocked=trueに
    updateInvoice(inv.id, { locked: true, issueDate: inv.issueDate || td });
  };

  const handleImportPending = (clientId: string) => {
    importPendingTasks(activeMonth, clientId);
    setImportedId(clientId);
    setTimeout(() => setImportedId(null), 2000);
  };

  return (
    <div style={{ display:'flex', height:'100%', overflow:'hidden' }}>

      {/* ── 月リスト（左サイドバー） ── */}
      <div style={{
        width:160, flexShrink:0, borderRight:'1px solid var(--bd0)',
        display:'flex', flexDirection:'column', overflowY:'auto',
        background:'linear-gradient(180deg,var(--bg2),var(--bg))',
      }}>
        <div style={{ padding:'20px 16px 12px' }}>
          <div className="label">PERIOD</div>
        </div>
        <div style={{ flex:1, padding:'0 8px 16px', display:'flex', flexDirection:'column', gap:2 }}>
          {allMonths.map(m => {
            const invs     = data.invoices.filter(i => i.targetMonth === m);
            const total    = invs.reduce((a, i) => {
              const sub = i.items.reduce((s, it) => s + (it.amount||0), 0);
              return a + (i.taxType==='exclusive' ? sub + Math.round(sub*.1) : sub);
            }, 0);
            const hasUnpaid = invs.some(i => !i.paid);
            const hasPending = data.tasks.some(t => t.status==='done'&&t.billingMonth===m&&!t.billingConfirmed&&t.revenue>0);
            const isActive = m === activeMonth;

            return (
              <button key={m} onClick={() => setActiveMonth(m)} style={{
                padding:'10px 12px', borderRadius:9, border:'none', cursor:'pointer', textAlign:'left',
                background: isActive ? 'rgba(0,255,163,.1)' : 'transparent',
                boxShadow: isActive ? '0 0 0 1px rgba(0,255,163,.2)' : 'none',
                transition:'all .12s',
              }}
                onMouseEnter={e => { if(!isActive) e.currentTarget.style.background='rgba(255,255,255,.03)'; }}
                onMouseLeave={e => { if(!isActive) e.currentTarget.style.background='transparent'; }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:600,
                    color: isActive ? 'var(--ac)' : 'var(--tx2)', letterSpacing:'-.3px' }}>
                    {m.replace('-', '/')}
                  </span>
                  {hasPending && <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--gold)', flexShrink:0 }}/>}
                  {hasUnpaid && !hasPending && <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--red)', flexShrink:0 }}/>}
                </div>
                {total > 0 && (
                  <div style={{ fontFamily:'var(--mono)', fontSize:9, color: isActive?'var(--ac)':'var(--tx3)' }}>
                    ¥{(total/10000).toFixed(1)}万
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── メインエリア ── */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px 28px 48px' }}>

        {/* ── ヘッダー ── */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }}>
          <div>
            <div className="label" style={{ marginBottom:8 }}>{activeMonth.replace('-','/')} BILLING</div>
            <div style={{ display:'flex', alignItems:'baseline', gap:12 }}>
              <h1 style={{ fontFamily:'var(--head)', fontSize:28, letterSpacing:2, margin:0, lineHeight:1 }}>
                {activeMonth.replace('-', '/')}
              </h1>
              {monthTotal > 0 && (
                <span style={{ fontFamily:'var(--mono)', fontSize:18, color:'var(--ac)', letterSpacing:'-1px' }}>
                  ¥{(monthTotal/10000).toFixed(1)}万
                </span>
              )}
              {unpaidCount > 0 && (
                <span className="badge" style={{ color:'var(--red)', borderColor:'rgba(255,77,109,.3)', background:'rgba(255,77,109,.07)', fontSize:9 }}>
                  未入金 {unpaidCount}件
                </span>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {/* クライアント別に請求書を新規作成 */}
            {data.clients.map(c => {
              const exists = data.invoices.some(i => i.clientId === c.id && i.targetMonth === activeMonth);
              if (exists) return null;
              return (
                <button key={c.id} className="btn btn-ghost" style={{ fontSize:11 }}
                  onClick={() => addInvoice(c.id, activeMonth)}>
                  ＋ {c.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 未確定タスクの警告バナー ── */}
        {pendingTasks.length > 0 && (
          <div style={{
            background:'rgba(255,209,102,.06)', border:'1px solid rgba(255,209,102,.25)',
            borderRadius:12, padding:'14px 18px', marginBottom:20,
            display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--gold)', flexShrink:0 }}/>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--gold)', marginBottom:2 }}>
                  未追加のタスクがあります（{pendingTasks.length}件）
                </div>
                <div style={{ fontSize:10, color:'var(--tx3)' }}>
                  {pendingTasks.map(t => t.title).join('・')}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              {/* クライアント別にまとめて追加 */}
              {[...new Set(pendingTasks.map(t => t.clientId))].map(cid => {
                const client = data.clients.find(c => c.id === cid);
                const n = pendingTasks.filter(t => t.clientId === cid).length;
                return (
                  <button key={cid} onClick={() => handleImportPending(cid)} style={{
                    padding:'7px 14px', fontSize:10, borderRadius:8, cursor:'pointer',
                    background: importedId===cid ? 'rgba(0,255,163,.15)' : 'rgba(255,209,102,.1)',
                    border: importedId===cid ? '1px solid rgba(0,255,163,.3)' : '1px solid rgba(255,209,102,.25)',
                    color: importedId===cid ? 'var(--ac)' : 'var(--gold)',
                    fontFamily:'var(--mono)', letterSpacing:'.05em', transition:'all .15s',
                  }}>
                    {importedId===cid ? '✓ 追加済' : `${client?.name} ${n}件を追加`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 請求書がない場合 ── */}
        {monthInvoices.length === 0 && pendingTasks.length === 0 && (
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--tx3)' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:32, opacity:.08, marginBottom:12 }}>¥</div>
            <div className="label" style={{ marginBottom:8 }}>NO INVOICES</div>
            <div style={{ fontSize:11, marginBottom:16 }}>この月の請求書はありません</div>
            <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
              {data.clients.map(c => (
                <button key={c.id} className="btn btn-ghost" style={{ fontSize:11 }}
                  onClick={() => addInvoice(c.id, activeMonth)}>
                  ＋ {c.name}の請求書を作成
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 請求書一覧 ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {monthInvoices.map(inv => {
            const client = data.clients.find(c => c.id === inv.clientId);
            const { sub, tax, total } = calcTotals(inv);
            const isLate = inv.dueDate && inv.dueDate < td && !inv.paid;
            const isOpen = openInvId === inv.id;
            const invPendingTasks = pendingTasks.filter(t => t.clientId === inv.clientId);

            return (
              <div key={inv.id} style={{
                background:'linear-gradient(145deg,var(--s0),var(--bg2))',
                border:`1px solid ${inv.paid?'rgba(0,255,163,.18)':isLate?'rgba(255,77,109,.22)':inv.locked?'rgba(75,142,255,.2)':'var(--bd0)'}`,
                borderRadius:14, overflow:'hidden',
              }}>
                {/* ── 一覧行 ── */}
                <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', cursor:'pointer', transition:'background .12s' }}
                  onClick={() => setOpenInvId(isOpen ? null : inv.id)}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(0,255,163,.025)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <div style={{ width:3, height:38, borderRadius:2, flexShrink:0,
                    background: inv.paid?'var(--ac)':isLate?'var(--red)':inv.locked?'var(--blue)':'var(--bd1)',
                    boxShadow: inv.paid?'0 0 8px var(--ac)':isLate?'0 0 8px var(--red)':'none',
                  }}/>
                  <div>
                    <div style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:600, color:'var(--ac)', marginBottom:2 }}>{inv.number}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'var(--tx)' }}>{client?.name || '—'}</div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginLeft:8 }}>
                    {inv.paid && <span className="badge" style={{ color:'var(--ac)', borderColor:'rgba(0,255,163,.3)', background:'rgba(0,255,163,.07)', fontSize:9 }}>PAID</span>}
                    {isLate && !inv.paid && <span className="badge" style={{ color:'var(--red)', borderColor:'rgba(255,77,109,.3)', background:'rgba(255,77,109,.07)', fontSize:9 }}>OVERDUE</span>}
                    {inv.locked && <span className="badge" style={{ color:'var(--blue)', borderColor:'rgba(75,142,255,.3)', background:'rgba(75,142,255,.07)', fontSize:9 }}>PDF送付済</span>}
                    {invPendingTasks.length > 0 && (
                      <span className="badge" style={{ color:'var(--gold)', borderColor:'rgba(255,209,102,.3)', background:'rgba(255,209,102,.07)', fontSize:9 }}>
                        ＋{invPendingTasks.length}件未追加
                      </span>
                    )}
                  </div>
                  <div style={{ flex:1 }}/>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:'var(--mono)', fontSize:18, fontWeight:600, color:inv.paid?'var(--ac)':'var(--tx)', letterSpacing:'-0.5px' }}>{fmt(total)}</div>
                    {inv.dueDate && <div style={{ fontFamily:'var(--mono)', fontSize:9, color:isLate?'var(--red)':'var(--tx3)', marginTop:2 }}>期限 {inv.dueDate}</div>}
                  </div>
                  <div style={{ fontSize:10, color:'var(--tx3)', transition:'transform .15s', transform:isOpen?'rotate(180deg)':'none', marginLeft:6 }}>▾</div>
                </div>

                {/* ── 詳細 ── */}
                {isOpen && (
                  <div className="anim-up" style={{ borderTop:'1px solid var(--bd0)', padding:'20px 24px' }}>

                    {/* ロック中の警告 */}
                    {inv.locked && (
                      <div style={{ background:'rgba(75,142,255,.06)', border:'1px solid rgba(75,142,255,.2)', borderRadius:8, padding:'10px 14px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:11, color:'var(--blue)' }}>PDF送付済み。編集するには解除してください。</span>
                        <button onClick={() => updateInvoice(inv.id, { locked: false })}
                          style={{ background:'transparent', border:'1px solid rgba(75,142,255,.3)', borderRadius:6, padding:'4px 12px', fontSize:10, color:'var(--blue)', cursor:'pointer' }}>
                          解除
                        </button>
                      </div>
                    )}

                    {/* 設定行 */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20, opacity: inv.locked ? 0.5 : 1, pointerEvents: inv.locked ? 'none' : 'auto' }}>
                      {[
                        { label:'請求書番号', el:<input value={inv.number} onChange={e=>updateInvoice(inv.id,{number:e.target.value})} style={{width:'100%',padding:'7px 10px',fontSize:11,fontFamily:'var(--mono)'}}/> },
                        { label:'宛先', el:<select value={inv.clientId} onChange={e=>updateInvoice(inv.id,{clientId:e.target.value})} style={{width:'100%',padding:'7px 10px',fontSize:11}}>{data.clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select> },
                        { label:'発行日', el:<input type="date" value={inv.issueDate||''} onChange={e=>updateInvoice(inv.id,{issueDate:e.target.value})} style={{width:'100%',padding:'7px 10px',fontSize:11}}/> },
                        { label:'支払期限', el:<input type="date" value={inv.dueDate} onChange={e=>updateInvoice(inv.id,{dueDate:e.target.value})} style={{width:'100%',padding:'7px 10px',fontSize:11}}/> },
                        { label:'税区分', el:<select value={inv.taxType} onChange={e=>updateInvoice(inv.id,{taxType:e.target.value as Invoice['taxType']})} style={{width:'100%',padding:'7px 10px',fontSize:11}}><option value="exclusive">税別(+10%)</option><option value="inclusive">税込(内税)</option><option value="none">非課税</option></select> },
                      ].map(f => (
                        <div key={f.label}>
                          <div className="label" style={{ marginBottom:5, fontSize:8 }}>{f.label}</div>
                          {f.el}
                        </div>
                      ))}
                    </div>

                    {/* 明細テーブル */}
                    <table className="tbl" style={{ marginBottom:12, opacity:inv.locked?.5:1, pointerEvents:inv.locked?'none':'auto' }}>
                      <thead><tr>
                        <th style={{width:32}}>#</th>
                        <th>品目</th>
                        <th style={{textAlign:'right',width:60}}>数量</th>
                        <th style={{textAlign:'right',width:120}}>単価</th>
                        <th style={{textAlign:'right',width:120}}>金額</th>
                        <th style={{width:28}}/>
                      </tr></thead>
                      <tbody>
                        {inv.items.length===0&&(
                          <tr><td colSpan={6} style={{textAlign:'center',color:'var(--tx3)',padding:'20px',fontFamily:'var(--mono)',fontSize:9,letterSpacing:'.1em'}}>
                            明細なし
                          </td></tr>
                        )}
                        {inv.items.map((it,li)=>(
                          <tr key={li}>
                            <td className="n-sm" style={{color:'var(--tx3)'}}>{li+1}</td>
                            <td>
                              <input value={it.name} onChange={e=>{const items=[...inv.items];items[li]={...items[li],name:e.target.value};updateInvoice(inv.id,{items});}}
                                style={{background:'transparent',border:'none',width:'100%',fontSize:12,color:'var(--tx)',padding:'2px 4px',borderRadius:4}}
                                onFocus={e=>e.currentTarget.style.background='var(--s2)'}
                                onBlur={e=>e.currentTarget.style.background='transparent'}/>
                              {it.taskId&&<span className="n-sm" style={{color:'var(--ac)',marginLeft:4,opacity:.5}}>TASK</span>}
                            </td>
                            <td style={{textAlign:'right'}}>
                              <input type="number" value={it.qty} onChange={e=>{const items=[...inv.items];const q=Number(e.target.value)||1;items[li]={...items[li],qty:q,amount:q*items[li].unitPrice};updateInvoice(inv.id,{items});}}
                                style={{background:'transparent',border:'none',width:50,textAlign:'right',fontFamily:'var(--mono)',fontSize:11,color:'var(--tx1)'}}/>
                            </td>
                            <td style={{textAlign:'right'}}>
                              <input type="number" value={it.unitPrice} onChange={e=>{const items=[...inv.items];const p=Number(e.target.value)||0;items[li]={...items[li],unitPrice:p,amount:items[li].qty*p};updateInvoice(inv.id,{items});}}
                                style={{background:'transparent',border:'none',width:100,textAlign:'right',fontFamily:'var(--mono)',fontSize:11,color:'var(--tx1)'}}/>
                            </td>
                            <td className="n-sm" style={{textAlign:'right',fontWeight:600,fontSize:12,color:'var(--tx)'}}>{fmt(it.amount)}</td>
                            <td>
                              <button onClick={()=>updateInvoice(inv.id,{items:inv.items.filter((_,j)=>j!==li)})}
                                style={{background:'none',border:'none',color:'var(--tx3)',fontSize:11,padding:'0 4px',cursor:'pointer'}}
                                onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
                                onMouseLeave={e=>e.currentTarget.style.color='var(--tx3)'}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* アクションボタン + 合計 */}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',flexWrap:'wrap',gap:12}}>
                      {!inv.locked && (
                        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                          <button className="btn btn-ghost" style={{fontSize:11}}
                            onClick={()=>updateInvoice(inv.id,{items:[...inv.items,{taskId:'',name:'',qty:1,unitPrice:0,amount:0}]})}>
                            ＋ 明細追加
                          </button>
                          <button className="btn btn-ac" style={{fontSize:11}} onClick={()=>handlePDF(inv)}>
                            🖨 PDF送付
                          </button>
                          <button onClick={()=>updateInvoice(inv.id,{paid:!inv.paid,paidAt:inv.paid?'':td})} style={{
                            padding:'8px 16px',fontSize:10,borderRadius:8,cursor:'pointer',fontFamily:'var(--mono)',
                            background:inv.paid?'rgba(255,77,109,.08)':'rgba(0,255,163,.08)',
                            border:inv.paid?'1px solid rgba(255,77,109,.25)':'1px solid rgba(0,255,163,.25)',
                            color:inv.paid?'var(--red)':'var(--ac)',letterSpacing:'.05em',
                          }}>
                            {inv.paid?'✕ 未入金':'✓ 入金済'}
                          </button>
                          <input value={inv.note||''} onChange={e=>updateInvoice(inv.id,{note:e.target.value})}
                            placeholder="備考..." style={{padding:'7px 12px',fontSize:11,width:150}}/>
                          <button onClick={()=>{if(confirm('削除しますか？'))deleteInvoice(inv.id);}}
                            style={{background:'none',border:'none',color:'var(--tx3)',fontSize:15,padding:'4px 6px',cursor:'pointer'}}
                            onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
                            onMouseLeave={e=>e.currentTarget.style.color='var(--tx3)'}>🗑</button>
                        </div>
                      )}
                      {inv.locked && (
                        <div style={{display:'flex',gap:8}}>
                          <button className="btn btn-ghost" style={{fontSize:11}} onClick={()=>handlePDF(inv)}>🖨 再PDF出力</button>
                          <button onClick={()=>updateInvoice(inv.id,{paid:!inv.paid,paidAt:inv.paid?'':td})} style={{
                            padding:'8px 16px',fontSize:10,borderRadius:8,cursor:'pointer',fontFamily:'var(--mono)',
                            background:inv.paid?'rgba(255,77,109,.08)':'rgba(0,255,163,.08)',
                            border:inv.paid?'1px solid rgba(255,77,109,.25)':'1px solid rgba(0,255,163,.25)',
                            color:inv.paid?'var(--red)':'var(--ac)',letterSpacing:'.05em',
                          }}>
                            {inv.paid?'✕ 未入金':'✓ 入金済'}
                          </button>
                        </div>
                      )}

                      {/* 合計ボックス */}
                      <div style={{background:'var(--bg2)',border:'1px solid var(--bd1)',borderRadius:12,padding:'14px 20px',minWidth:210,flexShrink:0}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:5}}>
                          <span style={{color:'var(--tx2)'}}>小計</span>
                          <span className="n-sm">{fmt(inv.taxType==='inclusive'?sub-tax:sub)}</span>
                        </div>
                        {inv.taxType!=='none'&&(
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:10}}>
                            <span style={{color:'var(--tx2)'}}>{inv.taxType==='exclusive'?'消費税(10%)':'うち消費税'}</span>
                            <span className="n-sm">{fmt(tax)}</span>
                          </div>
                        )}
                        <div style={{borderTop:'1px solid var(--bd1)',paddingTop:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span className="label" style={{color:'var(--ac)'}}>TOTAL</span>
                          <span style={{fontFamily:'var(--mono)',fontSize:20,fontWeight:600,color:inv.paid?'var(--ac)':'var(--tx)',letterSpacing:'-1px'}}>{fmt(total)}</span>
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
    </div>
  );
}
