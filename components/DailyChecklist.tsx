'use client';

import { useState, useEffect } from 'react';

interface ChecklistItem {
  id: string;
  dept: string;
  task: string;
}

function parseDailyChecklist(md: string): ChecklistItem[] {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun,1=Mon,...,5=Fri
  const dom = today.getDate();

  const lines = md.split('\n');
  const items: ChecklistItem[] = [];
  let include = false;
  let section = '';
  let idx = 0;

  for (const line of lines) {
    if (line.startsWith('## 每天必做')) { include = true; section = 'daily'; }
    else if (line.startsWith('## 每週一')) { include = dow === 1; section = 'mon'; }
    else if (line.startsWith('## 每週五')) { include = dow === 5; section = 'fri'; }
    else if (line.startsWith('## 每月 25 日')) { include = dom === 25; section = 'month25'; }
    else if (line.startsWith('## ')) { include = false; }

    if (include) {
      const m = line.match(/^- \[(.+?)\] (.+)/);
      if (m) {
        items.push({ id: `${section}-${idx++}`, dept: m[1], task: m[2] });
      }
    }
  }
  return items;
}

export function DailyChecklist({ md }: { md: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const storageKey = `daily-checklist-${today}`;
  const items = parseDailyChecklist(md);

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setChecked(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [storageKey]);

  const toggle = (id: string) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
  };

  if (items.length === 0) return null;

  const done = items.filter(i => checked[i.id]).length;
  const total = items.length;
  const allDone = done === total;
  const pct = Math.round((done / total) * 100);

  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <div
        className="rounded-xl px-4 py-3"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: `1px solid ${allDone ? '#22c55e44' : 'var(--border)'}`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold" style={{ color: allDone ? '#22c55e' : 'var(--text-primary)' }}>
            {allDone ? '✅ 今日任務全部完成！' : '📋 今日任務'}
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
                  backgroundColor: allDone ? '#22c55e' : '#4f8ef7',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span className="text-xs font-bold" style={{ color: allDone ? '#22c55e' : 'var(--accent)', minWidth: '32px', textAlign: 'right' }}>
              {done}/{total}
            </span>
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-0">
          {items.map((item) => {
            const isChecked = mounted ? !!checked[item.id] : false;
            return (
              <label
                key={item.id}
                className="flex items-center gap-3 py-1.5 cursor-pointer"
                style={{ opacity: isChecked ? 0.5 : 1, transition: 'opacity 0.2s' }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(item.id)}
                  style={{ accentColor: '#4f8ef7', width: '14px', height: '14px', flexShrink: 0, cursor: 'pointer' }}
                />
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded shrink-0"
                  style={{ backgroundColor: '#4f8ef722', color: '#4f8ef7', fontSize: '10px' }}
                >
                  {item.dept}
                </span>
                <span
                  className="text-sm"
                  style={{
                    color: isChecked ? 'var(--text-secondary)' : 'var(--text-primary)',
                    textDecoration: isChecked ? 'line-through' : 'none',
                  }}
                >
                  {item.task}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
