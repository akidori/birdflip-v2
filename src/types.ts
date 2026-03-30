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
}

export interface Invoice {
  id: string;
  clientId: string;
  targetMonth: string;
  number: string;
  taxType: 'exclusive' | 'inclusive' | 'none';
  dueDate: string;
  paid: boolean;
  paidAt: string;
  note: string;
  items: InvoiceItem[];
  createdAt: string;
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
  name: string;        // テンプレート名（例: 密着案件）
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
  botToken: string;    // ピッピBot token (オプション)
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
  lastUpdated: string;
}
