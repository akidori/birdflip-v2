import { useState } from 'react';
import type { useStore } from '../store';
import type { Objective, KeyResult } from '../types';

type Store = ReturnType<typeof useStore>;

const PERIODS = [
  { id: 'annual', label: '年間', color: '#00ffa3' },
  { id: 'q1',     label: 'Q1 (1-3月)', color: '#4b8eff' },
  { id: 'q2',     label: 'Q2 (4-6月)', color: '#a78bfa' },
  { id: 'q3',     label: 'Q3 (7-9月)', color: '#ffd166' },
  { id: 'q4',     label: 'Q4 (10-12月)', color: '#fb923c' },
] as const;

const PERIOD_COLOR: Record<string, string> = {
  annual: '#00ffa3', q1: '#4b8eff', q2: '#a78bfa', q3: '#ffd166', q4: '#fb923c'
};

function calcKRProgress(kr: KeyResult, tasks: Store['data']['tasks']): number {
  if (kr.target === 0) return 0;
  if (kr.autoCalc) {
    // タスクのrevenueを自動集計
    const linked = tasks.filter(t => kr.taskIds.includes(t.id) && t.status === 'done');
    const sum = linked.reduce((a, t) => a + (t.revenue || 0), 0);
    return Math.min(100, Math.round(sum / kr.target * 100));
  }
  return Math.min(100, Math.round(kr.current / kr.target * 100));
}

function calcObjProgress(obj: Objective, tasks: Store['data']['tasks']): number {
  if (obj.keyResults.length === 0) return 0;
  const avg = obj.keyResults.reduce((a, kr) => a + calcKRProgress(kr, tasks), 0) / obj.keyResults.length;
  return Math.round(avg);
}

// ── 円形プログレス ──────────────────────────────
function Ring({ pct, size = 56, color = '#00ffa3', label }: { pct: number; size?: number; color?: string; label?: string }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct / 100;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={5}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .4s ease' }}/>
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: size < 50 ? 10 : 13, fontWeight: 700, color, lineHeight: 1 }}>{pct}%</div>
        {label && <div style={{ fontSize: 7, color: 'var(--tx3)', marginTop: 1 }}>{label}</div>}
      </div>
    </div>
  );
}

// ── KR行 ──────────────────────────────────────
function KRRow({ kr, obj, store, year }: { kr: KeyResult; obj: Objective; store: Store; year: number }) {
  const { data, updateKeyResult, deleteKeyResult } = store;
  const [editing, setEditing] = useState(false);
  const pct = calcKRProgress(kr, data.tasks);

  // タスク紐付け候補
  const linkableTasks = data.tasks.filter(t => t.status !== 'stop');

  const fmtVal = (n: number, unit: string) => {
    if (unit === '円' || unit === '¥') return '¥' + n.toLocaleString();
    return n.toLocaleString() + unit;
  };

  // autoCalcの場合は紐付きタスクの完了revenueを合算
  const currentDisplay = kr.autoCalc
    ? data.tasks.filter(t => kr.taskIds.includes(t.id) && t.status === 'done').reduce((a, t) => a + (t.revenue || 0), 0)
    : kr.current;

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--bd0)',
      borderRadius: 10, padding: '12px 16px', marginBottom: 8,
    }}>
      {!editing ? (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <Ring pct={pct} size={44} color={PERIOD_COLOR[obj.period]}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)', marginBottom: 4 }}>{kr.title}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: PERIOD_COLOR[obj.period] }}>
                  {fmtVal(currentDisplay, kr.unit)}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--tx3)' }}>
                  / {fmtVal(kr.target, kr.unit)}
                </span>
                {kr.dueDate && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--tx3)' }}>{kr.dueDate}</span>}
                {kr.autoCalc && <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--blue)', background: 'rgba(75,142,255,.1)', border: '1px solid rgba(75,142,255,.2)', borderRadius: 10, padding: '1px 6px' }}>AUTO</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setEditing(true)}
                style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--ac)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--tx3)'}>✎</button>
              <button onClick={() => { if (confirm('削除？')) deleteKeyResult(obj.id, kr.id); }}
                style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 13 }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--tx3)'}>✕</button>
            </div>
          </div>
          {/* 進捗バー */}
          <div className="ptrack"><div className="pfill" style={{ width: `${pct}%`, background: PERIOD_COLOR[obj.period] }}/></div>
          {/* 紐付きタスク */}
          {kr.taskIds.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {kr.taskIds.map(tid => {
                const t = data.tasks.find(x => x.id === tid);
                if (!t) return null;
                return (
                  <span key={tid} style={{
                    fontSize: 10, padding: '2px 8px', borderRadius: 10,
                    background: t.status === 'done' ? 'rgba(0,255,163,.1)' : 'var(--s2)',
                    color: t.status === 'done' ? 'var(--ac)' : 'var(--tx3)',
                    border: `1px solid ${t.status === 'done' ? 'rgba(0,255,163,.25)' : 'var(--bd0)'}`,
                  }}>
                    {t.status === 'done' && '✓ '}{t.title}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // 編集モード
        <KREditor kr={kr} obj={obj} store={store} linkableTasks={linkableTasks} onClose={() => setEditing(false)}/>
      )}
    </div>
  );
}

function KREditor({ kr, obj, store, linkableTasks, onClose }: { kr: KeyResult; obj: Objective; store: Store; linkableTasks: Store['data']['tasks']; onClose: () => void }) {
  const [title, setTitle]     = useState(kr.title);
  const [target, setTarget]   = useState(kr.target);
  const [current, setCurrent] = useState(kr.current);
  const [unit, setUnit]       = useState(kr.unit);
  const [autoCalc, setAuto]   = useState(kr.autoCalc);
  const [dueDate, setDue]     = useState(kr.dueDate);
  const [taskIds, setTaskIds] = useState<string[]>(kr.taskIds);

  const save = () => {
    store.updateKeyResult(obj.id, kr.id, { title, target, current, unit, autoCalc, dueDate, taskIds });
    onClose();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="KRタイトル"
        style={{ padding: '8px 10px', fontSize: 12 }}/>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 8 }}>
        <div>
          <div className="label" style={{ marginBottom: 4, fontSize: 8 }}>目標値</div>
          <input type="number" value={target} onChange={e => setTarget(Number(e.target.value))}
            style={{ width: '100%', padding: '7px 10px', fontSize: 11 }}/>
        </div>
        <div>
          <div className="label" style={{ marginBottom: 4, fontSize: 8 }}>現在値</div>
          <input type="number" value={current} onChange={e => setCurrent(Number(e.target.value))}
            disabled={autoCalc} style={{ width: '100%', padding: '7px 10px', fontSize: 11, opacity: autoCalc ? 0.4 : 1 }}/>
        </div>
        <div>
          <div className="label" style={{ marginBottom: 4, fontSize: 8 }}>単位</div>
          <select value={unit} onChange={e => setUnit(e.target.value)} style={{ width: '100%', padding: '7px 8px', fontSize: 11 }}>
            <option value="円">円</option>
            <option value="件">件</option>
            <option value="%">%</option>
            <option value="社">社</option>
            <option value="本">本</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', fontSize: 11, color: 'var(--tx2)' }}>
          <input type="checkbox" checked={autoCalc} onChange={e => setAuto(e.target.checked)} style={{ accentColor: 'var(--ac)' }}/>
          タスクの売上から自動集計
        </label>
        <input type="date" value={dueDate} onChange={e => setDue(e.target.value)}
          style={{ padding: '6px 10px', fontSize: 11 }}/>
      </div>
      {/* タスク紐付け */}
      <div>
        <div className="label" style={{ marginBottom: 6, fontSize: 8 }}>タスクを紐付ける</div>
        <div style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {linkableTasks.slice(0, 20).map(t => (
            <label key={t.id} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontSize: 11, color: 'var(--tx2)', padding: '3px 0' }}>
              <input type="checkbox"
                checked={taskIds.includes(t.id)}
                onChange={e => setTaskIds(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id))}
                style={{ accentColor: 'var(--ac)' }}/>
              {t.title}
              {t.revenue > 0 && <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ac)' }}>¥{t.revenue.toLocaleString()}</span>}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ac" style={{ fontSize: 11 }} onClick={save}>保存</button>
        <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
}

// ── Objective カード ───────────────────────────
function ObjCard({ obj, store, annualObjs }: { obj: Objective; store: Store; annualObjs: Objective[] }) {
  const [open, setOpen]       = useState(true);
  const [addingKR, setAddKR]  = useState(false);
  const [editing, setEditing] = useState(false);
  const pct   = calcObjProgress(obj, store.data.tasks);
  const color = PERIOD_COLOR[obj.period];
  const periodLabel = PERIODS.find(p => p.id === obj.period)?.label || obj.period;

  // KR追加フォーム
  const [newKR, setNewKR] = useState({ title: '', target: 0, unit: '円', autoCalc: false, dueDate: '', taskIds: [] as string[] });
  const submitKR = () => {
    if (!newKR.title.trim()) return;
    store.addKeyResult(obj.id, { ...newKR, current: 0, notes: '', objectiveId: obj.id });
    setNewKR({ title: '', target: 0, unit: '円', autoCalc: false, dueDate: '', taskIds: [] });
    setAddKR(false);
  };

  return (
    <div style={{
      background: 'linear-gradient(145deg, var(--s0), var(--bg2))',
      border: `1px solid ${color}20`,
      borderRadius: 16, overflow: 'hidden', marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: open ? '1px solid var(--bd0)' : 'none', cursor: 'pointer' }}
        onClick={() => setOpen(!open)}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <Ring pct={pct} size={56} color={color}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color, background: color + '15', border: `1px solid ${color}30`, borderRadius: 10, padding: '2px 8px' }}>
                {periodLabel}
              </span>
              {obj.parentId && (
                <span style={{ fontSize: 9, color: 'var(--tx3)' }}>
                  → {annualObjs.find(o => o.id === obj.parentId)?.title?.slice(0, 20)}
                </span>
              )}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', lineHeight: 1.3, marginBottom: 4 }}>{obj.title}</div>
            {obj.description && <div style={{ fontSize: 11, color: 'var(--tx3)' }}>{obj.description}</div>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); setEditing(!editing); }}
              style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--ac)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--tx3)'}>✎</button>
            <button onClick={e => { e.stopPropagation(); if (confirm('削除？')) store.deleteObjective(obj.id); }}
              style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--tx3)'}>✕</button>
            <span style={{ color: 'var(--tx3)', fontSize: 14, transition: 'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
          </div>
        </div>
        {/* 全体プログレスバー */}
        <div style={{ marginTop: 12 }}>
          <div className="ptrack"><div className="pfill" style={{ width: `${pct}%`, background: color }}/></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--tx3)' }}>KR {obj.keyResults.length}件</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color }}>達成率 {pct}%</span>
          </div>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div style={{ padding: '16px 20px' }}>
          {/* 編集フォーム */}
          {editing && (
            <div style={{ background: 'var(--s2)', border: '1px solid var(--bd1)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input value={obj.title} onChange={e => store.updateObjective(obj.id, { title: e.target.value })}
                  placeholder="Objective" style={{ padding: '8px 10px', fontSize: 13, fontWeight: 600 }}/>
                <input value={obj.description} onChange={e => store.updateObjective(obj.id, { description: e.target.value })}
                  placeholder="説明（任意）" style={{ padding: '7px 10px', fontSize: 11 }}/>
                {obj.period !== 'annual' && (
                  <div>
                    <div className="label" style={{ marginBottom: 4, fontSize: 8 }}>年間OKRに紐付ける</div>
                    <select value={obj.parentId || ''} onChange={e => store.updateObjective(obj.id, { parentId: e.target.value || undefined })}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 11 }}>
                      <option value="">紐付けなし</option>
                      {annualObjs.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
                    </select>
                  </div>
                )}
                <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setEditing(false)}>閉じる</button>
              </div>
            </div>
          )}

          {/* KR一覧 */}
          {obj.keyResults.map(kr => (
            <KRRow key={kr.id} kr={kr} obj={obj} store={store} year={obj.year}/>
          ))}

          {/* KR追加 */}
          {addingKR ? (
            <div style={{ background: 'var(--s2)', border: '1px solid rgba(0,255,163,.2)', borderRadius: 10, padding: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input autoFocus value={newKR.title} onChange={e => setNewKR({ ...newKR, title: e.target.value })}
                  placeholder="Key Result タイトル"
                  onKeyDown={e => { if (e.key === 'Enter') submitKR(); if (e.key === 'Escape') setAddKR(false); }}
                  style={{ padding: '8px 10px', fontSize: 12 }}/>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 8 }}>
                  <div>
                    <div className="label" style={{ marginBottom: 4, fontSize: 8 }}>目標値</div>
                    <input type="number" value={newKR.target} onChange={e => setNewKR({ ...newKR, target: Number(e.target.value) })}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 11 }}/>
                  </div>
                  <div>
                    <div className="label" style={{ marginBottom: 4, fontSize: 8 }}>期限</div>
                    <input type="date" value={newKR.dueDate} onChange={e => setNewKR({ ...newKR, dueDate: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', fontSize: 11 }}/>
                  </div>
                  <div>
                    <div className="label" style={{ marginBottom: 4, fontSize: 8 }}>単位</div>
                    <select value={newKR.unit} onChange={e => setNewKR({ ...newKR, unit: e.target.value })}
                      style={{ width: '100%', padding: '7px 8px', fontSize: 11 }}>
                      <option value="円">円</option><option value="件">件</option>
                      <option value="%">%</option><option value="社">社</option><option value="本">本</option>
                    </select>
                  </div>
                </div>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', fontSize: 11, color: 'var(--tx2)' }}>
                  <input type="checkbox" checked={newKR.autoCalc} onChange={e => setNewKR({ ...newKR, autoCalc: e.target.checked })} style={{ accentColor: 'var(--ac)' }}/>
                  タスクの売上から自動集計
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ac" style={{ fontSize: 11 }} onClick={submitKR}>追加</button>
                  <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => setAddKR(false)}>キャンセル</button>
                </div>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddKR(true)} style={{
              width: '100%', padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: 11,
              background: 'transparent', border: `1px dashed ${color}40`, color,
              transition: 'all .15s', fontFamily: 'var(--body)',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = color + '08'; e.currentTarget.style.borderColor = color + '80'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = color + '40'; }}>
              ＋ Key Result を追加
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── OKRView メイン ─────────────────────────────
export function OKRView({ store }: { store: Store }) {
  const objectives = store.data.okr?.objectives || [];
  const year = new Date().getFullYear();
  const [filterPeriod, setFilter] = useState<string>('all');
  const [addingObj, setAddObj]    = useState(false);
  const [newObj, setNewObj]       = useState({ title: '', description: '', period: 'annual' as Objective['period'], year, parentId: '' });

  const annualObjs = objectives.filter(o => o.period === 'annual');
  const filtered   = filterPeriod === 'all' ? objectives : objectives.filter(o => o.period === filterPeriod);

  // 全体達成率
  const overallPct = objectives.length === 0 ? 0
    : Math.round(objectives.reduce((a, o) => a + calcObjProgress(o, store.data.tasks), 0) / objectives.length);

  const submitObj = () => {
    if (!newObj.title.trim()) return;
    store.addObjective({ ...newObj, parentId: newObj.parentId || undefined });
    setNewObj({ title: '', description: '', period: 'annual', year, parentId: '' });
    setAddObj(false);
  };

  return (
    <div style={{ padding: '28px 32px 52px', maxWidth: 900, margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div className="label" style={{ marginBottom: 8 }}>GOAL MANAGEMENT</div>
          <h1 style={{ fontFamily: 'var(--head)', fontSize: 32, letterSpacing: 2, margin: 0, lineHeight: 1 }}>OKR</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {objectives.length > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div className="label" style={{ marginBottom: 4 }}>全体達成率</div>
              <Ring pct={overallPct} size={52} color="#00ffa3"/>
            </div>
          )}
          <button className="btn btn-ac" onClick={() => setAddObj(!addingObj)}>
            {addingObj ? '✕' : '＋ Objective'}
          </button>
        </div>
      </div>

      {/* ── Objective追加フォーム ── */}
      {addingObj && (
        <div style={{ background: 'var(--s0)', border: '1px solid rgba(0,255,163,.25)', borderRadius: 14, padding: 20, marginBottom: 24 }}>
          <div className="label" style={{ marginBottom: 14 }}>新しい Objective</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input autoFocus value={newObj.title} onChange={e => setNewObj({ ...newObj, title: e.target.value })}
              placeholder="Objective（例: Bird Flip Inc.を年商1,000万にする）"
              onKeyDown={e => { if (e.key === 'Enter') submitObj(); if (e.key === 'Escape') setAddObj(false); }}
              style={{ padding: '9px 12px', fontSize: 13, fontWeight: 600 }}/>
            <input value={newObj.description} onChange={e => setNewObj({ ...newObj, description: e.target.value })}
              placeholder="説明・背景（任意）" style={{ padding: '8px 12px', fontSize: 11 }}/>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div className="label" style={{ marginBottom: 5, fontSize: 8 }}>期間</div>
                <select value={newObj.period} onChange={e => setNewObj({ ...newObj, period: e.target.value as Objective['period'] })}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 11, color: PERIOD_COLOR[newObj.period] }}>
                  {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <div className="label" style={{ marginBottom: 5, fontSize: 8 }}>年</div>
                <select value={newObj.year} onChange={e => setNewObj({ ...newObj, year: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 11 }}>
                  {[year-1, year, year+1].map(y => <option key={y} value={y}>{y}年</option>)}
                </select>
              </div>
            </div>
            {newObj.period !== 'annual' && annualObjs.length > 0 && (
              <div>
                <div className="label" style={{ marginBottom: 5, fontSize: 8 }}>年間OKRに紐付ける（任意）</div>
                <select value={newObj.parentId} onChange={e => setNewObj({ ...newObj, parentId: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', fontSize: 11 }}>
                  <option value="">紐付けなし</option>
                  {annualObjs.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ac" onClick={submitObj}>作成</button>
              <button className="btn btn-ghost" onClick={() => setAddObj(false)}>キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 期間フィルター ── */}
      {objectives.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
          {[{ id: 'all', label: '全て', color: 'var(--tx2)' }, ...PERIODS].map(p => (
            <button key={p.id} onClick={() => setFilter(p.id)} style={{
              padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11,
              background: filterPeriod === p.id ? (PERIOD_COLOR[p.id] || 'var(--ac)') + '18' : 'var(--s0)',
              color: filterPeriod === p.id ? (PERIOD_COLOR[p.id] || 'var(--ac)') : 'var(--tx3)',
              boxShadow: filterPeriod === p.id ? `0 0 0 1px ${PERIOD_COLOR[p.id] || 'var(--ac)'}40` : '0 0 0 1px var(--bd0)',
              transition: 'all .12s',
            }}>{p.label}</button>
          ))}
        </div>
      )}

      {/* ── Objective一覧 ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--tx3)' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 32, opacity: .1, marginBottom: 12 }}>◎</div>
          <div className="label" style={{ marginBottom: 8 }}>NO OBJECTIVES</div>
          <div style={{ fontSize: 11, marginBottom: 16 }}>最初のObjectiveを作成してください</div>
          <button className="btn btn-ac" onClick={() => setAddObj(true)}>＋ Objective を追加</button>
        </div>
      ) : (
        filtered.map(obj => (
          <ObjCard key={obj.id} obj={obj} store={store} annualObjs={annualObjs}/>
        ))
      )}
    </div>
  );
}
