import { useState } from 'react';
import { STATUS_CONFIG, PHASES } from '../types';
import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

const PRI_COLOR = { urgent:'#ff4d6d', high:'#ffd166', medium:'#4b8eff', low:'#3a4a60' };

export function GanttView({ store }: { store: Store }) {
  const { data, updateTask } = store;
  const [filterClient, setFilter] = useState('all');
  const td = store.today();

  const tasks = data.tasks
    .filter(t => t.status!=='stop')
    .filter(t => filterClient==='all'||t.clientId===filterClient)
    .sort((a,b)=>(a.deadline||'z').localeCompare(b.deadline||'z'));

  // 表示月範囲を計算（前月〜3ヶ月後）
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate   = new Date(now.getFullYear(), now.getMonth() + 3, 31);

  // 月リスト
  const months: { year: number; month: number; label: string }[] = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    months.push({ year:cur.getFullYear(), month:cur.getMonth()+1, label:`${cur.getMonth()+1}月` });
    cur.setMonth(cur.getMonth()+1);
  }

  const totalDays = Math.ceil((endDate.getTime()-startDate.getTime())/86400000);
  const dateToX = (dateStr: string) => {
    const d = new Date(dateStr);
    const days = Math.floor((d.getTime()-startDate.getTime())/86400000);
    return Math.max(0,Math.min(100, days/totalDays*100));
  };
  const todayX = dateToX(td);

  return (
    <div style={{ padding:'24px 28px 48px', maxWidth:1400, margin:'0 auto' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <div className="label" style={{ marginBottom:8 }}>TIMELINE</div>
          <h1 style={{ fontFamily:'var(--head)', fontSize:32, letterSpacing:2, margin:0, lineHeight:1 }}>GANTT</h1>
        </div>
        <select value={filterClient} onChange={e=>setFilter(e.target.value)}
          style={{ padding:'8px 12px', fontSize:11 }}>
          <option value="all">全案件</option>
          {data.clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {tasks.length===0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'var(--tx3)' }}>
          <div className="label">NO TASKS</div>
        </div>
      ) : (
        <div style={{ background:'var(--s0)', border:'1px solid var(--bd0)', borderRadius:16, overflow:'hidden' }}>

          {/* Month header */}
          <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', borderBottom:'1px solid var(--bd0)' }}>
            <div style={{ padding:'10px 16px', borderRight:'1px solid var(--bd0)' }}>
              <span className="label">TASK</span>
            </div>
            <div style={{ display:'flex', position:'relative' }}>
              {months.map((m,i) => (
                <div key={i} style={{ flex:1, padding:'10px 8px', borderRight:i<months.length-1?'1px solid var(--bd0)':'none', textAlign:'center' }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--tx2)' }}>{m.label}</span>
                </div>
              ))}
              {/* Today marker in header */}
              <div style={{ position:'absolute', left:`${todayX}%`, top:0, bottom:0, width:1, background:'rgba(0,255,163,.4)', pointerEvents:'none' }}/>
            </div>
          </div>

          {/* Rows */}
          {tasks.map((t, i) => {
            const client = data.clients.find(c=>c.id===t.clientId);
            const cfg = STATUS_CONFIG[t.status];
            const priColor = PRI_COLOR[t.priority] || PRI_COLOR.medium;
            const isLate = t.deadline&&t.deadline<td&&t.status!=='done';

            return (
              <div key={t.id} style={{ display:'grid', gridTemplateColumns:'280px 1fr', borderBottom: i<tasks.length-1?'1px solid rgba(255,255,255,.03)':'none' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(0,255,163,.02)'}
                onMouseLeave={e=>e.currentTarget.style.background='transparent'}
              >
                {/* Left: task info */}
                <div style={{ padding:'10px 16px', borderRight:'1px solid var(--bd0)', display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:3, height:28, borderRadius:2, background:priColor, flexShrink:0, opacity:t.priority==='low'?0.2:1, boxShadow:t.priority==='urgent'?`0 0 6px ${priColor}`:'none' }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--tx)' }}>{t.title}</div>
                    <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:3 }}>
                      {client&&<span style={{ fontSize:9, color:'var(--tx3)', fontFamily:'var(--mono)' }}>{client.name}</span>}
                      <span className="badge" style={{ color:cfg.color, borderColor:cfg.color+'28', background:cfg.color+'0c', fontSize:8 }}>{cfg.label}</span>
                    </div>
                  </div>
                </div>

                {/* Right: timeline bar */}
                <div style={{ position:'relative', padding:'8px 0' }}>
                  {/* Today line */}
                  <div style={{ position:'absolute', left:`${todayX}%`, top:0, bottom:0, width:1, background:'rgba(0,255,163,.25)', pointerEvents:'none', zIndex:2 }}/>

                  {/* Deadline bar */}
                  {t.deadline&&(
                    <div style={{ position:'absolute', left:`${Math.max(0,dateToX(t.deadline)-2)}%`, top:'50%', transform:'translateY(-50%)', zIndex:3 }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:isLate?'var(--red)':cfg.color, boxShadow:isLate?'0 0 8px var(--red)':'none', transform:'rotate(45deg)' }}/>
                    </div>
                  )}

                  {/* Phase dots */}
                  {Object.entries(t.phases||{}).map(([phaseName, dateStr]) => {
                    if (!dateStr) return null;
                    const x = dateToX(dateStr);
                    return (
                      <div key={phaseName} style={{ position:'absolute', left:`${x}%`, top:'50%', transform:'translate(-50%,-50%)', zIndex:2 }}>
                        <div title={`${phaseName}: ${dateStr}`} style={{
                          width:7, height:7, borderRadius:'50%', background:'var(--blue)',
                          border:'1px solid var(--bg)',
                          cursor:'default',
                        }}/>
                      </div>
                    );
                  })}

                  {/* Phase editor on hover — click to set phase dates */}
                  <div style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', display:'flex', gap:4, zIndex:4 }}>
                    {t.deadline&&(
                      <input type="date" value={t.deadline}
                        onChange={e=>updateTask(t.id,{deadline:e.target.value})}
                        style={{ padding:'3px 6px', fontSize:9, width:110, opacity:0.8, fontFamily:'var(--mono)' }}/>
                    )}
                    {!t.deadline&&(
                      <input type="date" value=""
                        onChange={e=>updateTask(t.id,{deadline:e.target.value})}
                        placeholder="締切設定"
                        style={{ padding:'3px 6px', fontSize:9, width:110, opacity:0.5 }}/>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Phase legend */}
      <div style={{ marginTop:16, display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:10, height:10, background:'var(--ac)', transform:'rotate(45deg)', borderRadius:2 }}/>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--tx3)' }}>締切</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--blue)', border:'1px solid var(--bg)' }}/>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--tx3)' }}>フェーズ</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:1, height:12, background:'rgba(0,255,163,.4)' }}/>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--ac)' }}>今日</span>
        </div>
      </div>
    </div>
  );
}
