import { useState, useCallback, useEffect, useRef } from 'react';
import type { WorkspaceData, Task, Client, Invoice, InvoiceItem, Company, TaskTemplate, DiscordSettings, GCalSettings } from './types';
import { onAuth, getUserWorkspaceId, createWorkspace, loadWorkspace, saveWorkspace, onWorkspaceChange, googleLogin as _googleLogin, googleLogout, type User } from './firebase';
import { syncTaskToGCal, deleteTaskGCalEvents, isTokenValid } from './gcal';

const DEFAULT_COMPANY: Company = {
  name: '', zip: '', addr: '', tel: '', email: '',
  bank: '', branch: '', aType: '普通', aNo: '', aName: '', reg: ''
};

const EMPTY: WorkspaceData = {
  clients: [], tasks: [], invoices: [],
  company: DEFAULT_COMPANY, templates: [], discord: undefined, gcal: undefined, lastUpdated: ''
};

function genId() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
function today() { return new Date(Date.now() + 9 * 3600000).toISOString().split('T')[0]; }
function thisMonth() { const d = new Date(Date.now() + 9 * 3600000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

// 旧Invoice → 新Invoice マイグレーション
function migrateInvoice(inv: any): Invoice {
  return {
    id: inv.id || genId(),
    clientId: inv.clientId || '',
    targetMonth: inv.targetMonth || thisMonth(),
    number: inv.number || '',
    taxType: inv.taxType || 'exclusive',
    issueDate: inv.issueDate || inv.createdAt?.split('T')[0] || today(),
    dueDate: inv.dueDate || '',
    paid: inv.paid || false,
    paidAt: inv.paidAt || '',
    note: inv.note || '',
    items: (inv.items || []).map((it: any) => ({
      taskId: it.taskId || '',
      name: it.name || '',
      qty: it.qty || 1,
      unitPrice: it.unitPrice || 0,
      amount: it.amount || 0,
    })),
    createdAt: inv.createdAt || today(),
    locked: inv.locked || false,
  };
}

// 請求確認トースト用の型
export interface BillingPrompt {
  taskId: string;
  taskTitle: string;
  clientName: string;
  revenue: number;
  suggestedMonth: string; // YYYY-MM
}

export function useStore() {
  const [data, setData] = useState<WorkspaceData>(EMPTY);
  const [user, setUser] = useState<User | null>(null);
  const [wsId, setWsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [gcalSyncing, setGcalSyncing] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState<string | null>(null);

  // 請求確認トースト
  const [billingPrompts, setBillingPrompts] = useState<BillingPrompt[]>([]);

  const wsIdRef = useRef<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const unsub = useRef<(() => void) | null>(null);
  const skipNext = useRef(false);
  const dataRef = useRef<WorkspaceData>(EMPTY);

  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    const off = onAuth(async (u) => {
      setUser(u);
      if (u) {
        let ws = await getUserWorkspaceId(u.uid);
        if (!ws) ws = await createWorkspace(u.uid, u.email || '');
        wsIdRef.current = ws;
        setWsId(ws);
        const d = await loadWorkspace(ws);
        if (d) {
          // マイグレーション: 旧Invoice → 新Invoice
          const migrated = {
            ...EMPTY, ...d,
            invoices: (d.invoices || []).map(migrateInvoice),
          };
          setData(migrated);
          if (d.tasks && d.tasks.length > 0) {
            setMigrateMsg(`✅ データ読込完了: タスク${d.tasks.length}件・案件${d.clients?.length || 0}件`);
            setTimeout(() => setMigrateMsg(null), 4000);
          }
        }
        if (unsub.current) unsub.current();
        unsub.current = onWorkspaceChange(ws, (remote) => {
          if (skipNext.current) { skipNext.current = false; return; }
          setData({ ...EMPTY, ...remote, invoices: (remote.invoices || []).map(migrateInvoice) });
        });
      } else {
        wsIdRef.current = null; setWsId(null);
        setData(EMPTY);
        if (unsub.current) { unsub.current(); unsub.current = null; }
      }
      setLoading(false);
    });
    return () => { off(); if (unsub.current) unsub.current(); };
  }, []);

  const debouncedSave = useCallback((next: WorkspaceData) => {
    const id = wsIdRef.current;
    if (!id) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSyncing(true);
      skipNext.current = true;
      try { await saveWorkspace(id, next); } catch (e) { console.warn('Save error:', e); }
      setSyncing(false);
    }, 600);
  }, []);

  const update = useCallback((fn: (d: WorkspaceData) => void) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as WorkspaceData;
      fn(next);
      next.lastUpdated = new Date().toISOString();
      debouncedSave(next);
      return next;
    });
  }, [debouncedSave]);

  // ─── GCal同期 ──────────────────────────────────────
  const syncToGCal = useCallback(async (taskId: string) => {
    const d = dataRef.current;
    if (!d.gcal || !isTokenValid(d.gcal)) return;
    const task = d.tasks.find(t => t.id === taskId);
    if (!task) return;
    setGcalSyncing(true);
    try {
      const patch = await syncTaskToGCal(task, d.clients, d.gcal);
      if (Object.keys(patch).length > 0) {
        update(d2 => { const t = d2.tasks.find(x => x.id === taskId); if (t) Object.assign(t, patch); });
      }
    } catch (e) { console.error('[GCal] sync error:', e); }
    finally { setGcalSyncing(false); }
  }, [update]);

  // === Client ===
  const addClient = useCallback((name: string) => {
    update(d => { d.clients.push({ id: genId(), name, taxType: 'exclusive' }); });
  }, [update]);
  const updateClient = useCallback((id: string, patch: Partial<Client>) => {
    update(d => { const c = d.clients.find(x => x.id === id); if (c) Object.assign(c, patch); });
  }, [update]);
  const deleteClient = useCallback((id: string) => {
    update(d => { d.clients = d.clients.filter(x => x.id !== id); });
  }, [update]);

  // === Task ===
  const addTask = useCallback((task: Partial<Task>) => {
    const newId = genId();
    update(d => {
      d.tasks.push({
        id: newId, clientId: task.clientId || '', title: task.title || '無題',
        status: task.status || 'todo', assignee: task.assignee || '',
        deadline: task.deadline || '', progress: task.progress || 0,
        priority: task.priority || 'medium', revenue: task.revenue || 0,
        outsourceCost: task.outsourceCost || 0, outsourceVendor: task.outsourceVendor || '',
        outsourcePaid: false, phases: {}, notes: task.notes || '',
        completedAt: '', createdAt: today(),
        billingMonth: undefined, billingConfirmed: false,
      } as Task);
    });
    if (task.deadline) setTimeout(() => syncToGCal(newId), 800);
  }, [update, syncToGCal]);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    let needGCalSync = false;
    let newlyDone = false;
    let doneTask: Task | null = null;

    update(d => {
      const t = d.tasks.find(x => x.id === id);
      if (!t) return;
      if (patch.status === 'done' && t.status !== 'done') {
        patch.completedAt = today();
        patch.progress = 100;
        newlyDone = true;
        doneTask = { ...t, ...patch } as Task;
        // billingMonthを今月に仮設定（収益があるタスクのみ）
        if ((t.revenue || patch.revenue || 0) > 0 && !t.billingMonth) {
          patch.billingMonth = thisMonth();
          patch.billingConfirmed = false;
        }
      }
      if (patch.deadline !== undefined || patch.phases !== undefined ||
          patch.title !== undefined || patch.status !== undefined ||
          patch.clientId !== undefined) {
        needGCalSync = true;
      }
      Object.assign(t, patch);
    });

    // done になったタスクで収益があれば請求確認トーストを出す
    if (newlyDone && doneTask) {
      const d = dataRef.current;
      const task = d.tasks.find(x => x.id === id) || doneTask!;
      const rev = task.revenue || 0;
      if (rev > 0 && task.clientId) {
        const client = d.clients.find(c => c.id === task.clientId);
        setBillingPrompts(prev => [...prev, {
          taskId: id,
          taskTitle: task.title,
          clientName: client?.name || '—',
          revenue: rev,
          suggestedMonth: thisMonth(),
        }]);
      }
    }

    if (needGCalSync) setTimeout(() => syncToGCal(id), 800);
  }, [update, syncToGCal]);

  const deleteTask = useCallback((id: string) => {
    const task = dataRef.current.tasks.find(t => t.id === id);
    const gcal = dataRef.current.gcal;
    if (task && gcal && isTokenValid(gcal)) deleteTaskGCalEvents(task, gcal).catch(console.error);
    update(d => { d.tasks = d.tasks.filter(x => x.id !== id); });
    setBillingPrompts(prev => prev.filter(p => p.taskId !== id));
  }, [update]);

  // 請求確認: 承認（billingMonthを確定してInvoiceに追加）
  const confirmBilling = useCallback((taskId: string, month: string) => {
    update(d => {
      const task = d.tasks.find(t => t.id === taskId);
      if (!task) return;
      task.billingMonth = month;
      task.billingConfirmed = true;

      // 対象月の請求書を取得or作成
      let inv = d.invoices.find(i => i.clientId === task.clientId && i.targetMonth === month && !i.locked);
      if (!inv) {
        const client = d.clients.find(c => c.id === task.clientId);
        const num = 'INV-' + month.replace('-', '') + '-' + String(d.invoices.filter(i => i.targetMonth === month).length + 1).padStart(3, '0');
        const due = new Date(month + '-01');
        due.setMonth(due.getMonth() + 1);
        due.setDate(due.getDate() + 30);
        inv = {
          id: genId(), clientId: task.clientId, targetMonth: month, number: num,
          taxType: client?.taxType || 'exclusive',
          issueDate: '', dueDate: due.toISOString().split('T')[0],
          paid: false, paidAt: '', note: '', items: [], createdAt: today(), locked: false,
        };
        d.invoices.push(inv);
      }
      // 明細に追加（重複防止）
      if (!inv.items.some(it => it.taskId === task.id)) {
        inv.items.push({
          taskId: task.id, name: task.title,
          qty: 1, unitPrice: task.revenue, amount: task.revenue,
        });
      }
    });
    setBillingPrompts(prev => prev.filter(p => p.taskId !== taskId));
  }, [update]);

  // 請求確認: 月を変更して確定
  const confirmBillingWithMonth = useCallback((taskId: string, month: string) => {
    confirmBilling(taskId, month);
  }, [confirmBilling]);

  // 請求確認: スキップ（後で手動追加）
  const skipBilling = useCallback((taskId: string) => {
    update(d => {
      const task = d.tasks.find(t => t.id === taskId);
      if (task) { task.billingMonth = ''; task.billingConfirmed = false; }
    });
    setBillingPrompts(prev => prev.filter(p => p.taskId !== taskId));
  }, [update]);

  // テンプレート
  const applyTemplate = useCallback((templateId: string, clientId: string) => {
    update(d => {
      const tpl = (d.templates || []).find(x => x.id === templateId);
      if (!tpl) return;
      tpl.tasks.forEach(t => {
        d.tasks.push({
          id: genId(), clientId, title: t.title, status: t.status,
          assignee: '', deadline: '', progress: 0, priority: t.priority,
          revenue: 0, outsourceCost: 0, outsourceVendor: '', outsourcePaid: false,
          phases: {}, notes: t.notes, completedAt: '', createdAt: today(),
        } as Task);
      });
    });
  }, [update]);

  const addTemplate = useCallback((tpl: Omit<TaskTemplate, 'id' | 'createdAt'>) => {
    update(d => {
      if (!d.templates) d.templates = [];
      d.templates.push({ ...tpl, id: genId(), createdAt: today() });
    });
  }, [update]);

  const deleteTemplate = useCallback((id: string) => {
    update(d => { d.templates = (d.templates || []).filter(x => x.id !== id); });
  }, [update]);

  // === Invoice ===
  const addInvoice = useCallback((clientId: string, targetMonth?: string) => {
    update(d => {
      const m = targetMonth || thisMonth();
      const client = d.clients.find(c => c.id === clientId);
      const num = 'INV-' + m.replace('-', '') + '-' + String(d.invoices.filter(i => i.targetMonth === m).length + 1).padStart(3, '0');
      const due = new Date(m + '-01');
      due.setMonth(due.getMonth() + 1);
      due.setDate(due.getDate() + 30);
      d.invoices.push({
        id: genId(), clientId, targetMonth: m, number: num,
        taxType: client?.taxType || 'exclusive',
        issueDate: today(),
        dueDate: due.toISOString().split('T')[0],
        paid: false, paidAt: '', note: '', items: [], createdAt: today(), locked: false,
      });
    });
  }, [update]);

  const updateInvoice = useCallback((id: string, patch: Partial<Invoice>) => {
    update(d => { const inv = d.invoices.find(x => x.id === id); if (inv) Object.assign(inv, patch); });
  }, [update]);

  const deleteInvoice = useCallback((id: string) => {
    update(d => { d.invoices = d.invoices.filter(x => x.id !== id); });
  }, [update]);

  // billingConfirmed=false のタスクを手動で月次請求書に取込む
  const importPendingTasks = useCallback((month: string, clientId: string) => {
    update(d => {
      const pending = d.tasks.filter(t =>
        t.status === 'done' && t.clientId === clientId &&
        (t.billingMonth === month) && !t.billingConfirmed && t.revenue > 0
      );
      let inv = d.invoices.find(i => i.clientId === clientId && i.targetMonth === month && !i.locked);
      if (!inv && pending.length > 0) {
        const client = d.clients.find(c => c.id === clientId);
        const num = 'INV-' + month.replace('-', '') + '-' + String(d.invoices.filter(i => i.targetMonth === month).length + 1).padStart(3, '0');
        const due = new Date(month + '-01');
        due.setMonth(due.getMonth() + 1);
        due.setDate(due.getDate() + 30);
        inv = {
          id: genId(), clientId, targetMonth: month, number: num,
          taxType: client?.taxType || 'exclusive',
          issueDate: today(), dueDate: due.toISOString().split('T')[0],
          paid: false, paidAt: '', note: '', items: [], createdAt: today(), locked: false,
        };
        d.invoices.push(inv);
      }
      if (!inv) return;
      pending.forEach(t => {
        if (!inv!.items.some(it => it.taskId === t.id)) {
          inv!.items.push({ taskId: t.id, name: t.title, qty: 1, unitPrice: t.revenue, amount: t.revenue });
          t.billingConfirmed = true;
        }
      });
    });
  }, [update]);

  const updateCompany = useCallback((patch: Partial<Company>) => {
    update(d => { Object.assign(d.company, patch); });
  }, [update]);

  // Discord連携は停止中
  const updateDiscord = useCallback((_patch: Partial<DiscordSettings>) => {}, []);

  // === GCal設定 ===
  const updateGCal = useCallback((patch: Partial<GCalSettings>) => {
    update(d => {
      d.gcal = { enabled: false, accessToken: '', tokenExpiry: 0, calendarId: 'primary', clientColorMap: {}, ...d.gcal, ...patch };
    });
  }, [update]);

  const enableGCal = useCallback((accessToken: string, expiresIn = 3600) => {
    update(d => {
      d.gcal = { enabled: true, accessToken, tokenExpiry: Date.now() + expiresIn * 1000,
        calendarId: d.gcal?.calendarId || 'primary', clientColorMap: d.gcal?.clientColorMap || {} };
    });
  }, [update]);

  const syncAllToGCal = useCallback(async () => {
    const d = dataRef.current;
    if (!d.gcal || !isTokenValid(d.gcal)) return;
    setGcalSyncing(true);
    try {
      for (const task of d.tasks) {
        if (task.status === 'stop') continue;
        const patch = await syncTaskToGCal(task, d.clients, d.gcal);
        if (Object.keys(patch).length > 0) {
          update(d2 => { const t = d2.tasks.find(x => x.id === task.id); if (t) Object.assign(t, patch); });
        }
      }
    } finally { setGcalSyncing(false); }
  }, [update]);

  const googleLogin = useCallback(async () => {
    const { result, accessToken } = await _googleLogin();
    if (accessToken) enableGCal(accessToken, 3600);
    return result;
  }, [enableGCal]);

  return {
    data, user, wsId, loading, syncing, gcalSyncing, migrateMsg, update,
    login: googleLogin, logout: googleLogout,
    addClient, updateClient, deleteClient,
    addTask, updateTask, deleteTask, applyTemplate, addTemplate, deleteTemplate,
    addInvoice, updateInvoice, deleteInvoice, importPendingTasks,
    updateCompany, updateDiscord,
    updateGCal, enableGCal, syncAllToGCal,
    billingPrompts, confirmBilling, confirmBillingWithMonth, skipBilling,
    today, thisMonth,
  };
}

export { genId, today, thisMonth };
