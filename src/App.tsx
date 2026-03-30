import { useState } from 'react';
import { useStore } from './store';
import { TaskTable } from './views/TaskTable';
import { TaskBoard } from './views/TaskBoard';
import { InvoiceView } from './views/InvoiceView';
import { Dashboard } from './views/Dashboard';
import { GanttView } from './views/GanttView';
import { ReportView } from './views/ReportView';
import { SettingsView } from './views/SettingsView';
import { DiscordView } from './views/DiscordView';

export type View = 'dashboard' | 'table' | 'board' | 'gantt' | 'invoice' | 'report' | 'settings' | 'discord';

const NAV: { id: View; icon: string; label: string; sub?: string }[] = [
  { id: 'dashboard', icon: '◆', label: 'OVERVIEW',  sub: 'ダッシュボード' },
  { id: 'table',     icon: '≡', label: 'TASKS',     sub: 'テーブル' },
  { id: 'board',     icon: '▦', label: 'BOARD',     sub: 'カンバン' },
  { id: 'gantt',     icon: '▬', label: 'TIMELINE',  sub: 'ガント' },
  { id: 'invoice',   icon: '¥', label: 'INVOICE',   sub: '請求書' },
  { id: 'report',    icon: '↗', label: 'REPORT',    sub: 'レポート' },
  { id: 'discord',   icon: '✦', label: 'DISCORD',   sub: 'ピッピ' },
  { id: 'settings',  icon: '⚙', label: 'SETTINGS',  sub: '設定' },
];

export default function App() {
  const store = useStore();
  const [view, setView] = useState<View>('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  if (store.loading) {
    return (
      <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', flexDirection:'column', gap:16 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--accent)', letterSpacing:'0.2em' }}>BIRDFLIP</div>
        <div style={{ width:120, height:1, background:'var(--border2)', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:0, left:0, width:40, height:'100%', background:'var(--accent)', animation:'scan 1s linear infinite', transform:'rotate(0deg)' }} />
        </div>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', letterSpacing:'0.1em' }}>LOADING...</div>
      </div>
    );
  }

  if (!store.user) {
    return (
      <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
        <div style={{ textAlign:'center', width:280 }}>
          {/* Logo */}
          <div style={{ marginBottom:32 }}>
            <div style={{ fontFamily:'var(--head)', fontSize:32, fontWeight:800, color:'var(--accent)', letterSpacing:'-1px', lineHeight:1 }}>
              BIRD<span style={{ color:'var(--text3)' }}>FLIP</span>
            </div>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', letterSpacing:'0.25em', marginTop:6 }}>
              VIDEO PRODUCTION MANAGEMENT
            </div>
          </div>
          {/* Divider */}
          <div style={{ height:1, background:'linear-gradient(90deg, transparent, var(--border2), transparent)', margin:'0 0 28px' }} />
          {/* Login */}
          <button onClick={() => store.login()} style={{
            width:'100%', padding:'13px 24px',
            background:'var(--surface)', border:'1px solid var(--border2)',
            borderRadius:10, color:'var(--text)', fontSize:12, fontWeight:600,
            cursor:'pointer', fontFamily:'var(--head)', letterSpacing:'0.05em',
            transition:'all 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(74,244,200,0.4)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          >
            G  oogle でログイン
          </button>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', marginTop:16, letterSpacing:'0.08em' }}>
            © BIRD FLIP INC. 中村
          </div>
        </div>
      </div>
    );
  }

  const active = store.data.tasks.filter(t => t.status !== 'done' && t.status !== 'stop');
  const late = active.filter(t => t.deadline && t.deadline < store.today());
  const dcEnabled = store.data.discord?.enabled && store.data.discord?.webhookUrl;
  const thisM = store.thisMonth();
  const monthDone = store.data.tasks.filter(t => t.status === 'done' && (t.completedAt || '').startsWith(thisM));
  const monthRev = monthDone.reduce((a, t) => a + (t.revenue || 0), 0);

  return (
    <div className="grain" style={{ height:'100vh', display:'flex', background:'var(--bg)', color:'var(--text)', overflow:'hidden' }}>
      {/* ── SIDEBAR ── */}
      <aside style={{
        width: collapsed ? 48 : 200,
        flexShrink: 0,
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%)',
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '14px 0' : '14px 14px', borderBottom: '1px solid var(--border)', display:'flex', alignItems:'center', gap:8, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <button onClick={() => setCollapsed(!collapsed)}
            style={{ width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', color:'var(--accent)', fontSize:14, flexShrink:0 }}>
            {collapsed ? '▶' : '◀'}
          </button>
          {!collapsed && (
            <div style={{ minWidth:0, flex:1 }}>
              <div style={{ fontFamily:'var(--head)', fontSize:13, fontWeight:800, color:'var(--accent)', letterSpacing:'-0.3px', lineHeight:1 }}>BIRDFLIP</div>
              {store.syncing && <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--text3)', letterSpacing:'0.15em', marginTop:2 }}>SYNCING...</div>}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding: '8px 6px', overflowY:'auto', display:'flex', flexDirection:'column', gap:2 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`nav-item${view === n.id ? ' active' : ''}`}
              style={{ justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? '9px 0' : '8px 10px', width:'100%', textAlign:'left', background:'none', border: view===n.id ? '1px solid rgba(74,244,200,0.18)' : '1px solid transparent' }}>
              <span style={{ fontSize:12, width:16, textAlign:'center', flexShrink:0 }}>{n.icon}</span>
              {!collapsed && (
                <span style={{ lineHeight:1.1 }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, letterSpacing:'0.12em' }}>{n.label}</div>
                </span>
              )}
              {!collapsed && n.id === 'discord' && dcEnabled && (
                <span style={{ marginLeft:'auto', width:5, height:5, borderRadius:'50%', background:'#22c55e', flexShrink:0 }} />
              )}
            </button>
          ))}
        </nav>

        {/* Footer stats */}
        {!collapsed && (
          <div style={{ padding:'12px 14px', borderTop:'1px solid var(--border)' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', letterSpacing:'0.08em', marginBottom:6 }}>
              {store.thisMonth().replace('-', '/')} STATUS
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:9, color:'var(--text3)' }}>進行中</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--text2)' }}>{active.length}</span>
              </div>
              {late.length > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:9, color:'var(--red)' }}>⚠ 遅延</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--red)' }}>{late.length}</span>
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontSize:9, color:'var(--text3)' }}>今月売上</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent)' }}>¥{(monthRev/10000).toFixed(0)}万</span>
              </div>
            </div>
            {/* User */}
            <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6 }}>
              {store.user.photoURL && <img src={store.user.photoURL} style={{ width:20, height:20, borderRadius:'50%', border:'1px solid var(--border2)' }} />}
              <span style={{ fontSize:9, color:'var(--text3)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{store.user.displayName || store.user.email}</span>
              <button onClick={() => { if (confirm('ログアウトしますか？')) store.logout(); }}
                style={{ fontSize:11, color:'var(--text3)', background:'none', border:'none', cursor:'pointer', padding:0, lineHeight:1 }}
                title="ログアウト">⏻</button>
            </div>
          </div>
        )}
      </aside>

      {/* ── MAIN ── */}
      <main style={{ flex:1, overflowY:'auto', overflowX:'hidden', position:'relative' }}>
        {/* Toast */}
        {store.migrateMsg && (
          <div className="animate-fade-in" style={{
            position:'absolute', top:16, right:16, zIndex:50,
            background:'var(--surface2)', border:'1px solid var(--border2)',
            borderRadius:8, padding:'10px 16px', fontSize:11, color:'var(--text)',
            boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
          }}>
            {store.migrateMsg}
          </div>
        )}
        {view === 'dashboard' && <Dashboard store={store} onNavigate={(v: View) => setView(v)} />}
        {view === 'table'     && <TaskTable store={store} />}
        {view === 'board'     && <TaskBoard store={store} />}
        {view === 'gantt'     && <GanttView store={store} />}
        {view === 'invoice'   && <InvoiceView store={store} />}
        {view === 'report'    && <ReportView store={store} />}
        {view === 'settings'  && <SettingsView store={store} />}
        {view === 'discord'   && <DiscordView store={store} />}
      </main>
    </div>
  );
}
