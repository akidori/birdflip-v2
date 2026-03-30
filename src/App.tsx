import { useState } from 'react';
import { useStore } from './store';
import { TaskTable } from './views/TaskTable';
import { TaskBoard } from './views/TaskBoard';
import { InvoiceView } from './views/InvoiceView';
import { Dashboard } from './views/Dashboard';
import { GanttView } from './views/GanttView';

type View = 'dashboard' | 'table' | 'board' | 'gantt' | 'invoice';

const NAV: { id: View; icon: string; label: string }[] = [
  { id: 'dashboard', icon: '◆', label: 'ダッシュボード' },
  { id: 'table', icon: '≡', label: 'テーブル' },
  { id: 'board', icon: '▦', label: 'ボード' },
  { id: 'gantt', icon: '▬', label: 'ガント' },
  { id: 'invoice', icon: '¥', label: '請求書' },
];

export default function App() {
  const store = useStore();
  const [view, setView] = useState<View>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Loading
  if (store.loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <div className="text-center space-y-3">
          <div className="text-3xl">🐤</div>
          <div className="text-xs">読み込み中...</div>
        </div>
      </div>
    );
  }

  // Login
  if (!store.user) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-4 max-w-xs">
          <div className="text-4xl">🐤</div>
          <div className="text-lg font-bold text-teal-400 tracking-wider">BIRDFLIP</div>
          <div className="text-xs text-zinc-500">映像制作プロジェクト管理</div>
          <button onClick={() => store.login()}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-sm font-medium transition-colors border border-zinc-700">
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  const active = store.data.tasks.filter(t => t.status !== 'done' && t.status !== 'stop');
  const late = active.filter(t => t.deadline && t.deadline < store.today());

  return (
    <div className="h-screen flex bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-52' : 'w-12'} flex-shrink-0 border-r border-zinc-800/60 flex flex-col transition-all duration-200`}>
        <div className="h-12 flex items-center gap-2 px-3 border-b border-zinc-800/40">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-lg hover:opacity-70">🐤</button>
          {sidebarOpen && <span className="text-xs font-bold tracking-wider text-teal-400">BIRDFLIP</span>}
          {sidebarOpen && store.syncing && <span className="text-[9px] text-teal-400/50 ml-auto">☁</span>}
        </div>

        <nav className="flex-1 py-2 space-y-0.5 px-1.5">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors ${
                view === n.id ? 'bg-teal-400/10 text-teal-400' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
              }`}>
              <span className="w-4 text-center font-mono text-[11px]">{n.icon}</span>
              {sidebarOpen && <span className="font-medium">{n.label}</span>}
            </button>
          ))}
        </nav>

        {sidebarOpen && (
          <div className="p-3 border-t border-zinc-800/40 space-y-2">
            <div className="text-[10px] text-zinc-500 space-y-1">
              <div>進行中 {active.length}件</div>
              {late.length > 0 && <div className="text-red-400">⚠ 遅延 {late.length}件</div>}
            </div>
            <div className="flex items-center gap-2">
              {store.user.photoURL && <img src={store.user.photoURL} className="w-5 h-5 rounded-full" />}
              <span className="text-[10px] text-zinc-500 flex-1 truncate">{store.user.displayName || store.user.email}</span>
              <button onClick={() => { if(confirm('ログアウト？')) store.logout(); }} className="text-[9px] text-zinc-600 hover:text-zinc-400">⏻</button>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-auto">
        {view === 'dashboard' && <Dashboard store={store} onNavigate={setView as any} />}
        {view === 'table' && <TaskTable store={store} />}
        {view === 'board' && <TaskBoard store={store} />}
        {view === 'gantt' && <GanttView store={store} />}
        {view === 'invoice' && <InvoiceView store={store} />}
      </main>
    </div>
  );
}
