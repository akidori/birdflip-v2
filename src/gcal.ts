// ─────────────────────────────────────────────────────────────
//  gcal.ts — Google Calendar API操作モジュール
//  BirdFlip v2 × GCal連携
//
//  クライアント別カラーマップ（GCal colorId 1-11）
//  1=ラベンダー 2=セージ 3=グレープ 4=フラミンゴ 5=バナナ
//  6=タンジェリン 7=ピーコック 8=ブルーベリー 9=バジル 10=トマト 11=コバルト
// ─────────────────────────────────────────────────────────────

import type { Task, Client, GCalSettings } from './types';

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';

// クライアント番号（追加順）→ GCal colorId のマッピング
const COLOR_CYCLE = [7, 6, 9, 4, 11, 2, 10, 5, 3, 8, 1];

export function getClientColorId(clientId: string, clients: Client[], colorMap: Record<string, number>): number {
  if (colorMap[clientId]) return colorMap[clientId];
  // 未割り当て → 追加順でサイクル
  const idx = clients.findIndex(c => c.id === clientId);
  return COLOR_CYCLE[Math.max(0, idx) % COLOR_CYCLE.length];
}

// ─── Access Token チェック ────────────────────────────────────
export function isTokenValid(gcal: GCalSettings): boolean {
  return !!(gcal.accessToken && gcal.tokenExpiry && Date.now() < gcal.tokenExpiry - 60000);
}

// ─── GCal APIリクエスト共通 ────────────────────────────────────
async function gcalFetch(
  method: string,
  path: string,
  token: string,
  body?: object
): Promise<Response> {
  return fetch(`${GCAL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ─── イベントボディ生成 ────────────────────────────────────────
function makeEventBody(
  summary: string,
  date: string,
  colorId: number,
  description?: string,
  isDone?: boolean
) {
  return {
    summary,
    description: description || '',
    start: { date },        // 終日イベント
    end: { date },
    colorId: String(colorId),
    status: isDone ? 'cancelled' : 'confirmed',
  };
}

// ─── イベント作成 ─────────────────────────────────────────────
export async function createEvent(
  token: string,
  calendarId: string,
  summary: string,
  date: string,
  colorId: number,
  description?: string
): Promise<string | null> {
  try {
    const res = await gcalFetch('POST', `/calendars/${encodeURIComponent(calendarId)}/events`, token,
      makeEventBody(summary, date, colorId, description));
    if (!res.ok) {
      console.error('[GCal] createEvent failed:', await res.text());
      return null;
    }
    const data = await res.json();
    return data.id as string;
  } catch (e) {
    console.error('[GCal] createEvent error:', e);
    return null;
  }
}

// ─── イベント更新 ─────────────────────────────────────────────
export async function updateEvent(
  token: string,
  calendarId: string,
  eventId: string,
  summary: string,
  date: string,
  colorId: number,
  description?: string,
  isDone?: boolean
): Promise<boolean> {
  try {
    const res = await gcalFetch('PUT', `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, token,
      makeEventBody(summary, date, colorId, description, isDone));
    if (!res.ok) {
      // 404なら削除済み → 再作成が必要
      if (res.status === 404) return false;
      console.error('[GCal] updateEvent failed:', await res.text());
    }
    return res.ok;
  } catch (e) {
    console.error('[GCal] updateEvent error:', e);
    return false;
  }
}

// ─── イベント削除 ─────────────────────────────────────────────
export async function deleteEvent(
  token: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  try {
    await gcalFetch('DELETE', `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, token);
  } catch (e) {
    console.error('[GCal] deleteEvent error:', e);
  }
}

// ─── タスク → GCal全同期 ─────────────────────────────────────
// タスクの締切日＋全フェーズをGCalに反映
// 戻り値: { gcalDeadlineEventId, gcalPhaseEventIds } の更新パッチ
export async function syncTaskToGCal(
  task: Task,
  clients: Client[],
  gcal: GCalSettings
): Promise<Partial<Task>> {
  if (!isTokenValid(gcal)) return {};

  const { accessToken, calendarId, clientColorMap } = gcal;
  const client = clients.find(c => c.id === task.clientId);
  const clientName = client?.name || '不明';
  const colorId = getClientColorId(task.clientId, clients, clientColorMap);
  const isDone = task.status === 'done';
  const desc = `[BirdFlip] ${clientName} / 進捗${task.progress}%`;

  const patch: Partial<Task> = {
    gcalPhaseEventIds: { ...(task.gcalPhaseEventIds || {}) },
  };

  // ── 締切日イベント ──
  if (task.deadline) {
    const summary = `📋 ${task.title}【納品】`;
    if (task.gcalDeadlineEventId) {
      // 既存イベント更新
      const ok = await updateEvent(accessToken, calendarId, task.gcalDeadlineEventId,
        summary, task.deadline, colorId, desc, isDone);
      if (!ok) {
        // 404等 → 再作成
        const id = await createEvent(accessToken, calendarId, summary, task.deadline, colorId, desc);
        if (id) patch.gcalDeadlineEventId = id;
      }
    } else {
      const id = await createEvent(accessToken, calendarId, summary, task.deadline, colorId, desc);
      if (id) patch.gcalDeadlineEventId = id;
    }
  } else if (task.gcalDeadlineEventId) {
    // 締切日が消された → イベント削除
    await deleteEvent(accessToken, calendarId, task.gcalDeadlineEventId);
    patch.gcalDeadlineEventId = '';
  }

  // ── フェーズイベント ──
  const PHASE_EMOJI: Record<string, string> = {
    'ヒアリング': '👂', '構成': '📝', '撮影': '🎬',
    '素材共有': '📦', '編集': '✂️', 'サムネ': '🖼',
    'D初稿': '📤', '先方初稿': '📩', '演者初稿': '🎭',
    '納品': '📦', 'アップロード': '🚀',
  };

  for (const [phaseName, phaseDate] of Object.entries(task.phases || {})) {
    if (!phaseDate) continue;
    const emoji = PHASE_EMOJI[phaseName] || '📌';
    const summary = `${emoji} ${task.title}【${phaseName}】`;
    const existingId = (patch.gcalPhaseEventIds as Record<string,string>)[phaseName];

    if (existingId) {
      const ok = await updateEvent(accessToken, calendarId, existingId,
        summary, phaseDate, colorId, desc, isDone);
      if (!ok) {
        const id = await createEvent(accessToken, calendarId, summary, phaseDate, colorId, desc);
        if (id) (patch.gcalPhaseEventIds as Record<string,string>)[phaseName] = id;
      }
    } else {
      const id = await createEvent(accessToken, calendarId, summary, phaseDate, colorId, desc);
      if (id) (patch.gcalPhaseEventIds as Record<string,string>)[phaseName] = id;
    }
  }

  // フェーズが削除されたイベントを消す
  for (const [phaseName, eventId] of Object.entries(task.gcalPhaseEventIds || {})) {
    if (eventId && !(task.phases || {})[phaseName]) {
      await deleteEvent(accessToken, calendarId, eventId);
      delete (patch.gcalPhaseEventIds as Record<string,string>)[phaseName];
    }
  }

  return patch;
}

// ─── タスク削除時 → 全GCalイベント削除 ──────────────────────
export async function deleteTaskGCalEvents(task: Task, gcal: GCalSettings): Promise<void> {
  if (!isTokenValid(gcal)) return;
  const { accessToken, calendarId } = gcal;

  if (task.gcalDeadlineEventId)
    await deleteEvent(accessToken, calendarId, task.gcalDeadlineEventId);

  for (const eventId of Object.values(task.gcalPhaseEventIds || {})) {
    if (eventId) await deleteEvent(accessToken, calendarId, eventId);
  }
}
