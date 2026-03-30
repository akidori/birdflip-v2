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

  const fmt = (n: number) => '¥' + n.toLocaleString();
  const fmtM = (n: number) => '¥' + (n >= 10000 ? (n / 10000).toFixed(1) + '万' : n.toLocaleString());

  const upcoming = active
    .filter(t => t.deadline && t.deadline >= td)
    .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
    .slice(0, 6);

  const byClient: Record<string, typeof active> = {};
  active.forEach(t => {
    const cName = data.clients.find(c => c.id === t.clientId)?.name || '未分類';
    if (!byClient[cName]) byClient[cName] = [];
    byClient[cName].push(t);
  });

  return (
    <div style={{ padding:'28px 28px 40px', maxWidth:1100, margin:'0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', letterSpacing:'0.2em', marginBottom:6 }}>
            {month.replace('-', '/')} PRODUCTION STATUS
          </div>
          <div style={{ fontFamily:'var(--head)', fontSize:22, fontWeight:800, color:'var(--text)', letterSpacing:'-0.5px', lineHeight:1 }}>
            Overview
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {late.length > 0 && (
            <span className="tag" style={{ background:'rgba(255,77,109,0.1)', color:'var(--red)', border:'1px solid rgba(255,77,109,0.25)', fontSize:10 }}>
              ⚠ 遅延 {late.length}件
            </span>
          )}
          {todayDue.length > 0 && (
            <span className="tag" style={{ background:'rgba(245,197,67,0.1)', color:'var(--gold)', border:'1px solid rgba(245,197,67,0.25)', fontSize:10 }}>
              ⚡ 今日 {todayDue.length}件
            </span>
          )}
        </div>
      </div>

      {/* ── KPI GRID ── */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:10, marginBottom:24 }}>

        {/* 今月売上 - BIG */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'20px 24px', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, right:0, width:80, height:80, background:'radial-gradient(circle at top right, rgba(74,244,200,0.06), transparent 70%)', pointerEvents:'none' }} />
          <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text3)', letterSpacing:'0.18em', marginBottom:10 }}>MONTHLY REVENUE</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:30, fontWeight:700, color:'var(--accent)', letterSpacing:'-1.5px', lineHeight:1 }}>
            {fmtM(mRev)}
          </div>
          <div style={{ marginTop:10, height:2, background:'rgba(74,244,200,0.08)', borderRadius:1 }}>
            <div style={{ height:'100%', width: `${Math.min(100, mRev/1000000*100)}%`, background:'linear-gradient(90deg, var(--accent2), var(--accent))', borderRadius:1, minWidth: mRev > 0 ? 4 : 0 }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
            <span style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--mono)' }}>利益 {fmt(profit)}</span>
            <span style={{ fontSize:9, color:'var(--text3)', fontFamily:'var(--mono)' }}>{monthDone.length}件完了</span>
          </div>
        </div>

        {/* 利益率 */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'18px 20px' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text3)', letterSpacing:'0.18em', marginBottom:8 }}>PROFIT RATE</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:24, fontWeight:700, letterSpacing:'-1px', color: profit >= 0 ? '#22c55e' : 'var(--red)' }}>
            {mRev > 0 ? Math.round(profit/mRev*100) : 0}<span style={{ fontSize:14 }}>%</span>
          </div>
          <div style={{ fontSize:9, color:'var(--text3)', marginTop:6 }}>外注率 {outRate}%</div>
        </div>

        {/* パイプライン */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'18px 20px' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text3)', letterSpacing:'0.18em', marginBottom:8 }}>PIPELINE</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:700, letterSpacing:'-0.5px', color:'var(--blue)' }}>
            {fmtM(pipeline)}
          </div>
          <div style={{ fontSize:9, color:'var(--text3)', marginTop:6 }}>進行中 {active.length}件</div>
        </div>

        {/* 遅延 */}
        <div style={{ background:'var(--surface)', border: late.length > 0 ? '1px solid rgba(255,77,109,0.25)' : '1px solid var(--border)', borderRadius:10, padding:'18px 20px' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text3)', letterSpacing:'0.18em', marginBottom:8 }}>OVERDUE</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:24, fontWeight:700, letterSpacing:'-1px', color: late.length > 0 ? 'var(--red)' : 'var(--text3)' }}>
            {late.length}
          </div>
          <div style={{ fontSize:9, color:'var(--text3)', marginTop:6 }}>今日期限 {todayDue.length}件</div>
        </div>
      </div>

      {/* ── MAIN 2-COL ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:16 }}>

        {/* ── UPCOMING DEADLINES ── */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', letterSpacing:'0.15em' }}>UPCOMING DEADLINES</div>
            <button onClick={() => onNavigate('table')}
              style={{ fontSize:9, color:'var(--accent)', fontFamily:'var(--mono)', background:'none', border:'none', cursor:'pointer', letterSpacing:'0.08em' }}>
              ALL →
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div style={{ padding:'24px', textAlign:'center', color:'var(--text3)', fontSize:11, fontFamily:'var(--mono)' }}>
              NO UPCOMING DEADLINES
            </div>
          ) : (
            <div>
              {upcoming.map((t, i) => {
                const client = data.clients.find(c => c.id === t.clientId);
                const isLateItem = t.deadline && t.deadline < td;
                const daysLeft = t.deadline ? Math.ceil((new Date(t.deadline).getTime() - new Date(td).getTime()) / 86400000) : null;
                const cfg = STATUS_CONFIG[t.status];
                return (
                  <div key={t.id} style={{ padding:'12px 18px', borderBottom: i < upcoming.length-1 ? '1px solid rgba(126,210,255,0.04)' : 'none', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background: cfg.color, flexShrink:0 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.title}</div>
                      <div style={{ fontSize:9, color:'var(--text3)', marginTop:2 }}>{client?.name || '—'}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontFamily:'var(--mono)', fontSize:10, color: isLateItem ? 'var(--red)' : daysLeft !== null && daysLeft <= 2 ? 'var(--gold)' : 'var(--text2)' }}>
                        {t.deadline}
                      </div>
                      {daysLeft !== null && (
                        <div style={{ fontSize:9, fontFamily:'var(--mono)', color: isLateItem ? 'var(--red)' : 'var(--text3)' }}>
                          {isLateItem ? `${Math.abs(daysLeft)}日超過` : daysLeft === 0 ? '今日' : `${daysLeft}日後`}
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink:0 }}>
                      <div style={{ width:40 }}>
                        <div className="progress-track">
                          <div className="progress-fill" style={{ width: `${t.progress}%` }} />
                        </div>
                        <div style={{ fontSize:8, color:'var(--text3)', fontFamily:'var(--mono)', textAlign:'right', marginTop:2 }}>{t.progress}%</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── BY CLIENT ── */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', letterSpacing:'0.15em' }}>BY CLIENT</div>
            <button onClick={() => onNavigate('board')}
              style={{ fontSize:9, color:'var(--accent)', fontFamily:'var(--mono)', background:'none', border:'none', cursor:'pointer', letterSpacing:'0.08em' }}>
              BOARD →
            </button>
          </div>
          {Object.keys(byClient).length === 0 ? (
            <div style={{ padding:'24px', textAlign:'center', color:'var(--text3)', fontSize:11, fontFamily:'var(--mono)' }}>
              NO ACTIVE TASKS
            </div>
          ) : (
            <div>
              {Object.entries(byClient).map(([name, tasks], i, arr) => {
                const rev = tasks.reduce((a, t) => a + (t.revenue || 0), 0);
                const lateTasks = tasks.filter(t => t.deadline && t.deadline < td);
                return (
                  <div key={name} style={{ padding:'12px 18px', borderBottom: i < arr.length-1 ? '1px solid rgba(126,210,255,0.04)' : 'none' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'var(--text)' }}>{name}</div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        {lateTasks.length > 0 && (
                          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--red)' }}>⚠{lateTasks.length}</span>
                        )}
                        <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text2)' }}>{fmtM(rev)}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {tasks.slice(0, 5).map(t => {
                        const cfg = STATUS_CONFIG[t.status];
                        return (
                          <span key={t.id} className="tag" style={{ background: cfg.color + '18', color: cfg.color, border: `1px solid ${cfg.color}30`, fontSize:9 }}>
                            {cfg.label}
                          </span>
                        );
                      })}
                      {tasks.length > 5 && <span style={{ fontSize:9, color:'var(--text3)' }}>+{tasks.length - 5}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK ACTIONS ── */}
      <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
        {[
          { id:'table' as View, icon:'≡', label:'TASKS', sub:'テーブル' },
          { id:'board' as View, icon:'▦', label:'BOARD', sub:'カンバン' },
          { id:'invoice' as View, icon:'¥', label:'INVOICE', sub:'請求書' },
          { id:'report' as View, icon:'↗', label:'REPORT', sub:'レポート' },
        ].map(item => (
          <button key={item.id} onClick={() => onNavigate(item.id)}
            style={{
              background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8,
              padding:'14px 16px', cursor:'pointer', textAlign:'left',
              transition:'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(74,244,200,0.25)'; e.currentTarget.style.background = 'var(--surface2)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
          >
            <div style={{ fontFamily:'var(--mono)', fontSize:16, color:'var(--text3)', marginBottom:6 }}>{item.icon}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color:'var(--accent)', letterSpacing:'0.15em' }}>{item.label}</div>
            <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{item.sub}</div>
          </button>
        ))}
      </div>

    </div>
  );
}
