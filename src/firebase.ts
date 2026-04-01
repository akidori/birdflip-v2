import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import type { WorkspaceData, Task, Client } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyAjBviZ8Pcg3fX8ti2y3y1nMcBz_Dps7mw",
  authDomain: "birdstraike.firebaseapp.com",
  projectId: "birdstraike",
  storageBucket: "birdstraike.firebasestorage.app",
  messagingSenderId: "177151250196",
  appId: "1:177151250196:web:21aefe5c0a53dcb82b7c01"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
// Google Calendar読み書き権限
provider.addScope('https://www.googleapis.com/auth/calendar.events');

export async function googleLogin() {
  const result = await signInWithPopup(auth, provider);
  // OAuthアクセストークンを返す（GCal連携で使用）
  const credential = GoogleAuthProvider.credentialFromResult(result);
  return { result, accessToken: credential?.accessToken || null };
}

export async function googleLogout() {
  return signOut(auth);
}

export function onAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

// ─────────────────────────────────────
//  旧アプリ(birdflip-app)データを変換
// ─────────────────────────────────────
function migrateOldData(old: any): WorkspaceData {
  const oldTasks: any[] = old.tasks || [];
  const oldProjects: string[] = old.projects || [];

  // プロジェクト名 → Client に変換
  const clients: Client[] = oldProjects.map((name, i) => ({
    id: 'c_migrated_' + i,
    name,
    taxType: 'exclusive' as const,
  }));

  // categoryが一致するclientIdを探すヘルパー
  const findClientId = (category: string): string => {
    const c = clients.find(c => c.name === category);
    return c?.id || '';
  };

  // タスク変換
  const tasks: Task[] = oldTasks.map((t: any) => ({
    id: t.id || ('t_' + Date.now() + Math.random().toString(36).slice(2)),
    clientId: findClientId(t.category || t.project || ''),
    title: t.title || '無題',
    status: t.status || 'todo',
    assignee: t.assignee || '',
    deadline: t.deadline || '',
    progress: typeof t.progress === 'number' ? t.progress : 0,
    priority: t.priority || 'medium',
    revenue: typeof t.revenue === 'number' ? t.revenue : 0,
    outsourceCost: typeof t.outsourceCost === 'number' ? t.outsourceCost : 0,
    outsourceVendor: t.outsourceVendor || '',
    outsourcePaid: !!t.outsourcePaid,
    phases: t.phases || {},
    notes: t.notes || t.memo || '',
    completedAt: t.completedAt || (t.status === 'done' ? (t.deadline || '') : ''),
    createdAt: t.createdAt || t.deadline || '',
  }));

  return {
    clients,
    tasks,
    invoices: [],
    company: {
      name: old.company?.name || '',
      zip: old.company?.zip || '',
      addr: old.company?.addr || '',
      tel: old.company?.tel || '',
      email: old.company?.email || '',
      bank: old.company?.bank || '',
      branch: old.company?.branch || '',
      aType: old.company?.aType || '普通',
      aNo: old.company?.aNo || '',
      aName: old.company?.aName || '',
      reg: old.company?.reg || '',
    },
    templates: [],
    lastUpdated: old.lastUpdated || new Date().toISOString(),
  };
}

// ─────────────────────────────────────
//  ワークスペースID取得
// ─────────────────────────────────────
export async function getUserWorkspaceId(uid: string): Promise<string | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return userDoc.data().workspaceId || null;
  }
  return null;
}

// ─────────────────────────────────────
//  新規ワークスペース作成
// ─────────────────────────────────────
export async function createWorkspace(uid: string, email: string): Promise<string> {
  const wsId = 'ws_' + uid.slice(0, 8);
  // 既存データがある場合は上書きしない（okrフィールドのみ追加）
  const existing = await getDoc(doc(db, 'workspaces', wsId));
  if (existing.exists()) {
    // 既存データ保護：okrフィールドがなければ追加するだけ
    const d = existing.data() as any;
    if (!d.okr) {
      await setDoc(doc(db, 'workspaces', wsId), { okr: { objectives: [] } }, { merge: true });
    }
    await setDoc(doc(db, 'users', uid), { workspaceId: wsId, email }, { merge: true });
    return wsId;
  }
  // 新規ユーザーのみ完全初期化
  await setDoc(doc(db, 'workspaces', wsId), {
    createdBy: uid,
    createdAt: new Date().toISOString(),
    clients: [], tasks: [], invoices: [],
    company: { name: '', zip: '', addr: '', tel: '', email: '', bank: '', branch: '', aType: '普通', aNo: '', aName: '', reg: '' },
    okr: { objectives: [] },
    lastUpdated: new Date().toISOString(),
  });
  await setDoc(doc(db, 'users', uid), { workspaceId: wsId, email }, { merge: true });
  return wsId;
}

// ─────────────────────────────────────
//  ワークスペースロード（旧データ移行付き）
// ─────────────────────────────────────
export async function loadWorkspace(wsId: string): Promise<WorkspaceData | null> {
  const wsDoc = await getDoc(doc(db, 'workspaces', wsId));

  if (!wsDoc.exists()) return null;

  const raw = wsDoc.data() as any;

  // ★ 新フォーマット判定: clientsフィールドが配列で存在すればOK
  if (Array.isArray(raw.clients)) {
    const data = raw as WorkspaceData;

    // 旧データも別途取得してマージする（旧タスクが新データより多い場合）
    await mergeOldTasksIfNeeded(wsId, data);

    return data;
  }

  // ★ 旧フォーマット: tasks・projectsフィールドが存在する
  if (Array.isArray(raw.tasks) || Array.isArray(raw.projects)) {
    console.log('[BirdFlip] 旧データを検出。マイグレーションを実行します...');
    const migrated = migrateOldData(raw);
    // 移行済みデータを保存
    await saveWorkspace(wsId, migrated);
    console.log('[BirdFlip] マイグレーション完了', migrated.tasks.length, 'タスク', migrated.clients.length, '案件');
    return migrated;
  }

  return raw as WorkspaceData;
}

// ─────────────────────────────────────
//  旧サブコレクション(tasks)もチェックしてマージ
// ─────────────────────────────────────
async function mergeOldTasksIfNeeded(wsId: string, current: WorkspaceData): Promise<void> {
  try {
    // 旧アプリがサブコレクション形式でタスクを保存していた場合
    // workspaces/{wsId}/tasks サブコレクションを確認
    const tasksCol = await getDocs(collection(db, 'workspaces', wsId, 'tasks'));
    if (tasksCol.empty) return;

    const subTasks = tasksCol.docs.map(d => ({ id: d.id, ...d.data() }));
    const existingIds = new Set(current.tasks.map(t => t.id));
    let added = 0;

    for (const t of subTasks) {
      if (!existingIds.has(t.id)) {
        // 旧形式から変換
        const clientId = (() => {
          const name = (t as any).category || (t as any).project || '';
          const c = current.clients.find(c => c.name === name);
          if (c) return c.id;
          // 新しいclientを追加
          if (name) {
            const newClient: Client = { id: 'c_' + Date.now() + '_' + added, name, taxType: 'exclusive' };
            current.clients.push(newClient);
            return newClient.id;
          }
          return '';
        })();

        current.tasks.push({
          id: (t as any).id,
          clientId,
          title: (t as any).title || '無題',
          status: (t as any).status || 'todo',
          assignee: (t as any).assignee || '',
          deadline: (t as any).deadline || '',
          progress: (t as any).progress || 0,
          priority: (t as any).priority || 'medium',
          revenue: (t as any).revenue || 0,
          outsourceCost: (t as any).outsourceCost || 0,
          outsourceVendor: (t as any).outsourceVendor || '',
          outsourcePaid: false,
          phases: (t as any).phases || {},
          notes: (t as any).notes || '',
          completedAt: (t as any).completedAt || '',
          createdAt: (t as any).createdAt || '',
        });
        added++;
      }
    }

    if (added > 0) {
      console.log(`[BirdFlip] サブコレクションから ${added} タスクをマージしました`);
      await saveWorkspace(wsId, current);
    }
  } catch (e) {
    // サブコレクションが存在しない場合はスキップ
    console.log('[BirdFlip] サブコレクション確認スキップ:', e);
  }
}

// ─────────────────────────────────────
//  保存
// ─────────────────────────────────────
export async function saveWorkspace(wsId: string, data: WorkspaceData) {
  data.lastUpdated = new Date().toISOString();
  // merge:trueは使わない（配列フィールドは完全上書きが正しい）
  await setDoc(doc(db, 'workspaces', wsId), data);
}

// ─────────────────────────────────────
//  リアルタイムリスナー
// ─────────────────────────────────────
export function onWorkspaceChange(wsId: string, cb: (data: WorkspaceData) => void) {
  return onSnapshot(doc(db, 'workspaces', wsId), (snap) => {
    if (snap.exists()) cb(snap.data() as WorkspaceData);
  });
}

export type { User } from "firebase/auth";
