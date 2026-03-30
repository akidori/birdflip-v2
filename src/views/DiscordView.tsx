import { useState } from 'react';
import type { useStore } from '../store';

type Store = ReturnType<typeof useStore>;

export function DiscordView({ store }: { store: Store }) {
  const dc = store.data.discord || { webhookUrl: '', botToken: '', channelId: '', enabled: false };
  const [testMsg, setTestMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [sendLog, setSendLog] = useState<{ time: string; msg: string; ok: boolean }[]>([]);

  const save = (patch: Partial<typeof dc>) => store.updateDiscord(patch);

  // Webhookへテスト送信
  const sendWebhook = async (content: string) => {
    if (!dc.webhookUrl) return;
    setSending(true);
    try {
      const res = await fetch(dc.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const ok = res.ok || res.status === 204;
      setSendLog(prev => [{ time: new Date().toLocaleTimeString('ja-JP'), msg: content.slice(0, 40), ok }, ...prev.slice(0, 9)]);
    } catch (e) {
      setSendLog(prev => [{ time: new Date().toLocaleTimeString('ja-JP'), msg: 'エラー: ' + String(e), ok: false }, ...prev.slice(0, 9)]);
    }
    setSending(false);
  };

  const sendDailySummary = () => {
    const td = store.today();
    const active = store.data.tasks.filter(t => t.status !== 'done' && t.status !== 'stop');
    const late = active.filter(t => t.deadline && t.deadline < td);
    const todayDue = active.filter(t => t.deadline === td);
    const month = store.thisMonth();
    const monthDone = store.data.tasks.filter(t => t.status === 'done' && (t.completedAt || '').startsWith(month));
    const mRev = monthDone.reduce((a, t) => a + (t.revenue || 0), 0);

    const lines = [
      `🐤 **BirdFlip デイリーサマリー** (${td})`,
      ``,
      `📊 **今月売上**: ¥${mRev.toLocaleString()}`,
      `📋 **進行中**: ${active.length}件`,
      late.length > 0 ? `⚠️ **遅延**: ${late.length}件` : null,
      todayDue.length > 0 ? `⚡ **今日期限**: ${todayDue.length}件` : null,
      late.length > 0 ? `\n**遅延タスク:**\n` + late.slice(0, 5).map(t => `- ${t.title} (${t.deadline})`).join('\n') : null,
    ].filter(Boolean).join('\n');

    sendWebhook(lines);
  };

  const sendLateTasks = () => {
    const td = store.today();
    const late = store.data.tasks.filter(t =>
      t.status !== 'done' && t.status !== 'stop' && t.deadline && t.deadline < td
    );
    if (late.length === 0) { sendWebhook('✅ 遅延タスクはありません'); return; }
    const lines = [
      `⚠️ **遅延タスク一覧** (${late.length}件)`,
      ...late.map(t => {
        const client = store.data.clients.find(c => c.id === t.clientId);
        const days = Math.abs(Math.round((new Date(td).getTime() - new Date(t.deadline).getTime()) / 864e5));
        return `- **${t.title}** | ${client?.name || '—'} | ${t.deadline} (**${days}日超過**)`;
      })
    ].join('\n');
    sendWebhook(lines);
  };

  const sendInvoiceStatus = () => {
    const td = store.today();
    const unpaid = store.data.invoices.filter(i => !i.paid);
    if (unpaid.length === 0) { sendWebhook('✅ 未入金請求書はありません'); return; }
    const lines = [
      `💰 **未入金請求書** (${unpaid.length}件)`,
      ...unpaid.map(i => {
        const client = store.data.clients.find(c => c.id === i.clientId);
        const total = i.items.reduce((a, it) => a + (it.amount || 0), 0);
        const tax = i.taxType === 'exclusive' ? Math.round(total * 0.1) : 0;
        const isLate = i.dueDate && i.dueDate < td;
        return `- ${isLate ? '🔴' : '🟡'} **${i.number}** | ${client?.name || '—'} | ¥${(total + tax).toLocaleString()} | 期限: ${i.dueDate || '未設定'}`;
      })
    ].join('\n');
    sendWebhook(lines);
  };

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-4">
      <h1 className="text-sm font-bold text-zinc-200">💬 Discord 連携</h1>

      <div className="grid grid-cols-2 gap-4">
        {/* 設定 */}
        <div className="space-y-3">
          <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4">
            <div className="text-xs font-bold text-zinc-300 mb-3">Webhook 設定</div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-zinc-500 font-bold tracking-wide block mb-1">Webhook URL</label>
                <input type="password" value={dc.webhookUrl}
                  onChange={e => save({ webhookUrl: e.target.value })}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-2 text-xs outline-none text-zinc-300 placeholder-zinc-600 font-mono" />
                <div className="text-[9px] text-zinc-600 mt-1">Discord チャンネル → 編集 → 連携サービス → Webhook</div>
              </div>
              <div className="flex items-center justify-between py-2 border-t border-zinc-800/30">
                <div>
                  <div className="text-xs text-zinc-300">通知を有効化</div>
                  <div className="text-[9px] text-zinc-500">手動送信・クイック通知を使用する</div>
                </div>
                <button onClick={() => save({ enabled: !dc.enabled })}
                  className={`w-10 h-5 rounded-full transition-colors relative ${dc.enabled ? 'bg-teal-400' : 'bg-zinc-700'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${dc.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          </div>

          {/* ピッピBot設定 */}
          <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-xs font-bold text-zinc-300">🤖 ピッピ Bot 設定</div>
              <span className="text-[9px] px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded">オプション</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] text-zinc-500 font-bold tracking-wide block mb-1">Bot Token</label>
                <input type="password" value={dc.botToken}
                  onChange={e => save({ botToken: e.target.value })}
                  placeholder="Bot トークン"
                  className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-2 text-xs outline-none text-zinc-300 placeholder-zinc-600 font-mono" />
              </div>
              <div>
                <label className="text-[9px] text-zinc-500 font-bold tracking-wide block mb-1">チャンネルID</label>
                <input value={dc.channelId}
                  onChange={e => save({ channelId: e.target.value })}
                  placeholder="000000000000000000"
                  className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-2 text-xs outline-none text-zinc-300 placeholder-zinc-600 font-mono" />
              </div>
            </div>
          </div>
        </div>

        {/* クイック送信 */}
        <div className="space-y-3">
          <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4">
            <div className="text-xs font-bold text-zinc-300 mb-3">クイック通知</div>
            <div className="space-y-2">
              {[
                { label: '📊 デイリーサマリー送信', sub: '今月売上・進行中・遅延を一括送信', action: sendDailySummary },
                { label: '⚠️ 遅延タスクを通知', sub: '期限超過タスクの一覧を送信', action: sendLateTasks },
                { label: '💰 未入金請求書を通知', sub: '未払い請求書の一覧を送信', action: sendInvoiceStatus },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action}
                  disabled={!dc.webhookUrl || !dc.enabled || sending}
                  className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/40 hover:bg-zinc-700/40 border border-zinc-700/30 hover:border-zinc-600/40 transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed">
                  <div className="flex-1">
                    <div className="text-xs text-zinc-200">{btn.label}</div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">{btn.sub}</div>
                  </div>
                  <span className="text-zinc-600 text-xs mt-0.5">→</span>
                </button>
              ))}
            </div>
          </div>

          {/* カスタムメッセージ */}
          <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4">
            <div className="text-xs font-bold text-zinc-300 mb-3">カスタムメッセージ</div>
            <textarea value={testMsg} onChange={e => setTestMsg(e.target.value)}
              rows={3} placeholder="送信するメッセージを入力..."
              className="w-full bg-zinc-800/60 border border-zinc-700/40 rounded-lg px-2.5 py-2 text-xs outline-none text-zinc-300 placeholder-zinc-600 resize-none mb-2" />
            <button onClick={() => { if (testMsg.trim()) { sendWebhook(testMsg); setTestMsg(''); } }}
              disabled={!dc.webhookUrl || !dc.enabled || !testMsg.trim() || sending}
              className="w-full py-2 bg-teal-400/10 text-teal-400 border border-teal-400/20 rounded-lg text-xs font-medium hover:bg-teal-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {sending ? '送信中...' : '送信'}
            </button>
          </div>

          {/* 送信ログ */}
          {sendLog.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4">
              <div className="text-xs font-bold text-zinc-300 mb-2">送信ログ</div>
              <div className="space-y-1">
                {sendLog.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className={log.ok ? 'text-emerald-400' : 'text-red-400'}>{log.ok ? '✓' : '✗'}</span>
                    <span className="text-zinc-600 font-mono">{log.time}</span>
                    <span className="text-zinc-400 truncate flex-1">{log.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Webhook URLが未設定の場合のガイド */}
      {!dc.webhookUrl && (
        <div className="bg-zinc-900/40 border border-zinc-800/30 rounded-xl p-4 text-xs text-zinc-500">
          <div className="font-bold text-zinc-400 mb-2">📖 設定方法</div>
          <ol className="space-y-1 text-[11px] list-decimal list-inside">
            <li>Discordで通知を送りたいチャンネルを右クリック →「チャンネルの編集」</li>
            <li>「連携サービス」→「ウェブフック」→「新しいウェブフック」</li>
            <li>「ウェブフックURLをコピー」して上の欄に貼り付け</li>
            <li>「通知を有効化」をONにして完了</li>
          </ol>
        </div>
      )}
    </div>
  );
}
