import { useState, useEffect } from 'react';
import { STATUS_CONFIG, type Task, type TaskStatus } from '../types';
import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

const PRI = {
  urgent: { label:'URGENT', color:'#ff4d6d', bg:'rgba(255,77,109,.12)', border:'rgba(255,77,109,.35)' },
  high:   { label:'HIGH',   color:'#ffd166', bg:'rgba(255,209,102,.08)', border:'rgba(255,209,102,.25)' },
  medium: { label:'MED',    color:'#4b8eff', bg:'rgba(75,142,255,.07)', border:'rgba(75,142,255,.2)' },
  low:    { label:'LOW',    color:'#3a4a60', bg:'transparent', border:'rgba(255,255,255,.08)' },
} as const;

const PRI_ORDER = { urgent:0, high:1, medium:2, low:3 };

function AddTaskRow({ store, onDone }: { store: Store; onDone: () => void }) {
  const [title, setTitle]     = useState('');
  const [clientId, setCid]    = useState('');
  const [deadline, setDl]     = useState('');
  const [priority, setPri]    = useState<Task['priority']>('medium');

  const submit = () => {
    if (!title.trim()) return;
    store.addTask({ title: title.trim(), clientId, deadline, priority });
    setTitle(''); setCid(''); setDl(''); setPri('medium');
    onDone();
  };

  return (
    <tr style={{ background:'rgba(0,255,163,.04)', borderBottom:'1px solid rgba(0,255,163,.15)' }}>
      <td style={{ width:4, padding:0 }}>
        <div style={{ width:3, height:'100%', minHeight:36, background:'var(--ac)', borderRadius:'0 2px 2px 0' }}/>
      </td>
      <td style={{ padding:'6px 8px', color:'var(--tx3)', fontFamily:'var(--mono)', fontSize:9 }}>NEW</td>
      <td style={{ padding:'6px 8px' }} colSpan={2}>
        <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if(e.key==='Enter') submit(); if(e.key==='Escape') onDone(); }}
          placeholder="タスク名を入力..." maxLength={80}
          style={{ background:'transparent', border:'none', outline:'none', width:'100%', color:'var(--tx)', fontSize:12, fontWeight:600 }}/>
      </td>
      <td style={{ padding:'6px 8px' }}>
        <select value={clientId} onChange={e => setCid(e.target.value)}
          style={{ padding:'4px 8px', fontSize:11, width:'100%' }}>
          <option value="">案件なし</option>
          {store.data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      <td style={{ padding:'6px 8px' }}>
        <input type="date" value={deadline} onChange={e => setDl(e.target.value)}
          style={{ background:'transparent', border:'none', outline:'none', fontSize:11, color:'var(--tx2)', width:'100%' }}/>
      </td>
      <td style={{ padding:'6px 8px' }}>
        <select value={priority} onChange={e => setPri(e.target.value as Task['priority'])}
          style={{ padding:'4px 8px', fontSize:11, width:'100%', color: PRI[priority].color, background:'var(--s1)', border:`1px solid ${PRI[priority].border}`, borderRadius:6 }}>
          <option value="urgent">緊急</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
      </td>
      <td colSpan={4}/>
      <td style={{ padding:'6px 8px' }}>
        <div style={{ display:'flex', gap:6 }}>
          <button className="btn btn-ac" style={{ padding:'4px 12px', fontSize:10 }} onClick={submit}>追加</button>
          <button onClick={onDone} style={{ background:'none', border:'none', color:'var(--tx3)', fontSize:14, cursor:'pointer' }}>✕</button>
        </div>
      </td>
    </tr>
  );
}

function AddClientModal({ store, onClose }: { store: Store; onClose: () => void }) {
  const [name, setName] = useState('');
  const submit = () => { if (!name.trim()) return; store.addClient(name.trim()); onClose(); };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.7)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center' }}
      onClick={onClose}>
      <div style={{ background:'var(--s1)', border:'1px solid var(--bd2)', borderRadius:14, padding:24, width:300,
        boxShadow:'0 24px 64px rgba(0,0,0,.6)' }} onClick={e => e.stopPropagation()}>
        <div className="label" style={{ marginBottom:12 }}>案件を追加</div>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if(e.key==='Enter') submit(); if(e.key==='Escape') onClose(); }}
          placeholder="例: FANTS様 4月" maxLength={40}
          style={{ width:'100%', padding:'9px 12px', fontSize:12, marginBottom:14, boxSizing:'border-box' }}/>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost" style={{ fontSize:11 }} onClick={onClose}>キャンセル</button>
          <button className="btn btn-ac" style={{ fontSize:11 }} onClick={submit}>追加</button>
        </div>
      </div>
    </div>
  );
}

export function TaskTable({ store }: { store: Store }) {
  const { data, updateTask, deleteTask } = store;
  const [filter, setFilter] = useState({
    search: '', status: 'active', client: 'all',
    priority: 'all', assignee: 'all', overdue: false,
  });

  // Cmd+K で検索フォーカス
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('task-search')?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  const [sortKey, setSortKey] = useState<'deadline'|'status'|'priority'|'title'>('priority');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');
  const [adding, setAdding]   = useState(false);
  const [showModal, setModal] = useState(false);
  const td = store.today();
  const month = store.thisMonth();

  let tasks = [...data.tasks];
  if (filter.status==='active')    tasks = tasks.filter(t => t.status!=='done'&&t.status!=='stop');
  else if (filter.status!=='all')  tasks = tasks.filter(t => t.status===filter.status);
  if (filter.client!=='all')       tasks = tasks.filter(t => t.clientId===filter.client);
  if (filter.priority!=='all')     tasks = tasks.filter(t => t.priority===filter.priority);
  if (filter.assignee!=='all')     tasks = tasks.filter(t => t.assignee===filter.assignee);
  if (filter.overdue)              tasks = tasks.filter(t => t.deadline&&t.deadline<td&&t.status!=='done'&&t.status!=='stop');
  if (filter.search) {
    const s = filter.search.toLowerCase();
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(s) ||
      t.assignee.toLowerCase().includes(s) ||
      (data.clients.find(c=>c.id===t.clientId)?.name||'').toLowerCase().includes(s)
    );
  }

  const staOrder = Object.keys(STATUS_CONFIG);
  tasks.sort((a,b) => {
    let cmp = 0;
    if (sortKey==='deadline')  cmp=(a.deadline||'z').localeCompare(b.deadline||'z');
    else if (sortKey==='priority') cmp=(PRI_ORDER[a.priority]||2)-(PRI_ORDER[b.priority]||2);
    else if (sortKey==='status')   cmp=staOrder.indexOf(a.status)-staOrder.indexOf(b.status);
    else cmp=a.title.localeCompare(b.title);
    return sortDir==='asc'?cmp:-cmp;
  });

  const handleSort = (k: typeof sortKey) => {
    if (sortKey===k) setSortDir(d=>d==='asc'?'desc':'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  const monthRevenue = data.tasks
    .filter(t=>t.status==='done'&&(t.completedAt||'').startsWith(month))
    .reduce((a,t)=>a+(t.revenue||0),0);

  const urgentCount = tasks.filter(t=>t.priority==='urgent'||t.priority==='high').length;
  const overdueCount = data.tasks.filter(t=>t.deadline&&t.deadline<td&&t.status!=='done'&&t.status!=='stop').length;
  const activeFilterCount = [
    filter.status!=='active', filter.client!=='all',
    filter.priority!=='all', filter.assignee!=='all', filter.overdue,
  ].filter(Boolean).length;

  // 担当者リスト（タスクに入力されているもの）
  const assignees = [...new Set(data.tasks.map(t=>t.assignee).filter(Boolean))];

  const clearFilters = () => setFilter({ search:'', status:'active', client:'all', priority:'all', assignee:'all', overdue:false });

  const SH = ({ k, label }: { k: typeof sortKey; label: string }) => (
    <span onClick={()=>handleSort(k)} style={{ cursor:'pointer', userSelect:'none', color: sortKey===k?'var(--ac)':'var(--tx2)', display:'flex', alignItems:'center', gap:3 }}>
      {label}
      {sortKey===k&&<span style={{ fontSize:8 }}>{sortDir==='asc'?'↑':'↓'}</span>}
    </span>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {showModal&&<AddClientModal store={store} onClose={()=>setModal(false)}/>}

      {/* Toolbar */}
      <div style={{
        display:'flex', alignItems:'center', gap:8,
        padding:'10px 16px', borderBottom:'1px solid var(--bd0)',
        flexShrink:0, background:'rgba(2,4,8,.95)', backdropFilter:'blur(20px)',
        flexWrap:'wrap',
      }}>
        {urgentCount>0&&(
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,77,109,.08)', border:'1px solid rgba(255,77,109,.2)', borderRadius:8, padding:'5px 10px' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'var(--red)', boxShadow:'0 0 6px var(--red)' }}/>
            <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--red)', letterSpacing:'.1em' }}>
              PRIORITY {urgentCount}
            </span>
          </div>
        )}
        <div style={{ position:'relative', flexShrink:0 }}>
          <input value={filter.search} onChange={e=>setFilter({...filter,search:e.target.value})}
            placeholder="検索... (⌘K)" style={{ padding:'7px 12px 7px 32px', fontSize:11, width:160 }}
            onKeyDown={e=>{ if(e.key==='Escape') setFilter({...filter,search:''}); }}
            id="task-search"
          />
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:12, color:'var(--tx3)', pointerEvents:'none' }}>⌕</span>
          {filter.search && (
            <button onClick={()=>setFilter({...filter,search:''})} style={{
              position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', color:'var(--tx3)', cursor:'pointer', fontSize:12, padding:0, lineHeight:1,
            }}>✕</button>
          )}
        </div>
        <select value={filter.status} onChange={e=>setFilter({...filter,status:e.target.value})}
          style={{ padding:'7px 10px', fontSize:11 }}>
          <option value="active">進行中</option>
          <option value="all">全て</option>
          {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filter.client} onChange={e=>setFilter({...filter,client:e.target.value})}
          style={{ padding:'7px 10px', fontSize:11 }}>
          <option value="all">全案件</option>
          {data.clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* 優先度フィルター */}
        <select value={filter.priority} onChange={e=>setFilter({...filter,priority:e.target.value})}
          style={{ padding:'7px 10px', fontSize:11, color: filter.priority!=='all'?'var(--gold)':'var(--tx2)',
            background: filter.priority!=='all'?'rgba(255,209,102,.08)':'var(--s1)',
            border: filter.priority!=='all'?'1px solid rgba(255,209,102,.3)':'1px solid var(--bd1)',
            borderRadius:'var(--r)',
          }}>
          <option value="all">全優先度</option>
          <option value="urgent">🔴 緊急</option>
          <option value="high">🟡 高</option>
          <option value="medium">🔵 中</option>
          <option value="low">⚫ 低</option>
        </select>

        {/* 担当者フィルター */}
        {assignees.length > 0 && (
          <select value={filter.assignee} onChange={e=>setFilter({...filter,assignee:e.target.value})}
            style={{ padding:'7px 10px', fontSize:11,
              background: filter.assignee!=='all'?'rgba(75,142,255,.08)':'var(--s1)',
              border: filter.assignee!=='all'?'1px solid rgba(75,142,255,.3)':'1px solid var(--bd1)',
              borderRadius:'var(--r)', color: filter.assignee!=='all'?'var(--blue)':'var(--tx2)',
            }}>
            <option value="all">全担当者</option>
            {assignees.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        )}

        {/* クイックフィルタ: 遅延のみ */}
        {overdueCount > 0 && (
          <button onClick={()=>setFilter({...filter,overdue:!filter.overdue})} style={{
            display:'flex', alignItems:'center', gap:5,
            padding:'6px 10px', borderRadius:'var(--r)', fontSize:10, cursor:'pointer',
            background: filter.overdue?'rgba(255,77,109,.15)':'rgba(255,77,109,.06)',
            border: `1px solid ${filter.overdue?'rgba(255,77,109,.5)':'rgba(255,77,109,.2)'}`,
            color:'var(--red)', fontFamily:'var(--mono)', letterSpacing:'.05em',
            transition:'all .15s',
          }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--red)', boxShadow:filter.overdue?'0 0 6px var(--red)':'none' }}/>
            遅延 {overdueCount}
          </button>
        )}

        {/* フィルタークリア */}
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} style={{
            padding:'6px 10px', borderRadius:'var(--r)', fontSize:10, cursor:'pointer',
            background:'transparent', border:'1px solid var(--bd1)', color:'var(--tx3)',
            display:'flex', alignItems:'center', gap:4,
          }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--bd2)'; e.currentTarget.style.color='var(--tx1)'; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--bd1)'; e.currentTarget.style.color='var(--tx3)'; }}
          >
            ✕ クリア <span style={{ fontFamily:'var(--mono)', fontSize:9, background:'var(--s2)', borderRadius:10, padding:'1px 5px' }}>{activeFilterCount}</span>
          </button>
        )}

        <div style={{ flex:1 }}/>
        {monthRevenue>0&&<span className="n-sm" style={{ color:'var(--ac)' }}>今月 ¥{monthRevenue.toLocaleString()}</span>}
        <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--tx3)' }}>{tasks.length}件</span>
        <button className="btn btn-ghost" style={{ fontSize:11, padding:'6px 12px' }} onClick={()=>setModal(true)}>＋ 案件</button>
        <button className="btn btn-ac" style={{ fontSize:11 }} onClick={()=>setAdding(true)}>＋ タスク</button>
      </div>
        {monthRevenue>0&&<span className="n-sm" style={{ color:'var(--ac)' }}>今月 ¥{monthRevenue.toLocaleString()}</span>}
        <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--tx3)' }}>{tasks.length}件</span>
        <button className="btn btn-ghost" style={{ fontSize:11, padding:'6px 12px' }} onClick={()=>setModal(true)}>＋ 案件</button>
        <button className="btn btn-ac" style={{ fontSize:11 }} onClick={()=>setAdding(true)}>＋ タスク</button>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto' }}>
        <table className="tbl" style={{ fontSize:12 }}>
          <thead style={{ position:'sticky', top:0, zIndex:10, background:'rgba(2,4,8,.98)' }}>
            <tr>
              <th style={{ width:4, padding:0 }}/>
              <th style={{ width:32 }}>#</th>
              <th><SH k="title" label="タスク名"/></th>
              <th style={{ width:120 }}>案件</th>
              <th style={{ width:110 }}><SH k="status" label="ステータス"/></th>
              <th style={{ width:110 }}><SH k="deadline" label="締切"/></th>
              <th style={{ width:90 }}><SH k="priority" label="優先度"/></th>
              <th style={{ textAlign:'right', width:90 }}>売上</th>
              <th style={{ textAlign:'right', width:80 }}>外注</th>
              <th style={{ width:90 }}>進捗</th>
              <th style={{ width:80 }}>担当</th>
              <th style={{ width:28 }}/>
            </tr>
          </thead>
          <tbody>
            {adding&&<AddTaskRow store={store} onDone={()=>setAdding(false)}/>}
            {tasks.map((t,i)=>(
              <TaskRow key={t.id} task={t} index={i} store={store} td={td}/>
            ))}
          </tbody>
        </table>
        {tasks.length===0&&!adding&&(
          <div style={{ textAlign:'center', padding:'60px 0', color:'var(--tx3)' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:28, opacity:.1, marginBottom:10 }}>≡</div>
            <div className="label">NO TASKS</div>
            <button onClick={()=>setAdding(true)} style={{ marginTop:10, background:'none', border:'none', color:'var(--ac)', fontSize:11, cursor:'pointer' }}>＋ タスクを追加</button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task:t, index, store, td }: { task:Task; index:number; store:ReturnType<typeof useStore>; td:string }) {
  const { updateTask, deleteTask, data } = store;
  const sta = STATUS_CONFIG[t.status];
  const pri = PRI[t.priority] || PRI.medium;
  const isLate = t.deadline&&t.deadline<td&&t.status!=='done'&&t.status!=='stop';
  const client = data.clients.find(c=>c.id===t.clientId);
  const isUrgent = t.priority==='urgent'||t.priority==='high';

  return (
    <tr style={{ background: isLate?'rgba(255,77,109,.025)': isUrgent?'rgba(255,209,102,.015)':'transparent' }}
      onMouseEnter={e=>e.currentTarget.style.background=isLate?'rgba(255,77,109,.04)':'rgba(0,255,163,.02)'}
      onMouseLeave={e=>e.currentTarget.style.background=isLate?'rgba(255,77,109,.025)':isUrgent?'rgba(255,209,102,.015)':'transparent'}
    >
      {/* Priority bar */}
      <td style={{ padding:0, width:4 }}>
        <div style={{
          width:3, height:'100%', minHeight:38,
          background: t.priority==='urgent'?'var(--red)':t.priority==='high'?'var(--gold)':t.priority==='medium'?'var(--blue)':'transparent',
          borderRadius:'0 2px 2px 0',
          boxShadow: t.priority==='urgent'?'0 0 6px var(--red)':t.priority==='high'?'0 0 6px var(--gold)':'none',
          opacity: t.priority==='low'?0:1,
        }}/>
      </td>
      <td style={{ padding:'8px 12px', color:'var(--tx3)', fontFamily:'var(--mono)', fontSize:9 }}>{index+1}</td>
      <td style={{ padding:'8px' }}>
        <input value={t.title} onChange={e=>updateTask(t.id,{title:e.target.value})}
          style={{ background:'transparent', border:'none', outline:'none', width:'100%', fontWeight:600, color:'var(--tx)', fontSize:12 }}/>
      </td>
      <td style={{ padding:'8px' }}>
        <select value={t.clientId} onChange={e=>updateTask(t.id,{clientId:e.target.value})}
          style={{ background:'transparent', border:'none', outline:'none', color:'var(--tx2)', fontSize:11, width:'100%', cursor:'pointer' }}>
          <option value="">—</option>
          {data.clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      <td style={{ padding:'8px' }}>
        <select value={t.status} onChange={e=>updateTask(t.id,{status:e.target.value as TaskStatus})}
          style={{ borderRadius:6, padding:'3px 8px', fontSize:9, border:'none', outline:'none', cursor:'pointer', fontFamily:'var(--mono)', fontWeight:600, background:sta.color+'18', color:sta.color }}>
          {Object.entries(STATUS_CONFIG).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
      </td>
      <td style={{ padding:'8px' }}>
        <input type="date" value={t.deadline} onChange={e=>updateTask(t.id,{deadline:e.target.value})}
          style={{ background:'transparent', border:'none', outline:'none', fontSize:11, color:isLate?'var(--red)':'var(--tx2)', width:'100%', fontWeight:isLate?700:400 }}/>
      </td>
      <td style={{ padding:'8px' }}>
        <select value={t.priority} onChange={e=>updateTask(t.id,{priority:e.target.value as Task['priority']})}
          style={{ background:pri.bg, border:`1px solid ${pri.border}`, borderRadius:20, padding:'3px 10px', fontSize:9, outline:'none', cursor:'pointer', fontFamily:'var(--mono)', color:pri.color, fontWeight:600 }}>
          <option value="urgent">緊急</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
      </td>
      <td style={{ padding:'8px', textAlign:'right' }}>
        <input type="number" value={t.revenue||''} onChange={e=>updateTask(t.id,{revenue:Number(e.target.value)})}
          style={{ background:'transparent', border:'none', outline:'none', width:'100%', textAlign:'right', fontFamily:'var(--mono)', fontSize:11, color:'var(--tx2)' }} placeholder="0"/>
      </td>
      <td style={{ padding:'8px', textAlign:'right' }}>
        <input type="number" value={t.outsourceCost||''} onChange={e=>updateTask(t.id,{outsourceCost:Number(e.target.value)})}
          style={{ background:'transparent', border:'none', outline:'none', width:'100%', textAlign:'right', fontFamily:'var(--mono)', fontSize:11, color:'var(--tx2)' }} placeholder="0"/>
      </td>
      <td style={{ padding:'8px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div className="ptrack" style={{ flex:1 }}><div className="pfill" style={{ width:t.progress+'%', background:sta.color }}/></div>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--tx3)', width:26, textAlign:'right' }}>{t.progress}%</span>
        </div>
      </td>
      <td style={{ padding:'8px' }}>
        <input value={t.assignee} onChange={e=>updateTask(t.id,{assignee:e.target.value})}
          style={{ background:'transparent', border:'none', outline:'none', width:'100%', color:'var(--tx2)', fontSize:11 }} placeholder="—"/>
      </td>
      <td style={{ padding:'8px' }}>
        <button onClick={()=>{ if(confirm('削除？')) deleteTask(t.id); }}
          style={{ background:'none', border:'none', color:'var(--tx4)', fontSize:12, cursor:'pointer', opacity:0, transition:'opacity .15s' }}
          onMouseEnter={e=>{ e.currentTarget.style.opacity='1'; e.currentTarget.style.color='var(--red)'; }}
          onMouseLeave={e=>{ e.currentTarget.style.opacity='0'; e.currentTarget.style.color='var(--tx4)'; }}
        >✕</button>
      </td>
    </tr>
  );
}
