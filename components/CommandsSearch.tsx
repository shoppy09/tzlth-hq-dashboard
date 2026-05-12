'use client';
import { useState } from 'react';

export function CommandsSearch({ content }: { content: string }) {
  const [query, setQuery] = useState('');

  const lines = content.split('\n');
  const filtered = query.trim()
    ? lines.filter(l => l.toLowerCase().includes(query.toLowerCase()))
    : lines;

  return (
    <div>
      <input
        type="text"
        placeholder="搜尋指令（如：週報、部署、AK…）"
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full px-3 py-2 text-xs rounded-lg mb-2"
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          outline: 'none',
          fontFamily: '"Noto Sans TC", "PingFang TC", sans-serif',
        }}
      />
      {query.trim() && filtered.length === 0 && (
        <div className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>
          找不到含「{query}」的指令
        </div>
      )}
      <pre
        className="text-xs leading-relaxed whitespace-pre-wrap"
        style={{
          color: 'var(--text-primary)',
          fontFamily: '"Noto Sans TC", "PingFang TC", sans-serif',
          maxHeight: '480px',
          overflowY: 'auto',
        }}
      >
        {filtered.join('\n')}
      </pre>
    </div>
  );
}
