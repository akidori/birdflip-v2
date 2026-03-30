import { useState } from 'react';
import { STATUS_CONFIG, type Task, type TaskStatus } from '../types';
import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

const PRI = {
  urgent: { label:'URGENT', color:'#ff4d6d', glow:'0 0 8px rgba(255,77,109,.5)' },
  high:   { label:'HIGH',   color:'#ffd166', glow:'0 0 6px rgba(255,209,102,.4)' },
  medium: { label:'MED',    color:'#4b8eff', glow:'none' },
  low:    { label:'LOW',    color:'#3a4a60', glow:'none' },
} as const;

const COLS: { id: TaskStatus; label: string }[] = [
  { id:'todo',    label:'未着手' },
  { id:'hearing', label:'ヒアリング' },
  { id:'plan',    label:'構成' },
  { id:'shoot',   label:'撮影' },
  { id:'edit',    label:'編集' },
  { id:'thumb',   label:'サムネ' },
  { id:'review',  label:'確認待ち' },
  { id:'fix',     label:'修正' },
  { id:'done',    label:'完了' },
  { id:'stop',    label:'停止' },
];

export function TaskBoard({ store }: { store: Store }) {
  const { data, updateTask, addTask } = store;
  const td = store.today();
  const [dragging, setDragging] = useState<string | null>(null);
  const [adding, setAdding] = useState<TaskStatus | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newClient, setNewClient] = useState('');

  const tasksByStatus = (status: TaskStatus) =>
    data.tasks
      .filter(t => t.status === status)
      .sort((a, b) => {
        const po = { urgent:0, high:1, medium:2, low:3 };
        return (po[a.priority]||2) - (po[b.priority]||2);
      });

  const handleDrop = (status: TaskStatus, e: React.DragEvent) => {
    e.preventDefault();
    if (dragging) { updateTask(dragging, { status }); setDragging(null); }
  };

  const submitNew = (status: TaskStatus) => {
    if (!newTitle.trim()) return;
    addTask({ title: newTitle.trim(), clientId: newClient, status });
    setNewTitle(''); setNewClient(''); setAdding(null);
  };

  return (
    <div style={{ display:'flex', gap:10, padding:'20px 16px 32px', overflowX:'auto', height:'100%', boxSizing:'border-box' }}>
      {COLS.map(col => {
        const tasks = tasksByStatus(col.id);
        const cfg   = STATUS_CONFIG[col.id];
        const urgentN = tasks.filter(t => t.priority==='urgent'||t.priority==='high').length;

        return (
          <div key={col.id}
            style={{ minWidth:220, maxWidth:220, display:'flex', flexDirection:'column', flexShrink:0 }}
            onDragOver={e=>e.preventDefault()}
            onDrop={e=>handleDrop(col.id,e)}
          >
            {/* Column header */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'10px 12px', marginBottom:8,
              background:'var(--s0)', border:'1px solid var(--bd0)',
              borderRadius:10,
              borderTop:`2px solid ${cfg.color}`,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:cfg.color, boxShadow:`0 0 6px ${cfg.color}80` }}/>
                <span style={{ fontFamily:'var(--head)', fontSize:13, letterSpacing:1, color:'var(--tx)' }}>{col.label.toUpperCase()}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                {urgentN>0&&(
                  <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--red)', background:'rgba(255,77,109,.1)', border:'1px solid rgba(255,77,109,.25)', borderRadius:10, padding:'1px 6px' }}>
                    ⚠{urgentN}
                  </span>
                )}
                <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--tx3)', background:'var(--s2)', borderRadius:10, padding:'2px 7px' }}>
                  {tasks.length}
                </span>
              </div>
            </div>

            {/* Cards */}
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7, overflowY:'auto', paddingBottom:8 }}>
              {tasks.map(t => <BoardCard key={t.id} task={t} store={store} td={td}
                onDragStart={()=>setDragging(t.id)} onDragEnd={()=>setDragging(null)}
                isDragging={dragging===t.id}/>)}

              {/* Add in column */}
              {adding===col.id ? (
                <div style={{ background:'var(--s1)', border:'1px solid rgba(0,255,163,.25)', borderRadius:10, padding:'10px 12px' }}>
                  <input autoFocus value={newTitle} onChange={e=>setNewTitle(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter') submitNew(col.id); if(e.key==='Escape') setAdding(null); }}
                    placeholder="タスク名..." maxLength={60}
                    style={{ background:'transparent', border:'none', outline:'none', width:'100%', fontSize:12, color:'var(--tx)', marginBottom:8 }}/>
                  <select value={newClient} onChange={e=>setNewClient(e.target.value)}
                    style={{ padding:'4px 8px', fontSize:10, width:'100%', marginBottom:8 }}>
                    <option value="">案件なし</option>
                    {store.data.clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-ac" style={{ flex:1, fontSize:10, padding:'5px' }} onClick={()=>submitNew(col.id)}>追加</button>
                    <button onClick={()=>setAdding(null)} style={{ background:'none', border:'none', color:'var(--tx3)', cursor:'pointer', fontSize:13 }}>✕</button>
                  </div>
                </div>
              ) : (
                <button onClick={()=>setAdding(col.id)} style={{
                  background:'transparent', border:'1px dashed var(--bd1)', borderRadius:10,
                  padding:'8px', color:'var(--tx3)', fontSize:11, cursor:'pointer', width:'100%',
                  transition:'all .15s', fontFamily:'var(--body)',
                }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor='rgba(0,255,163,.3)'; e.currentTarget.style.color='var(--ac)'; }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--bd1)'; e.currentTarget.style.color='var(--tx3)'; }}
                >＋</button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoardCard({ task:t, store, td, onDragStart, onDragEnd, isDragging }:
  { task:Task; store:Store; td:string; onDragStart:()=>void; onDragEnd:()=>void; isDragging:boolean }) {
  const { updateTask, deleteTask, data } = store;
  const client = data.clients.find(c=>c.id===t.clientId);
  const isLate = t.deadline&&t.deadline<td&&t.status!=='done'&&t.status!=='stop';
  const pri = PRI[t.priority]||PRI.medium;
  const cfg = STATUS_CONFIG[t.status];
  const isUrgent = t.priority==='urgent';

  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      style={{
        background: isUrgent?'rgba(255,77,109,.06)':'linear-gradient(145deg,var(--s0),var(--bg2))',
        border:`1px solid ${isUrgent?'rgba(255,77,109,.25)':isLate?'rgba(255,77,109,.2)':'var(--bd0)'}`,
        borderRadius:10, padding:'11px 13px', cursor:'grab',
        opacity: isDragging?0.4:1,
        transition:'opacity .15s, transform .15s, box-shadow .15s',
        transform: isDragging?'scale(0.97)':'none',
      }}
      onMouseEnter={e=>{ if(!isDragging){e.currentTarget.style.borderColor=isUrgent?'rgba(255,77,109,.45)':'rgba(0,255,163,.2)'; e.currentTarget.style.boxShadow=isUrgent?'0 0 12px rgba(255,77,109,.12)':'0 0 12px rgba(0,0,0,.4)'; }}}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=isUrgent?'rgba(255,77,109,.25)':isLate?'rgba(255,77,109,.2)':'var(--bd0)'; e.currentTarget.style.boxShadow='none'; }}
    >
      {/* Priority + client */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:7 }}>
        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
          <div style={{ width:5, height:5, borderRadius:'50%', background:pri.color, boxShadow:pri.glow, flexShrink:0 }}/>
          <span style={{ fontFamily:'var(--mono)', fontSize:8, color:pri.color, letterSpacing:'.06em' }}>{pri.label}</span>
        </div>
        {client&&<span style={{ fontSize:9, color:'var(--tx3)', fontFamily:'var(--mono)' }}>{client.name}</span>}
      </div>

      {/* Title */}
      <div style={{ fontSize:12, fontWeight:600, color:'var(--tx)', marginBottom:9, lineHeight:1.3 }}>{t.title}</div>

      {/* Progress bar */}
      <div className="ptrack" style={{ marginBottom:8 }}>
        <div className="pfill" style={{ width:t.progress+'%', background:cfg.color, boxShadow:`0 0 4px ${cfg.color}60` }}/>
      </div>

      {/* Footer */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {t.deadline&&(
            <span style={{ fontFamily:'var(--mono)', fontSize:9, color:isLate?'var(--red)':'var(--tx3)' }}>
              {t.deadline.slice(5).replace('-','/')}
            </span>
          )}
          {t.revenue>0&&<span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--tx3)' }}>¥{(t.revenue/10000).toFixed(1)}万</span>}
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <select value={t.status} onChange={e=>updateTask(t.id,{status:e.target.value as TaskStatus})}
            style={{ background:'transparent', border:'none', outline:'none', fontSize:9, color:cfg.color, fontFamily:'var(--mono)', cursor:'pointer' }}>
            {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={()=>{ if(confirm('削除？')) deleteTask(t.id); }}
            style={{ background:'none', border:'none', fontSize:11, color:'var(--tx4)', cursor:'pointer', padding:0, lineHeight:1 }}
            onMouseEnter={e=>e.currentTarget.style.color='var(--red)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--tx4)'}
          >✕</button>
        </div>
      </div>
    </div>
  );
}
