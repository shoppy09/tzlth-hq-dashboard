'use client';

import { useState, useEffect, useRef } from 'react';

interface ChecklistItem {
  id: string;
  dept: string;
  task: string;
}

// [2026-09-30 tzlth-hq 組 3＋19 L1106] 可用性修正：
// ① 原本在伺服器渲染時就用 new Date() 算星期（Vercel＝UTC，頁面每 60 秒重產）⇒ 台灣 0-8 點
//    伺服器端算成前一天；改為瀏覽器掛載後才計算（與勾選狀態同一時機）。
// ② 原本沒有「每週六／每週日」分支 ⇒ 週日段落從未顯示；補齊 0-6。
// ③ 原本「每月 25 日」只在 25 日當天顯示；改為月底段（25 日起）＋月初段（1-5 日）。
// ④ 原 id＝段落＋全域序號 ⇒ 清單增刪一行，已勾狀態就對到別的項目；改為段落＋內容雜湊。
// ⑤ 行尾 `<!-- ws: … -->` 是 soplint I23 的「對應排程檔哪一句」標記，顯示前剝除、不入雜湊。
// ⑥ 寫入改為只送單一格；失敗退回勾選並顯示「未同步」（原本失敗靜默、伺服器也回 ok）。
const WEEKDAY_HEADS: [string, number][] = [
  ['## 每週一', 1], ['## 每週二', 2], ['## 每週三', 3], ['## 每週四', 4],
  ['## 每週五', 5], ['## 每週六', 6], ['## 每週日', 0],
];
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function stripTag(s: string): string {
  return s.replace(/\s*<!--[\s\S]*?-->\s*/g, ' ').trim();
}

export function parseDailyChecklist(md: string, now: Date): ChecklistItem[] {
  const dow = now.getDay(); // 0=Sun … 6=Sat（瀏覽器時區）
  const dom = now.getDate();

  const items: ChecklistItem[] = [];
  let include = false;
  let section = '';

  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      include = false;
      if (line.startsWith('## 每天必做')) { include = true; section = 'daily'; }
      for (const [head, d] of WEEKDAY_HEADS) {
        if (line.startsWith(head)) { include = dow === d; section = WEEKDAY_KEYS[d]; }
      }
      // 「每月 25 日」為舊標題（2026-09-30 前），保留相容
      if (line.startsWith('## 每月月底') || line.startsWith('## 每月 25 日')) { include = dom >= 25; section = 'monthend'; }
      if (line.startsWith('## 每月月初')) { include = dom <= 5; section = 'monthstart'; }
      continue;
    }
    if (!include) continue;
    const m = line.match(/^- \[(.+?)\] (.+)/);
    if (m) {
      const task = stripTag(m[2]);
      items.push({ id: `${section}-${hash(m[1] + '|' + task)}`, dept: m[1], task });
    }
  }
  return items;
}

export function DailyChecklist({ md }: { md: string }) {
  const [today, setToday] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [unsynced, setUnsynced] = useState(false);
  // 載入時的讀取若晚於使用者第一次點擊回來，不得覆蓋（2026-10-01 線上驗證時順查出的競態）
  const touched = useRef(false);

  useEffect(() => {
    const now = new Date();
    // [2026-08-30 修正 tasks L781 同族] toISOString()＝UTC 日；改用本地日（瀏覽器時區＝台灣）。
    const d = now.toLocaleDateString('sv');
    setToday(d);
    setItems(parseDailyChecklist(md, now));
    const storageKey = `daily-checklist-${d}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setChecked(JSON.parse(stored));
    } catch { /* ignore */ }
    fetch('/api/checklist-state')
      .then(r => r.json())
      .then((allState: Record<string, Record<string, boolean>>) => {
        if (touched.current) return;
        const todayState = allState[d] ?? {};
        setChecked(todayState);
        try { localStorage.setItem(storageKey, JSON.stringify(todayState)); } catch { /* ignore */ }
      })
      .catch(() => { /* 讀取失敗：沿用 localStorage */ });
  }, [md]);

  const toggle = (id: string) => {
    touched.current = true;
    const nextVal = !checked[id];
    const prev = checked;
    const next = { ...checked, [id]: nextVal };
    if (!nextVal) delete next[id];
    setChecked(next);
    fetch('/api/checklist-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, id, checked: nextVal }),
    })
      .then(async r => {
        const data = await r.json().catch(() => ({ ok: false }));
        if (!r.ok || !data.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
        const day = (data.day ?? next) as Record<string, boolean>;
        setChecked(day);
        setUnsynced(false);
        try { localStorage.setItem(`daily-checklist-${today}`, JSON.stringify(day)); } catch { /* ignore */ }
      })
      .catch(() => {
        setChecked(prev);
        setUnsynced(true);
      });
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

        {unsynced && (
          <div className="text-xs mb-2" style={{ color: '#ef4444' }}>
            ⚠️ 未同步：剛才的勾選沒有寫進總部，已退回，請再點一次
          </div>
        )}

        {/* Task list */}
        <div className="space-y-0">
          {items.map((item) => {
            const isChecked = !!checked[item.id];
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
