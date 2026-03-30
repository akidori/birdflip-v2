import { useState } from 'react';
import type { useStore } from '../store';
import type { TaskTemplate } from '../types';
import { STATUS_CONFIG, type TaskStatus } from '../types';
import { isTokenValid } from '../gcal';

type Store = ReturnType<typeof useStore>;

export function SettingsView({ store }: { store: Store }) {
  const [tab, setTab] = useState<'company' | 'clients' | 'templates' | 'gcal'>('company');

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4">
      <h1 className="text-sm font-bold text-zinc-200">⚙️ 設定</h1>

      {/* タブ */}
      <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-1 w-fit">
        {([
          { id: 'company', label: '🏢 会社情報' },
          { id: 'clients', label: '📂 クライアント' },
          { id: 'templates', label: '📋 テンプレート' },
          { id: 'gcal', label: '📅 Googleカレンダー' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'company'   && <CompanyTab store={store} />}
      {tab === 'clients'   && <ClientsTab store={store} />}
      {tab === 'templates' && <TemplatesTab store={store} />}
      {tab === 'gcal' && <GCalTab store={store} />}
    </div>
  );
}

// ─── 会社情報 ───
function CompanyTab({ store }: { store: Store }) {
  const co = store.data.company;
  const fields: { key: keyof typeof co; label: string; placeholder?: string; half?: boolean }[] = [
    { key: 'name',   label: '会社名',           placeholder: '株式会社BirdFlip' },
    { key: 'zip',    label: '郵便番号', half: true, placeholder: '000-0000' },
    { key: 'addr',   label: '住所',             placeholder: '東京都渋谷区...' },
    { key: 'tel',    label: '電話番号', half: true, placeholder: '03-0000-0000' },
    { key: 'email',  label: 'メール',  half: true, placeholder: 'info@example.com' },
    { key: 'reg',    label: 'インボイス登録番号', placeholder: 'T1234567890123' },
    { key: 'bank',   label: '銀行名',   half: true, placeholder: '○○銀行' },
    { key: 'branch', label: '支店名',   half: true, placeholder: '渋谷支店' },
    { key: 'aType',  label: '口座種別', half: true },
    { key: 'aNo',    label: '口座番号', half: true, placeholder: '1234567' },
    { key: 'aName',  label: '口座名義',          placeholder: 'カ）バードフリップ' },
  ];

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-5">
      <div className="text-xs font-bold text-zinc-300 mb-4">会社・請求書情報</div>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key} className={f.half ? '' : 'col-span-2'}>
            <label className="text-[9px] text-zinc-500 font-bold tracking-wide block mb-1">{f.label}</label>
            {f.key === 'aType' ? (
              <select value={co.aType} onChange={e => store.updateCompany({ aType: e.target.value })}
                className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-2 text-xs outline-none text-zinc-300">
                <option>普通</option><option>当座</option>
              </select>
            ) : (
              <input value={co[f.key] || ''} onChange={e => store.updateCompany({ [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-2 text-xs outline-none text-zinc-300 placeholder-zinc-600" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 text-[10px] text-zinc-500">入力内容は自動保存されます</div>
    </div>
  );
}

// ─── クライアント管理 ───
function ClientsTab({ store }: { store: Store }) {
  const [newName, setNewName] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    store.addClient(newName.trim());
    setNewName('');
  };

  return (
    <div className="space-y-3">
      {/* 追加フォーム */}
      <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4">
        <div className="text-xs font-bold text-zinc-300 mb-3">クライアントを追加</div>
        <div className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="案件名・クライアント名"
            className="flex-1 bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-3 py-2 text-xs outline-none text-zinc-300 placeholder-zinc-600" />
          <button onClick={handleAdd}
            className="bg-teal-400/10 text-teal-400 border border-teal-400/20 text-xs font-medium px-4 py-2 rounded-lg hover:bg-teal-400/20 transition-colors">
            追加
          </button>
        </div>
      </div>

      {/* クライアント一覧 */}
      <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-800/40 text-[10px] text-zinc-500 font-bold">
          {store.data.clients.length}件
        </div>
        {store.data.clients.length === 0 ? (
          <div className="text-center py-10 text-zinc-600 text-xs">クライアントがありません</div>
        ) : (
          store.data.clients.map(c => {
            const tasks = store.data.tasks.filter(t => t.clientId === c.id);
            const done = tasks.filter(t => t.status === 'done');
            const rev = tasks.reduce((a, t) => a + (t.revenue || 0), 0);
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/20 last:border-0 hover:bg-zinc-800/10 group">
                <div className="w-7 h-7 rounded-full bg-teal-400/10 flex items-center justify-center text-xs text-teal-400 font-bold flex-shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <input value={c.name} onChange={e => store.updateClient(c.id, { name: e.target.value })}
                    className="bg-transparent outline-none text-xs font-medium text-zinc-200 w-full focus:bg-zinc-800/40 rounded px-1 -ml-1" />
                  <div className="text-[9px] text-zinc-600 mt-0.5">
                    タスク{tasks.length}件（完了{done.length}件）{rev > 0 ? `　¥${rev.toLocaleString()}` : ''}
                  </div>
                </div>
                <select value={c.taxType} onChange={e => store.updateClient(c.id, { taxType: e.target.value as any })}
                  className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg px-2 py-1 text-[10px] outline-none text-zinc-400">
                  <option value="exclusive">税別</option>
                  <option value="inclusive">税込</option>
                  <option value="none">非課税</option>
                </select>
                <button onClick={() => {
                  if (tasks.length > 0 && !confirm(`「${c.name}」を削除しますか？\n関連タスク${tasks.length}件は残ります。`)) return;
                  store.deleteClient(c.id);
                }} className="text-zinc-700 hover:text-red-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── テンプレート管理 ───
function TemplatesTab({ store }: { store: Store }) {
  const templates = store.data.templates || [];
  const [creating, setCreating] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplTasks, setTplTasks] = useState<{ title: string; status: TaskStatus; priority: 'low' | 'medium' | 'high' | 'urgent'; notes: string }[]>([
    { title: 'ヒアリング', status: 'hearing', priority: 'high', notes: '' },
    { title: '構成作成', status: 'plan', priority: 'medium', notes: '' },
    { title: '撮影', status: 'shoot', priority: 'high', notes: '' },
    { title: '編集', status: 'edit', priority: 'medium', notes: '' },
    { title: 'サムネ制作', status: 'thumb', priority: 'medium', notes: '' },
    { title: '確認・修正', status: 'review', priority: 'medium', notes: '' },
    { title: '納品', status: 'done', priority: 'medium', notes: '' },
  ]);
  const [applyModal, setApplyModal] = useState<string | null>(null);
  const [applyClientId, setApplyClientId] = useState('');

  const handleSave = () => {
    if (!tplName.trim() || tplTasks.length === 0) return;
    store.addTemplate({ name: tplName.trim(), tasks: tplTasks });
    setCreating(false);
    setTplName('');
  };

  const handleApply = () => {
    if (!applyModal || !applyClientId) return;
    store.applyTemplate(applyModal, applyClientId);
    setApplyModal(null);
    setApplyClientId('');
  };

  return (
    <div className="space-y-3">
      {/* 適用モーダル */}
      {applyModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setApplyModal(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 w-72" onClick={e => e.stopPropagation()}>
            <div className="text-xs font-bold text-zinc-200 mb-3">テンプレートを適用</div>
            <label className="text-[9px] text-zinc-500 block mb-1">適用する案件</label>
            <select value={applyClientId} onChange={e => setApplyClientId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-2 text-xs outline-none text-zinc-300 mb-4">
              <option value="">選択...</option>
              {store.data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setApplyModal(null)} className="text-xs text-zinc-500 px-3 py-1.5">キャンセル</button>
              <button onClick={handleApply} disabled={!applyClientId}
                className="text-xs bg-teal-400/15 text-teal-400 border border-teal-400/20 rounded-lg px-3 py-1.5 font-medium hover:bg-teal-400/25 disabled:opacity-40">
                適用
              </button>
            </div>
          </div>
        </div>
      )}

      {!creating ? (
        <>
          <div className="flex justify-end">
            <button onClick={() => setCreating(true)}
              className="bg-teal-400/10 text-teal-400 border border-teal-400/20 text-xs font-medium px-4 py-2 rounded-lg hover:bg-teal-400/20 transition-colors">
              ＋ テンプレート作成
            </button>
          </div>
          {templates.length === 0 ? (
            <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-10 text-center text-zinc-600 text-xs">
              テンプレートがありません<br />
              <span className="text-[10px]">よく使う工程セットを登録しておくと便利です</span>
            </div>
          ) : (
            templates.map(tpl => (
              <div key={tpl.id} className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">{tpl.name}</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">{tpl.tasks.length}タスク</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setApplyModal(tpl.id); setApplyClientId(''); }}
                      className="text-xs text-teal-400 border border-teal-400/20 rounded-lg px-3 py-1.5 hover:bg-teal-400/10 transition-colors">
                      ▶ 適用
                    </button>
                    <button onClick={() => { if (confirm('削除？')) store.deleteTemplate(tpl.id); }}
                      className="text-xs text-red-500/50 hover:text-red-400 px-2 py-1.5 rounded hover:bg-red-900/10 transition-colors">
                      🗑
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {tpl.tasks.map((t, i) => {
                    const sta = STATUS_CONFIG[t.status];
                    return (
                      <span key={i} className="text-[9px] px-2 py-0.5 rounded"
                        style={{ background: sta.color + '20', color: sta.color }}>
                        {t.title}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </>
      ) : (
        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-5">
          <div className="text-xs font-bold text-zinc-300 mb-4">新規テンプレート作成</div>
          <div className="mb-4">
            <label className="text-[9px] text-zinc-500 font-bold block mb-1">テンプレート名</label>
            <input value={tplName} onChange={e => setTplName(e.target.value)}
              placeholder="例: 密着案件、YouTube通常案件"
              className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-3 py-2 text-xs outline-none text-zinc-300 placeholder-zinc-600" />
          </div>
          <div className="space-y-2 mb-4">
            <div className="text-[9px] text-zinc-500 font-bold">タスク一覧</div>
            {tplTasks.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={t.title} onChange={e => {
                  const next = [...tplTasks]; next[i] = { ...next[i], title: e.target.value }; setTplTasks(next);
                }} className="flex-1 bg-zinc-800/50 border border-zinc-700/40 rounded-lg px-2.5 py-1.5 text-xs outline-none text-zinc-300" />
                <select value={t.status} onChange={e => {
                  const next = [...tplTasks]; next[i] = { ...next[i], status: e.target.value as TaskStatus }; setTplTasks(next);
                }} className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg px-2 py-1.5 text-[10px] outline-none text-zinc-300">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <button onClick={() => setTplTasks(tplTasks.filter((_, j) => j !== i))}
                  className="text-zinc-600 hover:text-red-400 text-[10px]">✕</button>
              </div>
            ))}
            <button onClick={() => setTplTasks([...tplTasks, { title: '新規タスク', status: 'todo', priority: 'medium', notes: '' }])}
              className="text-[10px] text-teal-400 border border-dashed border-zinc-700 rounded-lg px-3 py-1.5 hover:border-teal-400/40 w-full">
              ＋ タスクを追加
            </button>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setCreating(false)} className="text-xs text-zinc-500 px-3 py-1.5">キャンセル</button>
            <button onClick={handleSave}
              className="text-xs bg-teal-400/15 text-teal-400 border border-teal-400/20 rounded-lg px-4 py-1.5 font-medium hover:bg-teal-400/25">
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  GCalTab
// ─────────────────────────────────────────────────────────────
const GCAL_COLOR_NAMES: Record<number, string> = {
  1:'ラベンダー', 2:'セージ', 3:'グレープ', 4:'フラミンゴ',
  5:'バナナ', 6:'タンジェリン', 7:'ピーコック', 8:'ブルーベリー',
  9:'バジル', 10:'トマト', 11:'コバルト',
};
const GCAL_COLOR_HEX: Record<number, string> = {
  1:'#7986cb', 2:'#33b679', 3:'#8e24aa', 4:'#e67c73',
  5:'#f6c026', 6:'#f5511d', 7:'#039be5', 8:'#616161',
  9:'#0b8043', 10:'#d60000', 11:'#3f51b5',
};

function GCalTab({ store }: { store: Store }) {
  const { data, updateGCal, enableGCal, syncAllToGCal, gcalSyncing } = store;
  const gcal = data.gcal;
  const connected = gcal && isTokenValid(gcal);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSync = async () => {
    setSyncing(true);
    setMsg('');
    try {
      await syncAllToGCal();
      setMsg(`✅ 全タスク同期完了（${data.tasks.filter(t=>t.status!=='stop').length}件）`);
    } catch {
      setMsg('❌ 同期エラー');
    } finally {
      setSyncing(false);
      setTimeout(() => setMsg(''), 4000);
    }
  };

  const setClientColor = (clientId: string, colorId: number) => {
    updateGCal({
      clientColorMap: { ...(gcal?.clientColorMap || {}), [clientId]: colorId }
    });
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── 接続状態 ── */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'20px 24px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', letterSpacing:'0.15em', marginBottom:4 }}>CONNECTION STATUS</div>
            <div style={{ fontSize:13, fontWeight:700, color: connected ? '#22c55e' : 'var(--text2)' }}>
              {connected ? '✓ Google Calendar 接続済み' : '— 未接続'}
            </div>
          </div>
          {!connected ? (
            <button className="btn-accent"
              onClick={() => store.login()}>
              Googleで再ログインして接続
            </button>
          ) : (
            <button className="btn-ghost"
              onClick={() => updateGCal({ enabled: false, accessToken: '' })}
              style={{ fontSize:11 }}>
              接続解除
            </button>
          )}
        </div>
        {connected && (
          <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--mono)' }}>
            トークン有効期限: {new Date(gcal!.tokenExpiry).toLocaleString('ja-JP')}
          </div>
        )}

        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:6 }}>カレンダーID（デフォルト: primary）</div>
          <input
            value={gcal?.calendarId || 'primary'}
            onChange={e => updateGCal({ calendarId: e.target.value })}
            placeholder="primary"
            style={{ width:280, padding:'7px 12px', fontSize:11, fontFamily:'var(--mono)' }}
          />
          <div style={{ fontSize:9, color:'var(--text3)', marginTop:4 }}>
            特定のカレンダーに書き込む場合はカレンダーIDを入力。通常は primary のままでOK。
          </div>
        </div>
      </div>

      {/* ── 仕組みの説明 ── */}
      <div style={{ background:'rgba(74,244,200,0.04)', border:'1px solid rgba(74,244,200,0.12)', borderRadius:10, padding:'16px 20px' }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--accent)', letterSpacing:'0.15em', marginBottom:10 }}>HOW IT WORKS</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            ['タスク追加', '締切日があればGCalに自動登録'],
            ['締切日変更', 'GCalイベントの日付も自動更新'],
            ['フェーズ日付入力', '撮影・納品など各フェーズを個別イベント登録'],
            ['ステータス → done', 'GCalイベントをキャンセル色に変更 → 請求書に自動追加'],
            ['タスク削除', 'GCalイベントも削除'],
          ].map(([trigger, action]) => (
            <div key={trigger} style={{ display:'flex', gap:12, alignItems:'flex-start', fontSize:11 }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--accent)', minWidth:120, flexShrink:0, marginTop:1 }}>{trigger}</span>
              <span style={{ color:'var(--text2)' }}>→ {action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── クライアント別カラー ── */}
      {data.clients.length > 0 && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'20px 24px' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', letterSpacing:'0.15em', marginBottom:14 }}>
            CLIENT COLOR MAP — クライアント別カラー
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {data.clients.map(client => {
              const colorId = gcal?.clientColorMap?.[client.id] || 7;
              return (
                <div key={client.id} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background: GCAL_COLOR_HEX[colorId], flexShrink:0 }} />
                  <span style={{ fontSize:12, fontWeight:600, width:140 }}>{client.name}</span>
                  <select
                    value={colorId}
                    onChange={e => setClientColor(client.id, Number(e.target.value))}
                    style={{ padding:'5px 10px', fontSize:11, width:160 }}>
                    {Object.entries(GCAL_COLOR_NAMES).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                  <div style={{ width:16, height:16, borderRadius:4, background: GCAL_COLOR_HEX[colorId] }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 一括同期 ── */}
      {connected && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'20px 24px' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--text3)', letterSpacing:'0.15em', marginBottom:10 }}>
            BULK SYNC — 一括同期
          </div>
          <div style={{ fontSize:11, color:'var(--text2)', marginBottom:14 }}>
            既存の全タスクをGCalに同期します。初回接続時や手動で再同期したい場合に使用。
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button className="btn-accent"
              onClick={handleSync}
              disabled={syncing || gcalSyncing}
              style={{ opacity: syncing || gcalSyncing ? 0.6 : 1 }}>
              {syncing ? '同期中...' : `🔄 全${data.tasks.filter(t=>t.status!=='stop').length}件を今すぐ同期`}
            </button>
            {msg && <span style={{ fontSize:11, color: msg.startsWith('✅') ? '#22c55e' : 'var(--red)', fontFamily:'var(--mono)' }}>{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
