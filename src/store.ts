import { useState, useCallback, useEffect, useRef } from 'react';
import type { WorkspaceData, Task, Client, Invoice, Company, TaskTemplate, DiscordSettings } from './types';
import { onAuth, getUserWorkspaceId, createWorkspace, loadWorkspace, saveWorkspace, onWorkspaceChange, googleLogin, googleLogout, type User } from './firebase';

const DEFAULT_COMPANY: Company = {
  name: '', zip: '', addr: '', tel: '', email: '',
  bank: '', branch: '', aType: '普通', aNo: '', aName: '', reg: ''
};

const EMPTY: WorkspaceData = {
  clients: [], tasks: [], invoices: [],
  company: DEFAULT_COMPANY, templates: [], discord: undefined, lastUpdated: ''
};

function genId() { return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
function today() { return new Date(Date.now() + 9 * 3600000).toISOString().split('T')[0]; }
function thisMonth() { const d = new Date(Date.now() + 9 * 3600000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

export function useStore() {
  const [data, setData] = useState<WorkspaceData>(EMPTY);
  const [user, setUser] = useState<User | null>(null);
  const [wsId, setWsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [migrateMsg, setMigrateMsg] = useState<string | null>(null);
  const wsIdRef = useRef<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const unsub = useRef<(() => void) | null>(null);
  const skipNext = useRef(false);

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
          setData({ ...EMPTY, ...d });
          // マイグレーション検知: タスクが存在してclientsも作られていたら通知
          if (d.tasks && d.tasks.length > 0) {
            setMigrateMsg(`✅ データ読込完了: タスク${d.tasks.length}件・案件${d.clients?.length || 0}件`);
            setTimeout(() => setMigrateMsg(null), 4000);
          }
        }
        if (unsub.current) unsub.current();
        unsub.current = onWorkspaceChange(ws, (remote) => {
          if (skipNext.current) { skipNext.current = false; return; }
          setData({ ...EMPTY, ...remote });
        });
      } else {
        wsIdRef.current = null;
        setWsId(null);
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
    update(d => {
      d.tasks.push({
        id: genId(), clientId: task.clientId || '', title: task.title || '無題',
        status: task.status || 'todo', assignee: task.assignee || '',
        deadline: task.deadline || '', progress: task.progress || 0,
        priority: task.priority || 'medium', revenue: task.revenue || 0,
        outsourceCost: task.outsourceCost || 0, outsourceVendor: task.outsourceVendor || '',
        outsourcePaid: false, phases: {}, notes: task.notes || '', completedAt: '', createdAt: today(),
      } as Task);
    });
  }, [update]);
  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    update(d => {
      const t = d.tasks.find(x => x.id === id);
      if (!t) return;
      if (patch.status === 'done' && t.status !== 'done') {
        patch.completedAt = today();
        patch.progress = 100;
        autoAddToInvoice(d, { ...t, ...patch } as Task);
      }
      Object.assign(t, patch);
    });
  }, [update]);
  const deleteTask = useCallback((id: string) => {
    update(d => { d.tasks = d.tasks.filter(x => x.id !== id); });
  }, [update]);

  // テンプレート適用
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
        });
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
      const num = 'INV-' + m.replace('-', '') + '-' + String(d.invoices.length + 1).padStart(3, '0');
      const due = new Date(); due.setDate(due.getDate() + 30);
      const client = d.clients.find(c => c.id === clientId);
      d.invoices.push({
        id: genId(), clientId, targetMonth: m, number: num,
        taxType: client?.taxType || 'exclusive',
        dueDate: due.toISOString().split('T')[0],
        paid: false, paidAt: '', note: '', items: [], createdAt: today(),
      });
    });
  }, [update]);
  const updateInvoice = useCallback((id: string, patch: Partial<Invoice>) => {
    update(d => { const inv = d.invoices.find(x => x.id === id); if (inv) Object.assign(inv, patch); });
  }, [update]);
  const importTasksToInvoice = useCallback((invoiceId: string) => {
    update(d => {
      const inv = d.invoices.find(x => x.id === invoiceId);
      if (!inv) return;
      d.tasks
        .filter(t => {
          if (t.status !== 'done') return false;
          if (t.clientId !== inv.clientId) return false;
          // completedAt・deadline・createdAt のいずれかが対象月に一致、またはいずれも空
          const dateStr = t.completedAt || t.deadline || t.createdAt || '';
          if (!dateStr) return true; // 日付不明の完了タスクは取込対象
          return dateStr.startsWith(inv.targetMonth);
        })
        .forEach(t => {
          if (!inv.items.some(it => it.taskId === t.id))
            inv.items.push({ taskId: t.id, name: t.title, qty: 1, unitPrice: t.revenue || 0, amount: t.revenue || 0 });
        });
    });
  }, [update]);

  const updateCompany = useCallback((patch: Partial<Company>) => {
    update(d => { Object.assign(d.company, patch); });
  }, [update]);

  const updateDiscord = useCallback((patch: Partial<DiscordSettings>) => {
    update(d => { d.discord = { webhookUrl: '', botToken: '', channelId: '', enabled: false, ...d.discord, ...patch }; });
  }, [update]);

  return {
    data, user, wsId, loading, syncing, migrateMsg, update,
    login: googleLogin, logout: googleLogout,
    addClient, updateClient, deleteClient,
    addTask, updateTask, deleteTask, applyTemplate, addTemplate, deleteTemplate,
    addInvoice, updateInvoice, importTasksToInvoice,
    updateCompany, updateDiscord,
    today, thisMonth,
  };
}

function autoAddToInvoice(d: WorkspaceData, t: Task) {
  if (!t.clientId || !t.revenue) return;
  const month = thisMonth();
  const inv = d.invoices.find(i => i.clientId === t.clientId && i.targetMonth === month && !i.paid);
  if (inv && !inv.items.some(it => it.taskId === t.id))
    inv.items.push({ taskId: t.id, name: t.title, qty: 1, unitPrice: t.revenue || 0, amount: t.revenue || 0 });
}

export { genId, today, thisMonth };
