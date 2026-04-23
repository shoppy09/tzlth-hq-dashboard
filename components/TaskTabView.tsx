'use client';
import { useState } from 'react';

interface Task { priority: string; system: string; content: string; }

function priorityColor(p: string) {
  if (p === 'P0') return '#ef4444';
  if (p === 'P1') return '#f97316';
  if (p === 'P2') return '#eab308';
  return '#64748b';
}

export function TaskTabView({
  p1Tasks,
  p2Tasks,
}: {
  p1Tasks: Task[];
  p2Tasks: Task[];
}) {
  const [active, setActive] = useState<'P1' | 'P2'>('P1');
  const tasks = active === 'P1' ? p1Tasks : p2Tasks;

  return (
    <div>
      {/* ── Header + Tab 切換列 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            ⚡ 任務追蹤
          </span>
          <div style={{ height: '1px', width: 40, backgroundColor: 'var(--border)' }} />
        </div>
        <div className="flex gap-1.5">
          {(['P1', 'P2'] as const).map((p) => {
            const count = p === 'P1' ? p1Tasks.length : p2Tasks.length;
            const isActive = active === p;
            return (
              <button
                key={p}
                onClick={() => setActive(p)}
                style={{
                  padding: '3px 12px',
                  borderRadius: 20,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: `1px solid ${isActive ? priorityColor(p) : 'var(--border)'}`,
                  backgroundColor: isActive ? priorityColor(p) + '20' : 'var(--bg-card)',
                  color: isActive ? priorityColor(p) : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {p}
                <span style={{
                  marginLeft: 4,
                  fontSize: 10,
                  opacity: 0.8,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 任務列表 */}
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((t, i) => (
            <div
              key={i}
              className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              <span
                className="text-xs font-bold px-2 py-0.5 rounded mt-0.5 shrink-0"
                style={{
                  backgroundColor: priorityColor(t.priority) + '20',
                  color: priorityColor(t.priority),
                }}
              >
                {t.priority}
              </span>
              <div>
                <div
                  className="text-xs font-semibold mb-0.5"
                  style={{ color: active === 'P1' ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  {t.system}
                </div>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {t.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: `1px solid ${active === 'P1' ? '#22c55e30' : 'var(--border)'}`,
            color: active === 'P1' ? '#22c55e' : 'var(--text-secondary)',
          }}
        >
          {active === 'P1' ? '✓ 本週無緊急任務' : '暫無 P2 推進項目'}
        </div>
      )}
    </div>
  );
}
