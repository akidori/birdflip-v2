import { useState, useEffect } from 'react';
import { useStore } from './store';
import { TaskTable }   from './views/TaskTable';
import { TaskBoard }   from './views/TaskBoard';
import { InvoiceView } from './views/InvoiceView';
import { Dashboard }   from './views/Dashboard';
import { GanttView }   from './views/GanttView';
import { ReportView }  from './views/ReportView';
import { SettingsView} from './views/SettingsView';
import { MobileView }  from './views/MobileView';

/* ── BirdFlip Logo Icon ── */
function BfLogo({size=20}:{size?:number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L4 8v8l8 5 8-5V8L12 3z" stroke="#00ffa3" strokeWidth="1.5" strokeLinejoin="round" fill="rgba(0,255,163,0.08)"/>
      <path d="M12 3v13M4 8l8 5 8-5" stroke="#00ffa3" strokeWidth="1.5" strokeLinejoin="round" opacity="0.6"/>
    </svg>
  );
}

export type View = 'dashboard'|'table'|'board'|'gantt'|'invoice'|'report'|'settings';

const NAV: {id:View; icon:string; label:string}[] = [
  {id:'dashboard', icon:'◈', label:'Overview'},
  {id:'table',     icon:'≡', label:'Tasks'},
  {id:'board',     icon:'⊞', label:'Board'},
  {id:'gantt',     icon:'▤', label:'Timeline'},
  {id:'invoice',   icon:'¥', label:'Invoice'},
  {id:'report',    icon:'↗', label:'Report'},
  {id:'settings',  icon:'⊙', label:'Settings'},
];

/* ── Background mesh ── */
function BgMesh() {
  return (
    <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,overflow:'hidden'}}>
      {/* Grid */}
      <div style={{
        position:'absolute',inset:0,
        backgroundImage:`
          linear-gradient(rgba(0,255,163,.025) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,163,.025) 1px, transparent 1px)
        `,
        backgroundSize:'48px 48px',
      }}/>
      {/* Aurora top-left */}
      <div style={{position:'absolute',top:-200,left:-150,width:600,height:500,
        background:'radial-gradient(ellipse, rgba(0,255,163,.07) 0%, transparent 65%)',
        filter:'blur(40px)',
      }}/>
      {/* Aurora bottom-right */}
      <div style={{position:'absolute',bottom:-200,right:-100,width:500,height:400,
        background:'radial-gradient(ellipse, rgba(75,142,255,.06) 0%, transparent 65%)',
        filter:'blur(40px)',
      }}/>
      {/* Subtle center */}
      <div style={{position:'absolute',top:'40%',left:'50%',transform:'translate(-50%,-50%)',
        width:800,height:400,
        background:'radial-gradient(ellipse, rgba(176,106,255,.03) 0%, transparent 65%)',
        filter:'blur(60px)',
      }}/>
    </div>
  );
}

export default function App() {
  const store = useStore();
  const [view, setView] = useState<View>('dashboard');
  const [col, setCol] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  /* ── Loading ── */
  if (store.loading) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',flexDirection:'column',gap:24}}>
      <BgMesh/>
      <div style={{position:'relative',zIndex:1,textAlign:'center'}}>
        <div style={{fontFamily:'var(--head)',fontSize:48,color:'var(--tx)',letterSpacing:4,lineHeight:1}}>
          BIRD<span style={{color:'var(--ac)'}}>FLIP</span>
        </div>
        <div style={{marginTop:20,height:1,width:120,margin:'20px auto 0',background:'var(--bd1)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,height:'100%',width:40,background:'linear-gradient(90deg,transparent,var(--ac),transparent)',animation:'scan 1.4s ease-in-out infinite'}}/>
        </div>
      </div>
    </div>
  );

  /* ── Login ── */
  if (!store.user) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',overflow:'hidden'}}>
      <BgMesh/>
      <div className="anim-up" style={{position:'relative',zIndex:1,width:360}}>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{
            display:'inline-flex',alignItems:'center',gap:12,
            background:'linear-gradient(135deg,rgba(0,255,163,.1),rgba(0,255,163,.03))',
            border:'1px solid rgba(0,255,163,.2)',
            borderRadius:14,padding:'10px 20px',
            boxShadow:'0 0 40px rgba(0,255,163,.1)',
            marginBottom:16,
          }}>
            <BfLogo size={24}/>
            <span style={{fontFamily:'var(--head)',fontSize:26,letterSpacing:2,color:'var(--tx)'}}>
              BIRD<span style={{color:'var(--ac)'}}>FLIP</span>
            </span>
          </div>
          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--tx2)',letterSpacing:'.22em'}}>
            VIDEO PRODUCTION OS
          </div>
        </div>

        {/* Card */}
        <div style={{
          background:'linear-gradient(145deg, rgba(13,22,40,.95), rgba(8,15,26,.98))',
          border:'1px solid var(--bd1)',
          borderRadius:20,padding:'32px',
          boxShadow:'0 32px 80px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06)',
        }}>
          <div style={{fontFamily:'var(--body)',fontSize:17,fontWeight:700,marginBottom:6,letterSpacing:'-.3px'}}>
            ようこそ
          </div>
          <div style={{fontSize:12,color:'var(--tx2)',marginBottom:28,lineHeight:1.6}}>
            Googleアカウントでサインインしてください
          </div>

          <button className="btn btn-ac" style={{width:'100%',padding:'13px 24px',fontSize:13}}
            onClick={()=>store.login()}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#00ffa3" opacity=".9"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#00ffa3" opacity=".65"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#00ffa3" opacity=".45"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#00ffa3" opacity=".8"/>
            </svg>
            Google でサインイン
          </button>

          <div style={{marginTop:20,paddingTop:16,borderTop:'1px solid var(--bd0)',fontFamily:'var(--mono)',fontSize:9,color:'var(--tx3)',letterSpacing:'.12em',textAlign:'center'}}>
            © BIRD FLIP INC. 中村
          </div>
        </div>
      </div>
    </div>
  );

  const active = store.data.tasks.filter(t=>t.status!=='done'&&t.status!=='stop');
  const late   = active.filter(t=>t.deadline&&t.deadline<store.today());
  const urgent = active.filter(t=>t.priority==='urgent');
  const high   = active.filter(t=>t.priority==='high');
  const gcOk   = store.data.gcal?.enabled&&store.data.gcal?.accessToken;
  const mRev   = store.data.tasks
    .filter(t=>t.status==='done'&&(t.completedAt||'').startsWith(store.thisMonth()))
    .reduce((a,t)=>a+(t.revenue||0),0);

  // ── モバイルは専用ビュー ──
  if (isMobile) return <MobileView store={store}/>;

  return (
    <div style={{height:'100vh',display:'flex',background:'var(--bg)',color:'var(--tx)',overflow:'hidden',position:'relative'}}>
      <BgMesh/>

      {/* ══ SIDEBAR ══ */}
      <aside style={{
        width:col?50:200, flexShrink:0,
        borderRight:'1px solid var(--bd0)',
        display:'flex',flexDirection:'column',
        transition:'width .22s cubic-bezier(.4,0,.2,1)',
        overflow:'hidden',
        position:'relative',zIndex:10,
        background:'linear-gradient(180deg, rgba(5,10,16,.98) 0%, rgba(2,4,8,.99) 100%)',
        backdropFilter:'blur(24px)',
      }}>
        {/* Logo */}
        <div style={{
          height:54,display:'flex',alignItems:'center',
          padding:col?'0 11px':'0 14px',
          borderBottom:'1px solid var(--bd0)',
          gap:9,flexShrink:0,
          justifyContent:col?'center':'flex-start',
        }}>
          <button onClick={()=>setCol(!col)} style={{
            width:26,height:26,borderRadius:7,
            background:'var(--g0)',border:'1px solid var(--bd1)',
            display:'flex',alignItems:'center',justifyContent:'center',
            color:'var(--tx2)',fontSize:10,flexShrink:0,
            transition:'all .15s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,255,163,.35)';e.currentTarget.style.color='var(--ac)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--bd1)';e.currentTarget.style.color='var(--tx2)';}}
          >{col?'▶':'◀'}</button>
          {!col&&(
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:'var(--head)',fontSize:16,letterSpacing:2,lineHeight:1,color:'var(--tx)'}}>
                BIRD<span style={{color:'var(--ac)'}}>FLIP</span>
              </div>
              {store.syncing&&<div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--ac)',opacity:.6,letterSpacing:'.15em',marginTop:2}}>SAVING...</div>}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:'8px 6px',overflowY:'auto',display:'flex',flexDirection:'column',gap:2}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>setView(n.id)}
              className={`nav-btn${view===n.id?' on':''}`}
              style={{justifyContent:col?'center':'flex-start',padding:col?'9px 0':'8px 10px'}}>
              <span style={{fontSize:14,width:18,textAlign:'center',flexShrink:0,lineHeight:1}}>{n.icon}</span>
              {!col&&<span>{n.label}</span>}
                            {!col&&n.id==='settings'&&gcOk&&<span style={{marginLeft:'auto',width:5,height:5,borderRadius:'50%',background:'var(--blue)',flexShrink:0}}/>}
            </button>
          ))}
        </nav>

        {/* Footer KPI */}
        {!col&&(
          <div style={{padding:'12px 12px 14px',borderTop:'1px solid var(--bd0)',flexShrink:0}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10}}>
              {[
                {l:'進行中',v:String(active.length),c:'var(--tx)',bg:'var(--g0)',bd:'var(--bd0)'},
                {l:'遅延',v:String(late.length),c:late.length>0?'var(--red)':'var(--tx2)',
                  bg:late.length>0?'rgba(255,77,109,.06)':'var(--g0)',
                  bd:late.length>0?'rgba(255,77,109,.2)':'var(--bd0)'},
              ].map(k=>(
                <div key={k.l} style={{background:k.bg,border:`1px solid ${k.bd}`,borderRadius:8,padding:'7px 9px'}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:7,color:'var(--tx2)',letterSpacing:'.12em',marginBottom:3}}>{k.l}</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:18,fontWeight:600,color:k.c,letterSpacing:'-1px',lineHeight:1}}>{k.v}</div>
                </div>
              ))}
            </div>
            {/* 優先度インジケーター */}
            {(urgent.length>0||high.length>0)&&(
              <div style={{display:'flex',gap:5,marginBottom:8,flexWrap:'wrap'}}>
                {urgent.length>0&&(
                  <div style={{display:'flex',alignItems:'center',gap:4,background:'rgba(255,77,109,.08)',border:'1px solid rgba(255,77,109,.2)',borderRadius:6,padding:'3px 7px'}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:'var(--red)',boxShadow:'0 0 5px var(--red)'}}/>
                    <span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--red)',letterSpacing:'.08em'}}>URGENT {urgent.length}</span>
                  </div>
                )}
                {high.length>0&&(
                  <div style={{display:'flex',alignItems:'center',gap:4,background:'rgba(255,209,102,.06)',border:'1px solid rgba(255,209,102,.18)',borderRadius:6,padding:'3px 7px'}}>
                    <div style={{width:5,height:5,borderRadius:'50%',background:'var(--gold)'}}/>
                    <span style={{fontFamily:'var(--mono)',fontSize:8,color:'var(--gold)',letterSpacing:'.08em'}}>HIGH {high.length}</span>
                  </div>
                )}
              </div>
            )}
            <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ac)',marginBottom:10,letterSpacing:'-.3px'}}>
              ¥{(mRev/10000).toFixed(1)}<span style={{fontSize:8,color:'var(--tx2)',marginLeft:2}}>万 今月</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              {store.user.photoURL
                ?<img src={store.user.photoURL} style={{width:22,height:22,borderRadius:'50%',border:'1px solid var(--bd1)',flexShrink:0}}/>
                :<div style={{width:22,height:22,borderRadius:'50%',background:'rgba(0,255,163,.1)',border:'1px solid rgba(0,255,163,.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,flexShrink:0}}>A</div>
              }
              <span style={{fontSize:10,color:'var(--tx2)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {store.user.displayName?.split(' ')[0]||store.user.email?.split('@')[0]}
              </span>
              <button onClick={()=>{if(confirm('ログアウト？'))store.logout();}}
                style={{background:'none',border:'none',color:'var(--tx3)',fontSize:12,padding:'2px 4px',lineHeight:1,transition:'color .15s'}}
                onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
                onMouseLeave={e=>e.currentTarget.style.color='var(--tx3)'}
              >⏻</button>
            </div>
          </div>
        )}
      </aside>

      {/* ══ MAIN ══ */}
      <main style={{flex:1,overflowY:'auto',overflowX:'hidden',position:'relative',zIndex:1}}>
        {/* 請求確認トースト（右下積み上げ） */}
        {store.billingPrompts.length > 0 && (
          <div style={{position:'fixed',bottom:20,right:20,zIndex:200,display:'flex',flexDirection:'column-reverse',gap:8,maxWidth:320}}>
            {store.billingPrompts.slice(0,3).map((p,i) => (
              <BillingToast key={p.taskId} prompt={p} index={i}
                onConfirm={(month)=>store.confirmBilling(p.taskId,month)}
                onSkip={()=>store.skipBilling(p.taskId)}
              />
            ))}
            {store.billingPrompts.length > 3 && (
              <div style={{fontSize:10,color:'var(--tx3)',textAlign:'right',fontFamily:'var(--mono)'}}>
                +{store.billingPrompts.length - 3}件
              </div>
            )}
          </div>
        )}


          <div style={{position:'fixed',bottom:20,right:20,zIndex:100,
            background:'var(--s1)',border:'1px solid rgba(0,255,163,.3)',
            borderRadius:10,padding:'9px 16px',
            display:'flex',alignItems:'center',gap:8,
            fontSize:11,color:'var(--ac)',
            boxShadow:'0 0 24px rgba(0,255,163,.12)',
            backdropFilter:'blur(20px)',
          }}>
            <span className="anim-blink" style={{width:6,height:6,borderRadius:'50%',background:'var(--ac)',display:'block'}}/>
            GCal 同期中...
          </div>
        )}
        {/* Save toast */}
        {store.migrateMsg&&(
          <div className="anim-up" style={{position:'fixed',top:18,right:18,zIndex:100,
            background:'rgba(8,15,26,.95)',border:'1px solid var(--bd2)',
            borderRadius:12,padding:'12px 20px',fontSize:12,color:'var(--tx)',
            boxShadow:'0 20px 60px rgba(0,0,0,.6)',backdropFilter:'blur(24px)',
          }}>
            {store.migrateMsg}
          </div>
        )}

        {view==='dashboard'&&<Dashboard  store={store} onNavigate={(v:View)=>setView(v)}/>}
        {view==='table'    &&<TaskTable  store={store}/>}
        {view==='board'    &&<TaskBoard  store={store}/>}
        {view==='gantt'    &&<GanttView  store={store}/>}
        {view==='invoice'  &&<InvoiceView store={store}/>}
        {view==='report'   &&<ReportView store={store}/>}
        {view==='settings' &&<SettingsView store={store}/>}
      </main>
    </div>
  );
}

// ─── 請求確認トースト ─────────────────────────────────
import { useState as _useState } from 'react';
function BillingToast({ prompt, index, onConfirm, onSkip }:
  { prompt: import('./store').BillingPrompt; index: number; onConfirm:(month:string)=>void; onSkip:()=>void }) {
  const [month, setMonth] = useState(prompt.suggestedMonth);
  return (
    <div className="anim-up" style={{
      background:'linear-gradient(145deg,var(--s1),var(--bg2))',
      border:'1px solid rgba(0,255,163,.25)',borderRadius:12,padding:'14px 16px',
      boxShadow:'0 8px 32px rgba(0,0,0,.5)',backdropFilter:'blur(20px)',
      animationDelay:`${index*0.05}s`,
    }}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
        <div style={{width:6,height:6,borderRadius:'50%',background:'var(--ac)',boxShadow:'0 0 6px var(--ac)',flexShrink:0}}/>
        <span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ac)',letterSpacing:'.1em'}}>請求に追加しますか？</span>
      </div>
      <div style={{marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:600,color:'var(--tx)',marginBottom:3,lineHeight:1.3}}>{prompt.taskTitle}</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:10,color:'var(--tx3)'}}>{prompt.clientName}</span>
          <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ac)',fontWeight:600}}>¥{prompt.revenue.toLocaleString()}</span>
        </div>
      </div>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:9,color:'var(--tx3)',fontFamily:'var(--mono)',letterSpacing:'.1em',marginBottom:4}}>請求月</div>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)}
          style={{width:'100%',padding:'6px 10px',fontSize:11,fontFamily:'var(--mono)'}}/>
      </div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={()=>onConfirm(month)} style={{
          flex:1,padding:'8px',fontSize:11,borderRadius:8,cursor:'pointer',
          background:'rgba(0,255,163,.12)',border:'1px solid rgba(0,255,163,.3)',
          color:'var(--ac)',fontWeight:700,fontFamily:'var(--mono)',letterSpacing:'.05em',
        }}>✓ 追加</button>
        <button onClick={onSkip} style={{
          padding:'8px 12px',fontSize:11,borderRadius:8,cursor:'pointer',
          background:'transparent',border:'1px solid var(--bd1)',color:'var(--tx3)',
        }}>スキップ</button>
      </div>
    </div>
  );
}
