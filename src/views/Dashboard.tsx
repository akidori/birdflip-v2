import { STATUS_CONFIG } from '../types';
import type { View } from '../App';
import type { useStore } from '../store';
type Store = ReturnType<typeof useStore>;

export function Dashboard({store,onNavigate}:{store:Store;onNavigate:(v:View)=>void}) {
  const {data}=store, td=store.today(), month=store.thisMonth();
  const active=data.tasks.filter(t=>t.status!=='done'&&t.status!=='stop');
  const late=active.filter(t=>t.deadline&&t.deadline<td);
  const todayDue=active.filter(t=>t.deadline===td);
  const monthDone=data.tasks.filter(t=>t.status==='done'&&(t.completedAt||t.deadline||'').startsWith(month));
  const mRev=monthDone.reduce((a,t)=>a+(t.revenue||0),0);
  const mOut=monthDone.reduce((a,t)=>a+(t.outsourceCost||0),0);
  const profit=mRev-mOut;
  const pipeline=active.reduce((a,t)=>a+(t.revenue||0),0);
  const fmtM=(n:number)=>n>=10000?'¥'+(n/10000).toFixed(1)+'万':'¥'+n.toLocaleString();
  const fmt=(n:number)=>'¥'+n.toLocaleString();

  const upcoming=active
    .filter(t=>t.deadline&&t.deadline>=td)
    .sort((a,b)=>(a.deadline||'').localeCompare(b.deadline||''))
    .slice(0,7);

  const byClient:{[k:string]:typeof active}={};
  active.forEach(t=>{
    const n=data.clients.find(c=>c.id===t.clientId)?.name||'未分類';
    if(!byClient[n])byClient[n]=[];
    byClient[n].push(t);
  });

  const S={
    page:{padding:'28px 32px 52px',maxWidth:1240,margin:'0 auto'},
    hdr:{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:32},
    kpiGrid:{display:'grid',gridTemplateColumns:'2.2fr 1fr 1fr 1fr',gap:12,marginBottom:20},
    mainGrid:{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:16,marginBottom:16},
    quickGrid:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10},
  };

  return(
    <div style={S.page}>
      {/* ── HEADER ── */}
      <div style={S.hdr as any}>
        <div>
          <div className="label" style={{marginBottom:8}}>{month.replace('-','/')} · PRODUCTION STATUS</div>
          <h1 style={{fontFamily:'var(--head)',fontSize:36,letterSpacing:2,margin:0,lineHeight:1,color:'var(--tx)'}}>
            OVERVIEW
          </h1>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {late.length>0&&<span className="badge" style={{color:'var(--red)',borderColor:'rgba(255,77,109,.3)',background:'rgba(255,77,109,.07)',fontSize:10}}>⚠ 遅延 {late.length}</span>}
          {todayDue.length>0&&<span className="badge" style={{color:'var(--gold)',borderColor:'rgba(255,209,102,.3)',background:'rgba(255,209,102,.07)',fontSize:10}}>⚡ 今日 {todayDue.length}</span>}
        </div>
      </div>

      {/* ── KPI ── */}
      <div style={S.kpiGrid as any}>
        {/* HERO */}
        <div style={{
          background:'linear-gradient(135deg, rgba(0,255,163,.08) 0%, rgba(0,255,163,.02) 50%, transparent 100%)',
          border:'1px solid rgba(0,255,163,.18)',
          borderRadius:18,padding:'26px 30px',position:'relative',overflow:'hidden',
        }}>
          <div style={{position:'absolute',top:-60,right:-60,width:200,height:200,
            background:'radial-gradient(circle, rgba(0,255,163,.14) 0%, transparent 65%)',
            pointerEvents:'none',
          }}/>
          <div className="label" style={{marginBottom:14}}>MONTHLY REVENUE</div>
          <div className="n-hero">{fmtM(mRev)}</div>
          <div style={{margin:'16px 0 8px'}}>
            <div className="ptrack"><div className="pfill" style={{width:`${Math.min(100,mRev/1000000*100)}%`}}/></div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <span style={{fontSize:11,color:'var(--tx2)'}}>粗利 {fmt(profit)}</span>
            <span className="n-sm" style={{color:'var(--tx2)'}}>{monthDone.length} 件完了</span>
          </div>
        </div>

        <Kpi label="PROFIT RATE" val={mRev>0?`${Math.round(profit/mRev*100)}%`:'—'} sub={`外注率 ${mRev>0?Math.round(mOut/mRev*100):0}%`} col={profit>=0?'var(--ac)':'var(--red)'}/>
        <Kpi label="PIPELINE" val={fmtM(pipeline)} sub={`進行中 ${active.length}件`} col="var(--blue)"/>
        <Kpi label="OVERDUE" val={String(late.length)} sub={`今日締切 ${todayDue.length}件`} col={late.length>0?'var(--red)':'var(--tx2)'} alert={late.length>0}/>
      </div>

      {/* ── MAIN 2-COL ── */}
      <div style={S.mainGrid as any}>
        {/* UPCOMING */}
        <div style={{background:'linear-gradient(145deg,var(--s0),var(--bg2))',border:'1px solid var(--bd0)',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid var(--bd0)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span className="label">UPCOMING DEADLINES</span>
            <button onClick={()=>onNavigate('table')} style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ac)',background:'none',border:'none',letterSpacing:'.1em'}}>ALL →</button>
          </div>
          {upcoming.length===0
            ?<div style={{padding:'32px',textAlign:'center',fontFamily:'var(--mono)',fontSize:9,color:'var(--tx3)',letterSpacing:'.12em'}}>NO UPCOMING DEADLINES</div>
            :<div>{upcoming.map((t,i)=>{
              const cl=data.clients.find(c=>c.id===t.clientId);
              const cfg=STATUS_CONFIG[t.status];
              const isLate=t.deadline&&t.deadline<td;
              const days=t.deadline?Math.ceil((new Date(t.deadline).getTime()-new Date(td).getTime())/86400000):null;
              return(
                <div key={t.id} style={{
                  padding:'10px 20px',display:'flex',alignItems:'center',gap:12,
                  borderBottom:i<upcoming.length-1?'1px solid rgba(255,255,255,.025)':'none',
                  transition:'background .1s',cursor:'default',
                }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(0,255,163,.025)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <div style={{width:7,height:7,borderRadius:'50%',background:cfg.color,flexShrink:0,boxShadow:`0 0 7px ${cfg.color}80`}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</div>
                    <div className="n-sm" style={{color:'var(--tx2)',marginTop:2}}>{cl?.name||'—'}</div>
                  </div>
                  <div style={{width:46,flexShrink:0}}>
                    <div className="ptrack"><div className="pfill" style={{width:`${t.progress}%`,boxShadow:'none'}}/></div>
                    <div className="n-sm" style={{color:'var(--tx2)',textAlign:'right',marginTop:3}}>{t.progress}%</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0,minWidth:68}}>
                    <div className="n-sm" style={{color:isLate?'var(--red)':days!==null&&days<=2?'var(--gold)':'var(--tx1)',fontSize:11}}>
                      {t.deadline?.slice(5).replace('-','/')}
                    </div>
                    {days!==null&&<div className="n-sm" style={{color:isLate?'var(--red)':'var(--tx3)',marginTop:2}}>
                      {isLate?`+${Math.abs(days)}d`:days===0?'TODAY':`${days}d`}
                    </div>}
                  </div>
                </div>
              );
            })}</div>
          }
        </div>

        {/* BY CLIENT */}
        <div style={{background:'linear-gradient(145deg,var(--s0),var(--bg2))',border:'1px solid var(--bd0)',borderRadius:16,overflow:'hidden'}}>
          <div style={{padding:'14px 20px',borderBottom:'1px solid var(--bd0)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span className="label">BY CLIENT</span>
            <button onClick={()=>onNavigate('board')} style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ac)',background:'none',border:'none',letterSpacing:'.1em'}}>BOARD →</button>
          </div>
          {Object.keys(byClient).length===0
            ?<div style={{padding:'32px',textAlign:'center',fontFamily:'var(--mono)',fontSize:9,color:'var(--tx3)',letterSpacing:'.12em'}}>NO ACTIVE TASKS</div>
            :<div>{Object.entries(byClient).map(([name,tasks],i,arr)=>{
              const rev=tasks.reduce((a,t)=>a+(t.revenue||0),0);
              const lateN=tasks.filter(t=>t.deadline&&t.deadline<td).length;
              return(
                <div key={name} style={{
                  padding:'12px 20px',
                  borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,.025)':'none',
                  transition:'background .1s',cursor:'default',
                }}
                  onMouseEnter={e=>e.currentTarget.style.background='rgba(0,255,163,.02)'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}
                >
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:7}}>
                    <span style={{fontSize:12,fontWeight:600}}>{name}</span>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      {lateN>0&&<span className="n-sm" style={{color:'var(--red)'}}>⚠{lateN}</span>}
                      <span className="n-sm" style={{color:'var(--tx1)',fontSize:11}}>{fmtM(rev)}</span>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:8}}>
                    {tasks.slice(0,6).map(t=>{
                      const cfg=STATUS_CONFIG[t.status];
                      return<span key={t.id} className="badge" style={{color:cfg.color,borderColor:cfg.color+'28',background:cfg.color+'0c',fontSize:8}}>{cfg.label}</span>;
                    })}
                    {tasks.length>6&&<span style={{fontSize:9,color:'var(--tx3)'}}>+{tasks.length-6}</span>}
                  </div>
                  <div className="ptrack">
                    <div className="pfill" style={{width:`${Math.round(tasks.filter(t=>t.status==='done').length/tasks.length*100)}%`,opacity:.5}}/>
                  </div>
                </div>
              );
            })}</div>
          }
        </div>
      </div>

      {/* ── QUICK NAV ── */}
      <div style={S.quickGrid as any}>
        {([
          {id:'table' as View,icon:'≡',label:'TASKS',sub:'タスク管理'},
          {id:'board' as View,icon:'⊞',label:'BOARD',sub:'カンバン'},
          {id:'invoice' as View,icon:'¥',label:'INVOICE',sub:'請求書'},
          {id:'report' as View,icon:'↗',label:'REPORT',sub:'収支レポート'},
        ]).map(item=>(
          <button key={item.id} onClick={()=>onNavigate(item.id)} style={{
            background:'linear-gradient(145deg,var(--s0),var(--bg2))',
            border:'1px solid var(--bd0)',
            borderRadius:14,padding:'18px 20px',cursor:'pointer',textAlign:'left',
            transition:'all .2s',
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(0,255,163,.2)';e.currentTarget.style.boxShadow='0 0 0 1px rgba(0,255,163,.06),0 8px 32px rgba(0,0,0,.4)';}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--bd0)';e.currentTarget.style.boxShadow='none';}}
          >
            <div style={{fontFamily:'var(--mono)',fontSize:20,color:'var(--tx2)',marginBottom:10,lineHeight:1}}>{item.icon}</div>
            <div style={{fontFamily:'var(--head)',fontSize:16,letterSpacing:2,color:'var(--tx)',marginBottom:4}}>{item.label}</div>
            <div style={{fontSize:10,color:'var(--tx2)'}}>{item.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Kpi({label,val,sub,col,alert}:{label:string;val:string;sub:string;col:string;alert?:boolean}){
  return(
    <div style={{
      background:alert?'rgba(255,77,109,.04)':'linear-gradient(145deg,var(--s0),var(--bg2))',
      border:alert?'1px solid rgba(255,77,109,.15)':'1px solid var(--bd0)',
      borderRadius:18,padding:'22px 24px',
    }}>
      <div className="label" style={{marginBottom:12}}>{label}</div>
      <div className="n-xl" style={{color:col,lineHeight:1}}>{val}</div>
      <div style={{fontSize:10,color:'var(--tx2)',marginTop:8}}>{sub}</div>
    </div>
  );
}
