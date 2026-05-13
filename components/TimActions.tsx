'use client';

import { useState, useEffect } from 'react';

interface TimAction {
  id: string;
  title: string;
  detail: string;
  type: 'one-time' | 'weekly' | 'monthly' | 'quarterly';
  due: string | null;
  priority: string;
  source_system: string;
  created_at: string;
  completed: boolean;
}

export function TimActions({ actions: initial }: { actions: TimAction[] }) {
  const pending = initial.filter(a => !a.completed);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/tim-actions-state')
      .then(r => r.json())
      .then((state: Record<string, boolean>) => setChecked(state))
      .catch(() => {});
  }, []);

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    fetch('/api/tim-actions-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    }).catch(() => {});
  };

  if (pending.length === 0) return null;

  const done = pending.filter(a => checked[a.id]).length;
  const total = pending.length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  const priorityColor: Record<string, string> = {
    P1: '#ef4444', P2: '#f97316', P3: '#3b82f6',
  };

  // 排序：有 due 的排前面（按日期升序），無 due 的按 priority
  const sorted = [...pending].sort((a, b) => {
    if (a.due && !b.due) return -1;
    if (!a.due && b.due) return 1;
    if (a.due && b.due) return a.due.localeCompare(b.due);
    const pr = ['P0', 'P1', 'P2', 'P3'];
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
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-xs font-bold"
            style={{ color: allDone ? '#22c55e' : '#f97316' }}
          >
            {allDone ? '✅ Tim 待辦全部完成！' : `⚡ Tim 待辦（${total - done} 項）`}
          </span>
          <div className="flex items-center gap-2">
            <div
              style={{
                width: '60px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: 'var(--border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: allDone ? '#22c55e' : '#f97316',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span
              className="text-xs font-bold"
              style={{
                color: allDone ? '#22c55e' : '#f97316',
                minWidth: '32px',
                textAlign: 'right',
              }}
            >
              {done}/{total}
            </span>
          </div>
        </div>

        {/* Action list */}
        <div className="space-y-0">
          {sorted.map((action) => {
            const isChecked = mounted ? !!checked[action.id] : false;
            const todayStr = new Date().toISOString().slice(0, 10);
            const isOverdue = action.due ? action.due < todayStr : false;
            return (
              <label
                key={action.id}
                className="flex items-start gap-3 py-1.5 cursor-pointer"
                style={{ opacity: isChecked ? 0.45 : 1, transition: 'opacity 0.2s' }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(action.id)}
                  style={{
                    accentColor: '#f97316',
                    width: '14px',
                    height: '14px',
                    flexShrink: 0,
                    cursor: 'pointer',
                    marginTop: '2px',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        backgroundColor: `${priorityColor[action.priority] ?? '#666'}22`,
                        color: priorityColor[action.priority] ?? '#666',
                        fontSize: '10px',
                      }}
                    >
                      {action.priority}
                    </span>
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        backgroundColor: '#4f8ef722',
                        color: '#4f8ef7',
                        fontSize: '10px',
                      }}
                    >
                      {action.source_system}
                    </span>
                    {action.due && (
                      <span
                        className="text-xs shrink-0"
                        style={{
                          color: isOverdue ? '#ef4444' : 'var(--text-secondary)',
                          fontSize: '10px',
                        }}
                      >
                        {isOverdue ? '⚠️' : '📅'} {action.due}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-sm block mt-0.5"
                    style={{
                      color: isChecked ? 'var(--text-secondary)' : 'var(--text-primary)',
                      textDecoration: isChecked ? 'line-through' : 'none',
                    }}
                  >
                    {action.title}
                  </span>
                  <span
                    className="text-xs block mt-0.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {action.detail}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
