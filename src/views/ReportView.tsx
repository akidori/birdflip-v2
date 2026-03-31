import { useState } from 'react';
import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

// ── SVGグラフ共通ユーティリティ ──────────────────
const PAD = { top:16, right:16, bottom:36, left:64 };

function yTick(max: number): number[] {
  if (max === 0) return [0];
  const raw = max / 4;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const nice = Math.ceil(raw / exp) * exp;
  return [0, nice, nice * 2, nice * 3, nice * 4];
}

function fmtY(n: number): string {
  if (n >= 1000000) return (n / 10000).toFixed(0) + '万';
  if (n >= 10000)   return (n / 10000).toFixed(1) + '万';
  return n.toLocaleString();
}

// ── 月別バーチャート（売上・利益・外注） ─────────
function BarChart({ data, w = 600, h = 220 }: {
  data: { label: string; rev: number; profit: number; out: number; isCurrent: boolean }[];
  w?: number; h?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxVal = Math.max(...data.map(d => d.rev), 1);
  const ticks = yTick(maxVal);
  const maxTick = ticks[ticks.length - 1];
  const innerW = w - PAD.left - PAD.right;
  const innerH = h - PAD.top - PAD.bottom;
  const barW = Math.floor(innerW / data.length * 0.55);
  const gap  = innerW / data.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:'auto', overflow:'visible' }}>
      <defs>
        <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00ffa3" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="#00ffa3" stopOpacity="0.35"/>
        </linearGradient>
        <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4b8eff" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#4b8eff" stopOpacity="0.3"/>
        </linearGradient>
        <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd166" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#ffd166" stopOpacity="0.2"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Y軸グリッド */}
      {ticks.map((t, i) => {
        const y = PAD.top + innerH - (t / maxTick) * innerH;
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y}
              stroke="rgba(255,255,255,0.05)" strokeWidth={i === 0 ? 1 : 0.5}/>
            <text x={PAD.left - 8} y={y + 4} textAnchor="end"
              style={{ fontSize:9, fill:'rgba(180,205,230,0.4)', fontFamily:'var(--mono)' }}>
              {fmtY(t)}
            </text>
          </g>
        );
      })}

      {/* バー */}
      {data.map((d, i) => {
        const cx = PAD.left + gap * i + gap / 2;
        const revH  = maxTick > 0 ? (d.rev / maxTick) * innerH : 0;
        const profH = maxTick > 0 ? (Math.max(0, d.profit) / maxTick) * innerH : 0;
        const isHov = hovered === i;

        return (
          <g key={i} style={{ cursor:'default' }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}>
            {/* ホバー背景 */}
            {isHov && (
              <rect x={cx - gap / 2} y={PAD.top} width={gap} height={innerH}
                fill="rgba(0,255,163,0.03)" rx={4}/>
            )}
            {/* 売上バー */}
            {revH > 0 && (
              <rect
                x={cx - barW * 0.6} y={PAD.top + innerH - revH}
                width={barW * 0.6} height={revH}
                fill={d.isCurrent ? 'url(#gradRev)' : 'rgba(0,255,163,0.25)'}
                rx={2}
                filter={d.isCurrent ? 'url(#glow)' : undefined}
              />
            )}
            {/* 利益バー */}
            {profH > 0 && (
              <rect
                x={cx} y={PAD.top + innerH - profH}
                width={barW * 0.5} height={profH}
                fill={d.isCurrent ? 'url(#gradProfit)' : 'rgba(75,142,255,0.2)'}
                rx={2}
              />
            )}
            {/* X軸ラベル */}
            <text x={cx} y={h - 6} textAnchor="middle"
              style={{ fontSize:9, fill: d.isCurrent ? '#00ffa3' : 'rgba(180,205,230,0.4)', fontFamily:'var(--mono)', fontWeight: d.isCurrent ? 700 : 400 }}>
              {d.label}
            </text>
            {/* 今月ドット */}
            {d.isCurrent && (
              <circle cx={cx} cy={h - 20} r={2} fill="#00ffa3"/>
            )}
            {/* ホバートゥールチップ */}
            {isHov && d.rev > 0 && (
              <g>
                <rect x={cx - 44} y={PAD.top + innerH - revH - 44} width={88} height={40} rx={6}
                  fill="rgba(8,15,26,0.95)" stroke="rgba(0,255,163,0.25)" strokeWidth={1}/>
                <text x={cx} y={PAD.top + innerH - revH - 30} textAnchor="middle"
                  style={{ fontSize:9, fill:'rgba(180,205,230,0.6)', fontFamily:'var(--mono)' }}>売上</text>
                <text x={cx} y={PAD.top + innerH - revH - 14} textAnchor="middle"
                  style={{ fontSize:11, fill:'#00ffa3', fontFamily:'var(--mono)', fontWeight:700 }}>
                  ¥{(d.rev/10000).toFixed(1)}万
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Y軸ライン */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + innerH}
        stroke="rgba(255,255,255,0.08)" strokeWidth={1}/>
    </svg>
  );
}

// ── ドーナツチャート（クライアント別） ────────────
function DonutChart({ segments, size = 160 }: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total === 0) return (
    <div style={{ width:size, height:size, display:'flex', alignItems:'center', justifyContent:'center',
      border:'2px solid rgba(255,255,255,0.06)', borderRadius:'50%', color:'rgba(180,205,230,0.3)',
      fontFamily:'var(--mono)', fontSize:10 }}>NO DATA</div>
  );

  const cx = size / 2, cy = size / 2, r = size * 0.38, ir = size * 0.24;
  let angle = -Math.PI / 2;
  const paths = segments.map((s, i) => {
    const sweep = (s.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const ix1 = cx + ir * Math.cos(angle - sweep);
    const iy1 = cy + ir * Math.sin(angle - sweep);
    const ix2 = cx + ir * Math.cos(angle);
    const iy2 = cy + ir * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1} Z`;
    return { d, color: s.color, i };
  });

  const hov = hovered !== null ? segments[hovered] : null;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width:size, height:size, flexShrink:0 }}>
      {paths.map(p => (
        <path key={p.i} d={p.d}
          fill={p.color}
          opacity={hovered === null ? 0.85 : hovered === p.i ? 1 : 0.35}
          style={{ transition:'opacity .15s', cursor:'default' }}
          onMouseEnter={() => setHovered(p.i)}
          onMouseLeave={() => setHovered(null)}
        />
      ))}
      {/* 中央テキスト */}
      <text x={cx} y={cy - 6} textAnchor="middle"
        style={{ fontSize:9, fill:'rgba(180,205,230,0.5)', fontFamily:'var(--mono)' }}>
        {hov ? hov.label.slice(0,6) : 'TOTAL'}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle"
        style={{ fontSize:12, fill: hov ? hov.color : '#00ffa3', fontFamily:'var(--mono)', fontWeight:700 }}>
        {hov ? `${Math.round(hov.value / total * 100)}%` : '100%'}
      </text>
    </svg>
  );
}

// ── ReportView ────────────────────────────────────
export function ReportView({ store }: { store: Store }) {
  const { data } = store;
  const fmt = (n: number) => '¥' + n.toLocaleString();
  const fmtM = (n: number) => n >= 10000 ? '¥' + (n / 10000).toFixed(1) + '万' : fmt(n);

  // 過去12ヶ月
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.now() + 9 * 3600000);
    d.setMonth(d.getMonth() - i);
    months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }

  const currentMonth = store.thisMonth();

  const monthlyData = months.map(m => {
    const done   = data.tasks.filter(t => t.status === 'done' && (t.completedAt || t.deadline || '').startsWith(m));
    const rev    = done.reduce((a, t) => a + (t.revenue || 0), 0);
    const out    = done.reduce((a, t) => a + (t.outsourceCost || 0), 0);
    const profit = rev - out;
    const inv    = data.invoices.filter(i => i.targetMonth === m);
    const billed = inv.reduce((a, i) => { const sub = i.items.reduce((s, it) => s + (it.amount||0), 0); return a + (i.taxType==='exclusive'?Math.round(sub*1.1):sub); }, 0);
    const paid   = inv.filter(i=>i.paid).reduce((a, i) => { const sub = i.items.reduce((s,it)=>s+(it.amount||0),0); return a + (i.taxType==='exclusive'?Math.round(sub*1.1):sub); }, 0);
    return { m, rev, out, profit, billed, paid, count: done.length, isCurrent: m === currentMonth,
      label: m.slice(5) + '月' };
  });

  const current = monthlyData.find(d => d.m === currentMonth) || { rev:0, out:0, profit:0, count:0, billed:0, paid:0 };
  const prev    = monthlyData[monthlyData.length - 2];
  const profitRate = current.rev > 0 ? Math.round(current.profit / current.rev * 100) : 0;
  const outRate    = current.rev > 0 ? Math.round(current.out / current.rev * 100) : 0;
  const revDiff    = prev?.rev > 0 ? Math.round((current.rev - prev.rev) / prev.rev * 100) : null;

  // 累計
  const allDone   = data.tasks.filter(t => t.status === 'done');
  const totalRev  = allDone.reduce((a, t) => a + (t.revenue || 0), 0);
  const totalOut  = allDone.reduce((a, t) => a + (t.outsourceCost || 0), 0);
  const totalProfit = totalRev - totalOut;
  const unpaid = data.invoices.filter(i => !i.paid).reduce((a, i) => {
    const sub = i.items.reduce((s,it)=>s+(it.amount||0),0);
    return a + (i.taxType==='exclusive'?Math.round(sub*1.1):sub);
  }, 0);

  // クライアント別（ドーナツ用）
  const COLORS = ['#00ffa3','#4b8eff','#ffd166','#ff4d6d','#b06aff','#00d4ff','#fb923c','#a78bfa'];
  const clientData = data.clients.map((c, i) => {
    const tasks = allDone.filter(t => t.clientId === c.id);
    const rev   = tasks.reduce((a, t) => a + (t.revenue || 0), 0);
    return { ...c, rev, color: COLORS[i % COLORS.length], count: tasks.length };
  }).filter(c => c.rev > 0).sort((a, b) => b.rev - a.rev);

  // 直近6ヶ月のみグラフ表示
  const chartData = monthlyData.slice(-6);

  return (
    <div style={{ padding:'28px 32px 52px', maxWidth:1200, margin:'0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom:28 }}>
        <div className="label" style={{ marginBottom:8 }}>FINANCIAL OVERVIEW</div>
        <h1 style={{ fontFamily:'var(--head)', fontSize:32, letterSpacing:2, margin:0, lineHeight:1 }}>REPORT</h1>
      </div>

      {/* ── KPI ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'今月売上',   value:fmtM(current.rev), sub: revDiff!==null ? `先月比 ${revDiff>0?'+':''}${revDiff}%` : '先月比 —', color:'var(--ac)' },
          { label:'今月利益',   value:fmtM(current.profit), sub:`利益率 ${profitRate}%`, color:current.profit>=0?'#22d3a5':'var(--red)' },
          { label:'外注費',     value:fmtM(current.out), sub:`売上比 ${outRate}%`, color:outRate>70?'var(--red)':'var(--gold)' },
          { label:'未回収',     value:fmtM(unpaid), sub:`${data.invoices.filter(i=>!i.paid).length}件`, color:unpaid>0?'var(--gold)':'var(--tx3)' },
        ].map(k => (
          <div key={k.label} style={{ background:'linear-gradient(145deg,var(--s0),var(--bg2))', border:'1px solid var(--bd0)', borderRadius:14, padding:'20px 22px' }}>
            <div className="label" style={{ marginBottom:10 }}>{k.label}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:22, fontWeight:600, color:k.color, letterSpacing:'-1px', lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:10, color:'var(--tx3)', marginTop:6 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── メイングラフ ── */}
      <div style={{ background:'linear-gradient(145deg,var(--s0),var(--bg2))', border:'1px solid var(--bd0)', borderRadius:16, padding:'22px 24px', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div className="label">月別 売上 / 利益（直近6ヶ月）</div>
          <div style={{ display:'flex', gap:16 }}>
            {[{c:'rgba(0,255,163,0.7)',l:'売上'},{c:'rgba(75,142,255,0.7)',l:'利益'}].map(leg => (
              <div key={leg.l} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:10, height:10, borderRadius:2, background:leg.c }}/>
                <span style={{ fontSize:10, color:'var(--tx3)', fontFamily:'var(--mono)' }}>{leg.l}</span>
              </div>
            ))}
          </div>
        </div>
        <BarChart data={chartData} w={760} h={220}/>
      </div>

      {/* ── 下段 2カラム ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:16, marginBottom:16 }}>

        {/* クライアント別ドーナツ */}
        <div style={{ background:'linear-gradient(145deg,var(--s0),var(--bg2))', border:'1px solid var(--bd0)', borderRadius:16, padding:'20px 22px' }}>
          <div className="label" style={{ marginBottom:16 }}>クライアント別 売上</div>
          {clientData.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--tx3)', fontFamily:'var(--mono)', fontSize:10 }}>NO DATA</div>
          ) : (
            <div style={{ display:'flex', gap:20, alignItems:'center' }}>
              <DonutChart segments={clientData.map(c => ({ label:c.name, value:c.rev, color:c.color }))} size={160}/>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                {clientData.slice(0,6).map((c, i) => {
                  const share = totalRev > 0 ? Math.round(c.rev / totalRev * 100) : 0;
                  return (
                    <div key={c.id}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                          <div style={{ width:8, height:8, borderRadius:2, background:c.color, flexShrink:0 }}/>
                          <span style={{ fontSize:11, color:'var(--tx1)' }}>{c.name}</span>
                        </div>
                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--tx3)' }}>{share}%</span>
                          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:c.color, fontWeight:600 }}>{fmtM(c.rev)}</span>
                        </div>
                      </div>
                      <div className="ptrack">
                        <div className="pfill" style={{ width:`${share}%`, background:c.color, boxShadow:'none' }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* P/L サマリー */}
        <div style={{ background:'linear-gradient(145deg,var(--s0),var(--bg2))', border:'1px solid var(--bd0)', borderRadius:16, padding:'20px 22px' }}>
          <div className="label" style={{ marginBottom:16 }}>P/L サマリー（全期間）</div>
          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {[
              { label:'累計売上',   value:fmt(totalRev),    color:'var(--ac)',  bold:true },
              { label:'  外注費',   value:fmt(totalOut),    color:'var(--tx2)', sub:`${totalRev>0?Math.round(totalOut/totalRev*100):0}%` },
              { label:'累計利益',   value:fmt(totalProfit), color:totalProfit>=0?'#22d3a5':'var(--red)', bold:true, sub:`${totalRev>0?Math.round(totalProfit/totalRev*100):0}%` },
              null,
              { label:'未回収',     value:fmt(unpaid),      color:unpaid>0?'var(--gold)':'var(--tx3)', sub:`${data.invoices.filter(i=>!i.paid).length}件` },
              { label:'完了タスク', value:`${allDone.length}件`, color:'var(--tx2)' },
            ].map((row, i) => {
              if (!row) return <div key={i} className="div-h" style={{ margin:'8px 0' }}/>;
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                  padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,.025)' }}>
                  <span style={{ fontSize:11, color:'var(--tx2)', fontFamily:'var(--mono)', fontSize:10 }}>{row.label}</span>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {row.sub && <span style={{ fontSize:9, color:'var(--tx3)', fontFamily:'var(--mono)' }}>{row.sub}</span>}
                    <span style={{ fontFamily:'var(--mono)', fontSize: row.bold?15:13, fontWeight:row.bold?700:400, color:row.color, letterSpacing:'-0.5px' }}>
                      {row.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 月次テーブル ── */}
      <div style={{ background:'linear-gradient(145deg,var(--s0),var(--bg2))', border:'1px solid var(--bd0)', borderRadius:16, overflow:'hidden' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--bd0)' }}>
          <span className="label">MONTHLY DETAIL</span>
        </div>
        <table className="tbl">
          <thead><tr>
            <th>月</th>
            <th style={{ textAlign:'right' }}>売上</th>
            <th style={{ textAlign:'right' }}>外注費</th>
            <th style={{ textAlign:'right' }}>利益</th>
            <th style={{ textAlign:'right' }}>利益率</th>
            <th style={{ textAlign:'right' }}>請求額</th>
            <th style={{ textAlign:'right' }}>入金額</th>
            <th style={{ textAlign:'right' }}>完了</th>
          </tr></thead>
          <tbody>
            {[...monthlyData].reverse().map(d => {
              const rate = d.rev > 0 ? Math.round(d.profit / d.rev * 100) : 0;
              return (
                <tr key={d.m} style={{ background: d.isCurrent ? 'rgba(0,255,163,.03)' : 'transparent' }}>
                  <td style={{ fontFamily:'var(--mono)', fontSize:11, color:d.isCurrent?'var(--ac)':'var(--tx2)', fontWeight:d.isCurrent?700:400 }}>
                    {d.m.replace('-','/')}
                    {d.isCurrent && <span style={{ marginLeft:4, fontSize:8, color:'var(--ac)' }}>●</span>}
                  </td>
                  <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:11, color:'var(--tx1)' }}>{d.rev>0?fmt(d.rev):'—'}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:11, color:'var(--tx2)' }}>{d.out>0?fmt(d.out):'—'}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:11, fontWeight:600, color:d.profit>=0?'#22d3a5':'var(--red)' }}>{d.rev>0?fmt(d.profit):'—'}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:10, color:rate>=30?'#22d3a5':rate>=0?'var(--tx3)':'var(--red)' }}>{d.rev>0?rate+'%':'—'}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:11, color:'var(--tx2)' }}>{d.billed>0?fmt(d.billed):'—'}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:11, color:'var(--ac)' }}>{d.paid>0?fmt(d.paid):'—'}</td>
                  <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontSize:10, color:'var(--tx3)' }}>{d.count>0?d.count+'件':'—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
