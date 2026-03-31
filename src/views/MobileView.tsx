import { useState } from 'react';
import { STATUS_CONFIG, type Task, type TaskStatus } from '../types';
import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

type MobileTab = 'home' | 'tasks' | 'invoice' | 'report' | 'settings';

const MOBILE_NAV: { id: MobileTab; icon: string; label: string }[] = [
  { id: 'home',     icon: '◈', label: 'HOME'    },
  { id: 'tasks',    icon: '≡', label: 'TASKS'   },
  { id: 'invoice',  icon: '¥', label: 'INVOICE' },
  { id: 'report',   icon: '↗', label: 'REPORT'  },
  { id: 'settings', icon: '⊙', label: 'MORE'    },
];

export function MobileView({ store }: { store: Store }) {
  const [tab, setTab] = useState<MobileTab>('home');

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)', color: 'var(--tx)', overflow: 'hidden' }}>
      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {tab === 'home'     && <MobileHome store={store} onNav={setTab} />}
        {tab === 'tasks'    && <MobileTasks store={store} />}
        {tab === 'invoice'  && <MobileInvoice store={store} />}
        {tab === 'report'   && <MobileReport store={store} />}
        {tab === 'settings' && <MobileSettings store={store} />}
      </div>

      {/* Bottom nav */}
      <nav className="mobile-nav">
        {MOBILE_NAV.map(n => (
          <button key={n.id} className={`mobile-nav-btn${tab === n.id ? ' active' : ''}`}
            onClick={() => setTab(n.id)}>
            <span>{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ── HOME ─────────────────────────────────────────
function MobileHome({ store, onNav }: { store: Store; onNav: (t: MobileTab) => void }) {
  const { data, updateTask } = store;
  const td    = store.today();
  const month = store.thisMonth();

  const active   = data.tasks.filter(t => t.status !== 'done' && t.status !== 'stop');
  const late     = active.filter(t => t.deadline && t.deadline < td);
  const todayT   = active.filter(t => t.deadline === td);
  const urgent   = active.filter(t => t.priority === 'urgent');
  const high     = active.filter(t => t.priority === 'high');

  const mRev = data.tasks
    .filter(t => t.status === 'done' && (t.completedAt || '').startsWith(month))
    .reduce((a, t) => a + (t.revenue || 0), 0);

  const unpaidCount = data.invoices.filter(i => !i.paid).length;

  // 今日のタスク（締切=今日）+ 遅延タスク
  const todaySection = [
    ...late.sort((a,b) => (a.deadline||'').localeCompare(b.deadline||'')),
    ...todayT,
  ];
  // 直近3日以内（今日・遅延除く）
  const soon = active
    .filter(t => {
      if (!t.deadline || t.deadline <= td) return false;
      const days = Math.ceil((new Date(t.deadline).getTime() - new Date(td).getTime()) / 86400000);
      return days <= 3;
    })
    .sort((a,b) => (a.deadline||'').localeCompare(b.deadline||''));

  // 挨拶
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'おはようございます' : hr < 18 ? 'お疲れさまです' : 'お疲れさまです';

  const PRI_COLOR: Record<string, string> = { urgent:'var(--red)', high:'var(--gold)', medium:'var(--blue)', low:'transparent' };

  return (
    <div style={{ padding: '20px 16px 12px' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontFamily:'var(--head)', fontSize:22, letterSpacing:2, color:'var(--tx)', lineHeight:1 }}>
            BIRD<span style={{color:'var(--ac)'}}>FLIP</span>
          </div>
          <div style={{ fontSize:11, color:'var(--tx2)', marginTop:5 }}>{greet}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--tx3)', letterSpacing:'.1em' }}>{month.replace('-','/')}</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:13, color:'var(--ac)', marginTop:3, letterSpacing:'-0.5px' }}>
            ¥{mRev>=10000?(mRev/10000).toFixed(1)+'万':mRev.toLocaleString()}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display:'flex', gap:8, marginBottom:20, overflowX:'auto', paddingBottom:2 }}>
        {[
          { label:'進行中', value:active.length, color:'var(--tx2)', tap:()=>onNav('tasks') },
          { label:'遅延',   value:late.length,   color:late.length>0?'var(--red)':'var(--tx3)', tap:()=>onNav('tasks') },
          { label:'今日',   value:todayT.length, color:todayT.length>0?'var(--gold)':'var(--tx3)', tap:undefined },
          { label:'未回収', value:unpaidCount,   color:unpaidCount>0?'var(--gold)':'var(--tx3)', tap:()=>onNav('invoice') },
        ].map(k => (
          <div key={k.label} onClick={k.tap} style={{
            flexShrink:0, background:'var(--s0)', border:`1px solid ${k.value>0&&k.color!=='var(--tx2)'?k.color+'30':'var(--bd0)'}`,
            borderRadius:10, padding:'10px 14px', cursor:k.tap?'pointer':'default',
            minWidth:72, textAlign:'center',
          }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--tx3)', letterSpacing:'.1em', marginBottom:4 }}>{k.label}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:22, fontWeight:700, color:k.color, letterSpacing:'-1px', lineHeight:1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* 緊急バナー */}
      {(urgent.length > 0 || high.length > 0) && (
        <div style={{ background:'rgba(255,77,109,.06)', border:'1px solid rgba(255,77,109,.25)', borderRadius:12, padding:'11px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}
          onClick={()=>onNav('tasks')}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--red)', boxShadow:'0 0 8px var(--red)', flexShrink:0 }}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--red)' }}>
              {urgent.length>0?`緊急 ${urgent.length}件`:`優先度高 ${high.length}件`}
            </div>
            <div style={{ fontSize:10, color:'var(--tx3)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {[...urgent,...high].slice(0,2).map(t=>t.title).join('・')}
            </div>
          </div>
          <span style={{ color:'var(--tx3)', fontSize:16 }}>›</span>
        </div>
      )}

      {/* 今日のタスク */}
      {todaySection.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--gold)', letterSpacing:'.15em' }}>TODAY</div>
            <div style={{ flex:1, height:1, background:'rgba(255,209,102,.15)' }}/>
            <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--tx3)' }}>{todaySection.length}件</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {todaySection.map(t => (
              <TaskCard key={t.id} task={t} store={store} today={td} priColor={PRI_COLOR}/>
            ))}
          </div>
        </div>
      )}

      {/* 3日以内 */}
      {soon.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--tx3)', letterSpacing:'.15em' }}>3日以内</div>
            <div style={{ flex:1, height:1, background:'var(--bd0)' }}/>
            <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--tx3)' }}>{soon.length}件</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {soon.map(t => (
              <TaskCard key={t.id} task={t} store={store} today={td} priColor={PRI_COLOR}/>
            ))}
          </div>
        </div>
      )}

      {/* 何もない場合 */}
      {todaySection.length === 0 && soon.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--tx3)' }}>
          <div style={{ fontSize:28, marginBottom:8, opacity:.3 }}>◈</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.1em' }}>
            {active.length === 0 ? 'タスクなし' : '直近の締切タスクはありません'}
          </div>
          {active.length > 0 && (
            <button onClick={()=>onNav('tasks')} style={{ marginTop:12, background:'none', border:'none', color:'var(--ac)', fontSize:12, cursor:'pointer' }}>
              全タスクを見る →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── タスクカード（HOME用・ステータス変更可） ─────
function TaskCard({ task:t, store, today:td, priColor }: {
  task:Task; store:Store; today:string; priColor:Record<string,string>;
}) {
  const { updateTask } = store;
  const cfg    = STATUS_CONFIG[t.status];
  const isLate = t.deadline && t.deadline < td;
  const client = store.data.clients.find(c => c.id === t.clientId);
  const days   = t.deadline ? Math.ceil((new Date(t.deadline).getTime() - new Date(td).getTime()) / 86400000) : null;
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: isLate ? 'rgba(255,77,109,.04)' : 'linear-gradient(145deg,var(--s0),var(--bg2))',
      border: `1px solid ${isLate ? 'rgba(255,77,109,.3)' : 'var(--bd0)'}`,
      borderRadius:12,
      overflow:'hidden',
      transition:'border-color .15s',
    }}>
      {/* Main row */}
      <div style={{ display:'flex', alignItems:'stretch', gap:0 }} onClick={() => setExpanded(!expanded)}>
        {/* Priority bar */}
        <div style={{ width:3, background: priColor[t.priority]||'transparent', flexShrink:0,
          boxShadow: t.priority==='urgent' ? '0 0 6px var(--red)' : 'none' }}/>

        <div style={{ flex:1, padding:'12px 14px', minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--tx)', marginBottom:6, lineHeight:1.3 }}>{t.title}</div>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, background:cfg.color+'18', color:cfg.color, borderRadius:10, padding:'2px 8px' }}>
              {cfg.label}
            </span>
            {client && <span style={{ fontSize:10, color:'var(--tx3)' }}>{client.name}</span>}
            {t.deadline && (
              <span style={{ fontFamily:'var(--mono)', fontSize:10, color: isLate?'var(--red)':days===0?'var(--gold)':'var(--tx3)',
                fontWeight: days===0||isLate ? 700 : 400 }}>
                {isLate ? `${Math.abs(days!)}日超過` : days===0 ? '今日締切' : `${days}日後`}
              </span>
            )}
          </div>
        </div>

        {/* Progress + chevron */}
        <div style={{ padding:'12px 14px 12px 0', display:'flex', flexDirection:'column', alignItems:'flex-end', justifyContent:'space-between', flexShrink:0 }}>
          <span style={{ color:'var(--tx3)', fontSize:14, transition:'transform .15s', transform:expanded?'rotate(90deg)':'none' }}>›</span>
          <div>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--tx3)', textAlign:'right', marginBottom:3 }}>{t.progress}%</div>
            <div className="ptrack" style={{ width:40 }}>
              <div className="pfill" style={{ width:`${t.progress}%`, background:cfg.color, boxShadow:'none' }}/>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded: quick actions */}
      {expanded && (
        <div style={{ borderTop:'1px solid var(--bd0)', padding:'12px 14px' }}>
          {/* ステータス一覧をボタンで */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--tx3)', letterSpacing:'.1em', marginBottom:8 }}>ステータスを変更</div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {Object.entries(STATUS_CONFIG).filter(([k])=>k!=='stop').map(([k,v]) => (
                <button key={k} onClick={()=>{ updateTask(t.id, {status:k as TaskStatus}); setExpanded(false); }}
                  style={{
                    padding:'6px 12px', borderRadius:20, border:'none', cursor:'pointer', fontSize:11, fontWeight:600,
                    background: t.status===k ? v.color+'25' : 'var(--s2)',
                    color: t.status===k ? v.color : 'var(--tx3)',
                    boxShadow: t.status===k ? `0 0 0 1px ${v.color}50` : 'none',
                    transition:'all .12s',
                  }}>
                  {t.status===k && <span style={{marginRight:4}}>✓</span>}
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* 進捗スライダー */}
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--tx3)', letterSpacing:'.1em' }}>進捗</span>
              <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--ac)' }}>{t.progress}%</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={t.progress}
              onChange={e => updateTask(t.id, {progress:Number(e.target.value)})}
              style={{ width:'100%', accentColor:'var(--ac)', cursor:'pointer' }}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TASKS ────────────────────────────────────────
function MobileTasks({ store }: { store: Store }) {
  const { data, updateTask, deleteTask } = store;
  const td = store.today();
  const [filter, setFilter] = useState<'active' | 'done' | 'all'>('active');
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newPri, setNewPri] = useState<Task['priority']>('medium');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  let tasks = [...data.tasks];
  if (filter === 'active') tasks = tasks.filter(t => t.status !== 'done' && t.status !== 'stop');
  else if (filter === 'done') tasks = tasks.filter(t => t.status === 'done');

  const priOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  tasks.sort((a, b) => {
    if (a.status !== 'done' && b.status === 'done') return -1;
    const lateDiff = (b.deadline && b.deadline < td ? 1 : 0) - (a.deadline && a.deadline < td ? 1 : 0);
    if (lateDiff !== 0) return lateDiff;
    return (priOrder[a.priority] || 2) - (priOrder[b.priority] || 2);
  });

  const submit = () => {
    if (!newTitle.trim()) return;
    store.addTask({ title: newTitle.trim(), clientId: newClient, priority: newPri });
    setNewTitle(''); setNewClient(''); setAdding(false);
  };

  const PRI_C = { urgent: 'var(--red)', high: 'var(--gold)', medium: 'var(--blue)', low: 'var(--tx3)' };

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--head)', fontSize: 20, letterSpacing: 2 }}>TASKS</div>
        <button className="btn btn-ac" style={{ fontSize: 12, padding: '7px 14px' }}
          onClick={() => setAdding(!adding)}>
          {adding ? '✕' : '＋'}
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--s0)', border: '1px solid var(--bd0)', borderRadius: 10, padding: 4 }}>
        {[{ id: 'active' as const, label: '進行中' }, { id: 'done' as const, label: '完了' }, { id: 'all' as const, label: '全て' }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: filter === f.id ? 'var(--s2)' : 'transparent',
            color: filter === f.id ? 'var(--ac)' : 'var(--tx3)',
            fontSize: 12, fontFamily: 'var(--body)', fontWeight: 600,
            boxShadow: filter === f.id ? '0 0 0 1px rgba(0,255,163,.15)' : 'none',
          }}>{f.label}</button>
        ))}
      </div>

      {/* Add form */}
      {adding && (
        <div className="m-card" style={{ marginBottom: 12, borderColor: 'rgba(0,255,163,.25)' }}>
          <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setAdding(false); }}
            placeholder="タスク名を入力..." maxLength={60}
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: 'var(--tx)', marginBottom: 10, boxSizing: 'border-box' }}/>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <select value={newClient} onChange={e => setNewClient(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', fontSize: 12 }}>
              <option value="">案件なし</option>
              {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={newPri} onChange={e => setNewPri(e.target.value as Task['priority'])}
              style={{ padding: '8px 10px', fontSize: 12, color: PRI_C[newPri] }}>
              <option value="urgent">緊急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          <button className="btn btn-ac" style={{ width: '100%', fontSize: 13 }} onClick={submit}>追加</button>
        </div>
      )}

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--tx3)', fontFamily: 'var(--mono)', fontSize: 10 }}>
            NO TASKS
          </div>
        )}
        {tasks.map(t => {
          const cfg    = STATUS_CONFIG[t.status];
          const isLate = t.deadline && t.deadline < td && t.status !== 'done';
          const client = data.clients.find(c => c.id === t.clientId);
          const isExp  = expandedId === t.id;

          return (
            <div key={t.id} className="m-card" style={{ borderColor: isLate ? 'rgba(255,77,109,.25)' : 'var(--bd0)' }}>
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                onClick={() => setExpandedId(isExp ? null : t.id)}>
                {/* Priority bar */}
                <div style={{ width: 3, minHeight: 36, borderRadius: 2, flexShrink: 0, marginTop: 2,
                  background: t.priority === 'urgent' ? 'var(--red)' : t.priority === 'high' ? 'var(--gold)' : t.priority === 'medium' ? 'var(--blue)' : 'transparent',
                  opacity: t.priority === 'low' ? 0 : 1,
                }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.status === 'done' ? 'var(--tx3)' : 'var(--tx)', lineHeight: 1.3, marginBottom: 5 }}>
                    {t.status === 'done' && <span style={{ marginRight: 5, color: 'var(--ac)' }}>✓</span>}
                    {t.title}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, background: cfg.color + '18', color: cfg.color, borderRadius: 10, padding: '2px 8px' }}>
                      {cfg.label}
                    </span>
                    {client && <span style={{ fontSize: 10, color: 'var(--tx3)' }}>{client.name}</span>}
                    {t.deadline && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: isLate ? 'var(--red)' : 'var(--tx3)' }}>
                        {t.deadline.slice(5).replace('-', '/')}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ color: 'var(--tx3)', fontSize: 14, transition: 'transform .15s', transform: isExp ? 'rotate(90deg)' : 'none', flexShrink: 0 }}>›</span>
              </div>

              {/* Expanded controls */}
              {isExp && (
                <div className="anim-up" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--bd0)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--tx3)', marginBottom: 4 }}>ステータス</div>
                      <select value={t.status} onChange={e => updateTask(t.id, { status: e.target.value as TaskStatus })}
                        style={{ width: '100%', padding: '8px 10px', fontSize: 11, color: cfg.color, background: cfg.color + '12', border: `1px solid ${cfg.color}30` }}>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--tx3)', marginBottom: 4 }}>優先度</div>
                      <select value={t.priority} onChange={e => updateTask(t.id, { priority: e.target.value as Task['priority'] })}
                        style={{ width: '100%', padding: '8px 10px', fontSize: 11, color: PRI_C[t.priority] }}>
                        <option value="urgent">緊急</option><option value="high">高</option>
                        <option value="medium">中</option><option value="low">低</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--tx3)', marginBottom: 4 }}>締切日</div>
                      <input type="date" value={t.deadline} onChange={e => updateTask(t.id, { deadline: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', fontSize: 11 }}/>
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--tx3)', marginBottom: 4 }}>案件</div>
                      <select value={t.clientId} onChange={e => updateTask(t.id, { clientId: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', fontSize: 11 }}>
                        <option value="">なし</option>
                        {data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Progress */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--tx3)' }}>進捗</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ac)' }}>{t.progress}%</span>
                    </div>
                    <input type="range" min={0} max={100} step={5} value={t.progress}
                      onChange={e => updateTask(t.id, { progress: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: 'var(--ac)', cursor: 'pointer' }}/>
                  </div>
                  <button onClick={() => { if (confirm('削除？')) { deleteTask(t.id); setExpandedId(null); } }}
                    style={{ width: '100%', padding: '8px', background: 'rgba(255,77,109,.06)', border: '1px solid rgba(255,77,109,.2)', borderRadius: 8, color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>
                    削除
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── INVOICE ──────────────────────────────────────
function MobileInvoice({ store }: { store: Store }) {
  const { data, updateInvoice } = store;
  const td = store.today();
  const month = store.thisMonth();
  const [selMonth, setSelMonth] = useState(month);

  // 月リスト（存在する月 + 前後3ヶ月）
  const months = (() => {
    const s = new Set<string>();
    data.invoices.forEach(i => s.add(i.targetMonth));
    for (let i = -2; i <= 1; i++) {
      const d = new Date(); d.setMonth(d.getMonth() + i);
      s.add(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }
    return [...s].sort().reverse();
  })();

  const invs = data.invoices.filter(i => i.targetMonth === selMonth);
  const total = invs.reduce((a, inv) => {
    const sub = inv.items.reduce((s, it) => s + (it.amount || 0), 0);
    return a + (inv.taxType === 'exclusive' ? sub + Math.round(sub * 0.1) : sub);
  }, 0);

  const fmt = (n: number) => '¥' + n.toLocaleString();

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ fontFamily: 'var(--head)', fontSize: 20, letterSpacing: 2, marginBottom: 14 }}>INVOICE</div>

      {/* 月選択 */}
      <select value={selMonth} onChange={e => setSelMonth(e.target.value)}
        style={{ width: '100%', padding: '10px 14px', fontSize: 13, marginBottom: 16, fontFamily: 'var(--mono)', fontWeight: 600 }}>
        {months.map(m => <option key={m} value={m}>{m.replace('-', '/')}</option>)}
      </select>

      {/* 月合計 */}
      {total > 0 && (
        <div style={{ background: 'rgba(0,255,163,.06)', border: '1px solid rgba(0,255,163,.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ac)', letterSpacing: '.1em' }}>MONTH TOTAL</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--ac)', letterSpacing: '-1px' }}>{fmt(total)}</span>
        </div>
      )}

      {/* 請求書リスト */}
      {invs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--tx3)', fontFamily: 'var(--mono)', fontSize: 10 }}>
          この月の請求書はありません
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {invs.map(inv => {
            const client = data.clients.find(c => c.id === inv.clientId);
            const sub    = inv.items.reduce((a, it) => a + (it.amount || 0), 0);
            const tax    = inv.taxType === 'exclusive' ? Math.round(sub * 0.1) : inv.taxType === 'inclusive' ? Math.round(sub - sub / 1.1) : 0;
            const invTotal = inv.taxType === 'exclusive' ? sub + tax : sub;
            const isLate = inv.dueDate && inv.dueDate < td && !inv.paid;

            return (
              <div key={inv.id} className="m-card" style={{ borderColor: inv.paid ? 'rgba(0,255,163,.2)' : isLate ? 'rgba(255,77,109,.25)' : 'var(--bd0)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ac)', marginBottom: 4 }}>{inv.number}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>{client?.name || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: inv.paid ? 'var(--ac)' : 'var(--tx)', letterSpacing: '-1px' }}>{fmt(invTotal)}</div>
                    {inv.dueDate && <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: isLate ? 'var(--red)' : 'var(--tx3)', marginTop: 2 }}>期限 {inv.dueDate.slice(5).replace('-', '/')}</div>}
                  </div>
                </div>

                {/* Items */}
                {inv.items.length > 0 && (
                  <div style={{ marginBottom: 12, borderTop: '1px solid var(--bd0)', paddingTop: 10 }}>
                    {inv.items.map((it, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--tx2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{it.name}</span>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--tx1)', flexShrink: 0 }}>¥{it.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Badges + action */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {inv.paid
                    ? <span className="badge" style={{ color: 'var(--ac)', borderColor: 'rgba(0,255,163,.3)', background: 'rgba(0,255,163,.07)', fontSize: 9 }}>PAID</span>
                    : isLate
                      ? <span className="badge" style={{ color: 'var(--red)', borderColor: 'rgba(255,77,109,.3)', background: 'rgba(255,77,109,.07)', fontSize: 9 }}>OVERDUE</span>
                      : null
                  }
                  <div style={{ flex: 1 }}/>
                  <button onClick={() => updateInvoice(inv.id, { paid: !inv.paid, paidAt: inv.paid ? '' : td })}
                    style={{ padding: '7px 14px', fontSize: 11, borderRadius: 8, cursor: 'pointer', fontFamily: 'var(--mono)',
                      background: inv.paid ? 'rgba(255,77,109,.08)' : 'rgba(0,255,163,.08)',
                      border: inv.paid ? '1px solid rgba(255,77,109,.25)' : '1px solid rgba(0,255,163,.25)',
                      color: inv.paid ? 'var(--red)' : 'var(--ac)', letterSpacing: '.05em',
                    }}>
                    {inv.paid ? '✕ 未入金' : '✓ 入金済'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── REPORT ───────────────────────────────────────
function MobileReport({ store }: { store: Store }) {
  const { data } = store;
  const month = store.thisMonth();

  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }

  const monthlyData = months.map(m => {
    const done   = data.tasks.filter(t => t.status === 'done' && (t.completedAt || t.deadline || '').startsWith(m));
    const rev    = done.reduce((a, t) => a + (t.revenue || 0), 0);
    const out    = done.reduce((a, t) => a + (t.outsourceCost || 0), 0);
    return { m, rev, out, profit: rev - out, count: done.length, label: m.slice(5) + '月' };
  });

  const maxRev  = Math.max(...monthlyData.map(d => d.rev), 1);
  const current = monthlyData.find(d => d.m === month) || { rev: 0, out: 0, profit: 0 };
  const allDone = data.tasks.filter(t => t.status === 'done');
  const totalRev = allDone.reduce((a, t) => a + (t.revenue || 0), 0);
  const fmtM = (n: number) => n >= 10000 ? `¥${(n/10000).toFixed(1)}万` : `¥${n.toLocaleString()}`;

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ fontFamily: 'var(--head)', fontSize: 20, letterSpacing: 2, marginBottom: 14 }}>REPORT</div>

      {/* 今月KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          { label: '今月売上', value: fmtM(current.rev), color: 'var(--ac)' },
          { label: '今月利益', value: fmtM(current.profit), color: current.profit >= 0 ? '#22d3a5' : 'var(--red)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--s0)', border: '1px solid var(--bd0)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--tx3)', letterSpacing: '.12em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 600, color: k.color, letterSpacing: '-1px' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* 簡易バーチャート */}
      <div style={{ background: 'var(--s0)', border: '1px solid var(--bd0)', borderRadius: 14, padding: '16px', marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--tx3)', letterSpacing: '.12em', marginBottom: 14 }}>過去6ヶ月 売上</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
          {monthlyData.map(d => {
            const h = maxRev > 0 ? Math.round(d.rev / maxRev * 64) : 0;
            const isCur = d.m === month;
            return (
              <div key={d.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ height: 64, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                  <div style={{ width: '100%', height: Math.max(h, d.rev > 0 ? 2 : 0), borderRadius: '3px 3px 0 0',
                    background: isCur ? 'var(--ac)' : 'rgba(0,255,163,0.25)',
                    boxShadow: isCur ? '0 0 8px rgba(0,255,163,.4)' : 'none',
                  }}/>
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: isCur ? 'var(--ac)' : 'var(--tx3)' }}>{d.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 累計 */}
      <div style={{ background: 'var(--s0)', border: '1px solid var(--bd0)', borderRadius: 14, padding: '16px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--tx3)', letterSpacing: '.12em', marginBottom: 12 }}>TOTAL</div>
        {[
          { label: '累計売上', value: fmtM(totalRev), color: 'var(--ac)' },
          { label: '完了タスク', value: `${allDone.length}件`, color: 'var(--tx2)' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
            <span style={{ fontSize: 11, color: 'var(--tx2)' }}>{r.label}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: r.color }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SETTINGS (MOBILE) ────────────────────────────
function MobileSettings({ store }: { store: Store }) {
  const [newClient, setNewClient] = useState('');

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ fontFamily: 'var(--head)', fontSize: 20, letterSpacing: 2, marginBottom: 16 }}>MORE</div>

      {/* クライアント追加 */}
      <div style={{ background: 'var(--s0)', border: '1px solid var(--bd0)', borderRadius: 14, padding: '16px', marginBottom: 12 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--tx3)', letterSpacing: '.12em', marginBottom: 12 }}>CLIENT</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={newClient} onChange={e => setNewClient(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newClient.trim()) { store.addClient(newClient.trim()); setNewClient(''); }}}
            placeholder="案件名・クライアント名" style={{ flex: 1, padding: '9px 12px', fontSize: 12 }}/>
          <button className="btn btn-ac" style={{ fontSize: 12 }}
            onClick={() => { if (newClient.trim()) { store.addClient(newClient.trim()); setNewClient(''); }}}>追加</button>
        </div>
        {store.data.clients.map(c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid rgba(255,255,255,.03)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,255,163,.08)', border: '1px solid rgba(0,255,163,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ac)', flexShrink: 0 }}>
              {c.name.charAt(0)}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{c.name}</span>
          </div>
        ))}
      </div>

      {/* ユーザー */}
      <div style={{ background: 'var(--s0)', border: '1px solid var(--bd0)', borderRadius: 14, padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {store.user?.photoURL && <img src={store.user.photoURL} style={{ width: 40, height: 40, borderRadius: '50%' }}/>}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{store.user?.displayName || store.user?.email}</div>
            <div style={{ fontSize: 10, color: 'var(--tx3)', marginTop: 2 }}>{store.user?.email}</div>
          </div>
          <button onClick={() => { if (confirm('ログアウト？')) store.logout(); }}
            style={{ background: 'rgba(255,77,109,.08)', border: '1px solid rgba(255,77,109,.2)', borderRadius: 8, padding: '8px 14px', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}
