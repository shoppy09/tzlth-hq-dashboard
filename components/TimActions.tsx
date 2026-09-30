'use client';

import { useState, useEffect } from 'react';

// [2026-09-30 tzlth-hq 組 3 L1204｜RCF-216] 改版：Tim 回報「勾不勾都一樣」。
// 診斷＝勾了沒有後續、清單不更新、例行項勾一次就永遠是勾、寫入失敗不提示。
// 現在的流程：Tim 勾選＝🟡「已回報」→ Claude 收尾時由 hook 撈出、到平台回讀 →
//   生效：Claude 在 tim-actions.json 標 verified（移到「最近確認」）／
//   未生效：Claude 寫 readback_note 並清掉勾選（面板顯示原因）。
export interface TimAction {
  id: string;
  title: string;
  detail: string;
  type: string;
  due: string | null;
  priority: string;
  source_system: string;
  created_at: string;
  completed: boolean;
  status?: 'todo' | 'verified' | 'self_attested' | 'moved' | 'done';
  how?: string;
  minutes?: number;
  where_url?: string;
  readback_note?: string;
  verified_at?: string;
  verified_how?: string;
  recurring?: { every: 'month'; day: number };
  verified_period?: string; // 例行項：Claude 已確認的期別（YYYY-MM）
}

type State = Record<string, string | boolean>;

// 台灣日期（伺服器在 UTC，台灣 08:00 前 toISOString 會少一天；2026-08-30 同元件修過一次）
function todayTaipei(): string {
  return new Date().toLocaleDateString('sv', { timeZone: 'Asia/Taipei' });
}

function daysSince(dateStr: string, today: string): number {
  return Math.round((Date.parse(today) - Date.parse(dateStr.slice(0, 10))) / 86400000);
}

function keyOf(a: TimAction, month: string): string {
  return a.recurring ? `${a.id}@${month}` : a.id;
}

const priorityColor: Record<string, string> = {
  P1: '#ef4444', P2: '#f97316', P3: '#3b82f6',
};

const badge = (bg: string, fg: string) => ({
  backgroundColor: bg, color: fg, fontSize: '10px',
});

export function TimActions({ actions, updatedAt }: { actions: TimAction[]; updatedAt: string | null }) {
  const pending = actions.filter(a => !a.completed);
  const [state, setState] = useState<State>({});
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    fetch('/api/tim-actions-state', { cache: 'no-store' })
      .then(r => r.json())
      .then((s: State) => setState(s))
      .catch(() => {});
  }, []);

  const today = mounted ? todayTaipei() : '';
  const month = today.slice(0, 7);

  const recent = mounted
    ? actions.filter(a => a.status === 'verified' && a.verified_at && daysSince(a.verified_at, today) <= 7)
    : [];

  const send = async (key: string, next: boolean) => {
    const prev = state[key];
    setBusy(b => ({ ...b, [key]: true }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
    setState(s => {
      const n = { ...s };
      if (next) n[key] = new Date().toISOString(); else delete n[key];
      return n;
    });
    try {
      const r = await fetch('/api/tim-actions-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, checked: next }),
      });
      const j = await r.json().catch(() => ({})) as { ok?: boolean; state?: State; error?: string };
      if (!r.ok || !j.ok) throw new Error(j.error || `HTTP ${r.status}`);
      if (j.state) setState(j.state);
    } catch (err) {
      setState(s => {
        const n = { ...s };
        if (prev === undefined) delete n[key]; else n[key] = prev;
        return n;
      });
      setErrors(e => ({ ...e, [key]: err instanceof Error ? err.message : String(err) }));
    } finally {
      setBusy(b => { const n = { ...b }; delete n[key]; return n; });
    }
  };

  if (pending.length === 0 && recent.length === 0) return null;

  const periodDone = (a: TimAction) => !!a.recurring && mounted && a.verified_period === month;
  const open = pending.filter(a => !periodDone(a));
  const reportedCount = mounted ? open.filter(a => !!state[keyOf(a, month)]).length : 0;
  const todoCount = open.length - reportedCount;
  const allDone = open.length === 0;

  // 排序：被退回（有 readback_note）優先 → 有 due 依日期 → priority
  const pr = ['P0', 'P1', 'P2', 'P3'];
  const sorted = [...pending].sort((a, b) => {
    if (periodDone(a) !== periodDone(b)) return periodDone(a) ? 1 : -1;
    if (!!a.readback_note !== !!b.readback_note) return a.readback_note ? -1 : 1;
    if (a.due && !b.due) return -1;
    if (!a.due && b.due) return 1;
    if (a.due && b.due) return a.due.localeCompare(b.due);
    return pr.indexOf(a.priority) - pr.indexOf(b.priority);
  });

  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <div
        className="rounded-xl px-4 py-3"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: `1px solid ${allDone ? '#22c55e44' : '#f9731660'}`,
          borderLeft: `3px solid ${allDone ? '#22c55e' : '#f97316'}`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <span className="text-xs font-bold" style={{ color: allDone ? '#22c55e' : '#f97316' }}>
            {allDone
              ? '✅ Tim 待辦全部完成'
              : `⚡ Tim 待辦：待做 ${todoCount}・等 Claude 確認 ${reportedCount}`}
          </span>
          {updatedAt && (
            <span className="text-xs" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
              清單更新於 {updatedAt}
            </span>
          )}
        </div>
        {!allDone && (
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
            做完就打勾＝告訴 Claude。Claude 下次收尾會到平台上確認：生效就移到「最近確認」，沒生效會退回並寫原因。
          </p>
        )}

        {/* Action list */}
        <div className="space-y-2">
          {sorted.map((action) => {
            const key = keyOf(action, month);
            const tick = mounted ? state[key] : undefined;
            const isChecked = !!tick;
            const tickDate = typeof tick === 'string' ? tick.slice(0, 10) : null;
            const isOverdue = mounted && action.due ? action.due < today : false;
            const err = errors[key];
            const inputId = `ta-${key}`;
            return (
              <div key={action.id} className="flex items-start gap-3 py-1">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={isChecked}
                  disabled={!mounted || !!busy[key]}
                  onChange={() => send(key, !isChecked)}
                  style={{
                    accentColor: '#f59e0b',
                    width: '16px',
                    height: '16px',
                    flexShrink: 0,
                    cursor: 'pointer',
                    marginTop: '2px',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded shrink-0"
                      style={badge(`${priorityColor[action.priority] ?? '#666'}22`, priorityColor[action.priority] ?? '#666')}>
                      {action.priority}
                    </span>
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded shrink-0"
                      style={badge('#4f8ef722', '#4f8ef7')}>
                      {action.source_system}
                    </span>
                    {action.recurring && (
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                        🔁 每月 {action.recurring.day} 日（{month}）
                      </span>
                    )}
                    {action.due && (
                      <span className="text-xs shrink-0"
                        style={{ color: isOverdue ? '#ef4444' : 'var(--text-secondary)', fontSize: '10px' }}>
                        {isOverdue ? '⚠️' : '📅'} {action.due}
                      </span>
                    )}
                    {action.minutes && (
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                        ⏱ 約 {action.minutes} 分
                      </span>
                    )}
                  </div>
                  <label htmlFor={inputId} className="text-sm block mt-0.5 cursor-pointer"
                    style={{ color: 'var(--text-primary)' }}>
                    {action.title}
                  </label>
                  {periodDone(action) && (
                    <span className="text-xs block mt-0.5" style={{ color: '#22c55e' }}>
                      ✅ 本期（{month}）Claude 已確認
                    </span>
                  )}
                  {isChecked && !periodDone(action) && (
                    <span className="text-xs block mt-0.5" style={{ color: '#f59e0b' }}>
                      🟡 已回報{tickDate ? `（${tickDate}）` : ''}，等 Claude 到平台確認
                    </span>
                  )}
                  {!isChecked && action.readback_note && (
                    <span className="text-xs block mt-0.5" style={{ color: '#ef4444' }}>
                      🔴 上次確認：{action.readback_note}
                    </span>
                  )}
                  {action.how && (
                    <span className="text-xs block mt-0.5" style={{ color: 'var(--text-primary)' }}>
                      👉 {action.how}
                      {action.where_url && (
                        <>
                          {' '}
                          <a href={action.where_url} target="_blank" rel="noopener noreferrer"
                            style={{ color: '#4f8ef7', textDecoration: 'underline' }}>
                            前往
                          </a>
                        </>
                      )}
                    </span>
                  )}
                  {err && (
                    <span className="text-xs block mt-0.5" style={{ color: '#ef4444' }}>
                      ⚠️ 沒有同步成功（{err}）{' '}
                      <button type="button" onClick={() => send(key, !isChecked)}
                        style={{ textDecoration: 'underline', color: '#ef4444' }}>
                        重試
                      </button>
                    </span>
                  )}
                  {action.detail && (
                    <details className="mt-0.5">
                      <summary className="text-xs cursor-pointer" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                        說明
                      </summary>
                      <span className="text-xs block mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {action.detail}
                      </span>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 最近確認 */}
        {recent.length > 0 && (
          <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
            <span className="text-xs font-bold" style={{ color: '#22c55e' }}>✅ 最近 7 天確認</span>
            <div className="space-y-0.5 mt-1">
              {recent.map(a => (
                <details key={a.id} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <summary className="cursor-pointer">
                    {a.title}（{a.verified_at}）
                  </summary>
                  {a.verified_how && <span className="block mt-0.5 pl-3">怎麼確認的：{a.verified_how}</span>}
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
