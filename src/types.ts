export interface Client {
  id: string;
  name: string;
  contact?: string;
  address?: string;
  zip?: string;
  taxType: 'exclusive' | 'inclusive' | 'none';
}

export interface Task {
  id: string;
  clientId: string;
  title: string;
  status: TaskStatus;
  assignee: string;
  deadline: string;
  progress: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  revenue: number;
  outsourceCost: number;
  outsourceVendor: string;
  outsourcePaid: boolean;
  phases: Record<string, string>;
  notes: string;
  completedAt: string;
  createdAt: string;
  gcalDeadlineEventId?: string;
  gcalPhaseEventIds?: Record<string, string>;
  // 請求バッファ: どの月の請求に入れるか（確定前の仮置き）
  billingMonth?: string;    // 'YYYY-MM' or '' = 未確定
  billingConfirmed?: boolean; // trueになったらInvoiceに入済み
}

export type TaskStatus =
  'todo' | 'hearing' | 'plan' | 'shoot' | 'edit' |
  'thumb' | 'review' | 'fix' | 'done' | 'stop';

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; progress: number }> = {
  todo:    { label: '未着手',    color: '#8da4b8', progress: 0 },
  hearing: { label: 'ヒアリング', color: '#60a5fa', progress: 10 },
  plan:    { label: '構成',      color: '#a78bfa', progress: 20 },
  shoot:   { label: '撮影',      color: '#f472b6', progress: 35 },
  edit:    { label: '編集',      color: '#fbbf24', progress: 50 },
  thumb:   { label: 'サムネ',    color: '#fb923c', progress: 70 },
  review:  { label: '確認待ち',  color: '#34d399', progress: 80 },
  fix:     { label: '修正',      color: '#e879f9', progress: 90 },
  done:    { label: '完了',      color: '#22c55e', progress: 100 },
  stop:    { label: '停止',      color: '#6b7280', progress: 0 },
};

export const PHASES = ['ヒアリング','構成','撮影','素材共有','編集','サムネ','D初稿','先方初稿','演者初稿','納品','アップロード'];

export interface InvoiceItem {
  taskId: string;
  name: string;
  qty: number;
  unitPrice: number;
  amount: number;
  tax?: number; // 明細個別の税額（任意）
}

export interface Invoice {
  id: string;
  clientId: string;
  targetMonth: string; // 'YYYY-MM'
  number: string;
  taxType: 'exclusive' | 'inclusive' | 'none';
  issueDate: string;   // 発行日
  dueDate: string;     // 支払期限
  paid: boolean;
  paidAt: string;
  note: string;
  items: InvoiceItem[];
  createdAt: string;
  locked: boolean;     // true = PDF送付済み / 編集不可
}

export interface Company {
  name: string;
  zip: string;
  addr: string;
  tel: string;
  email: string;
  bank: string;
  branch: string;
  aType: string;
  aNo: string;
  aName: string;
  reg: string;
}

// タスクテンプレート
export interface TaskTemplate {
  id: string;
  name: string;
  tasks: {
    title: string;
    status: TaskStatus;
    priority: Task['priority'];
    notes: string;
  }[];
  createdAt: string;
}

// Discord設定
export interface DiscordSettings {
  webhookUrl: string;
  botToken: string;
  channelId: string;
  enabled: boolean;
}

export interface WorkspaceData {
  clients: Client[];
  tasks: Task[];
  invoices: Invoice[];
  company: Company;
  templates?: TaskTemplate[];
  discord?: DiscordSettings;
  gcal?: GCalSettings;
  okr?: OKRSettings;
  lastUpdated: string;
}

// Google Calendar設定
export interface GCalSettings {
  enabled: boolean;
  accessToken: string;
  tokenExpiry: number;
  calendarId: string;
  clientColorMap: Record<string, number>;
}

// ─── OKR ───────────────────────────────────────
export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  target: number;       // 目標値（例: 1000000）
  current: number;      // 現在値（手動 or タスクから自動集計）
  unit: string;         // 単位（例: '円', '件', '%'）
  autoCalc: boolean;    // trueならタスクのrevenueから自動集計
  taskIds: string[];    // 紐付けタスクID
  dueDate: string;
  notes: string;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  period: 'annual' | 'q1' | 'q2' | 'q3' | 'q4';
  year: number;
  parentId?: string;    // 年間OのIDを持つ四半期O
  keyResults: KeyResult[];
  createdAt: string;
}

export interface OKRSettings {
  objectives: Objective[];
}
