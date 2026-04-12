'use client';

import { useState } from 'react';
import { System } from '@/lib/types';

function statusInfo(status: string) {
  if (status === 'live' || status === 'active') return { color: '#22c55e', label: '上線中' };
  if (status === 'testing')                     return { color: '#eab308', label: '測試中' };
  if (status === 'deployed_unverified')         return { color: '#f97316', label: '待驗證' };
  return { color: '#64748b', label: status };
}

function HealthSegments({ score }: { score: number }) {
  const color = score >= 4 ? '#22c55e' : score >= 3 ? '#eab308' : '#ef4444';
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: '10px',
            height: '5px',
            borderRadius: '2px',
            backgroundColor: i < score ? color : '#1a2540',
          }}
        />
      ))}
      <span className="text-xs ml-1" style={{ color: '#64748b' }}>{score}/5</span>
    </div>
  );
}

export function SystemCard({ sys }: { sys: System }) {
  const [expanded, setExpanded] = useState(false);
  const dot      = statusInfo(sys.status);
  const hasTasks = sys.pending_tasks.length > 0;

  return (
    <div
      className="rounded-xl px-4 py-3 cursor-pointer select-none hover-card"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* 第一行：名稱 + 狀態 + URL + 展開 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: dot.color }} />
          <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
            {sys.short_code}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {sys.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {sys.url && (
            <a
              href={sys.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold"
              style={{ color: 'var(--accent)', textDecoration: 'none' }}
              onClick={(e) => e.stopPropagation()}
            >
              開啟 ↗
            </a>
          )}
          <span className="text-xs font-medium" style={{ color: dot.color }}>{dot.label}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* 第二行：健康分段 + 待辦數 */}
      <div className="flex items-center justify-between">
        <HealthSegments score={sys.health_score} />
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: hasTasks ? '#f9731618' : '#22c55e18',
            color: hasTasks ? '#f97316' : '#22c55e',
          }}
        >
          {hasTasks ? `${sys.pending_tasks.length} 項待辦` : '無待辦 ✓'}
        </span>
      </div>

      {/* 展開內容 */}
      {expanded && (
        <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>

          {/* 技術棧 */}
          {sys.tech && (
            <div className="flex items-start gap-2">
              <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>技術</span>
              <span
                className="text-xs px-2 py-0.5 rounded font-mono"
                style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid #2d407020' }}
              >
                {sys.tech}
              </span>
            </div>
          )}

          {/* 待辦清單 */}
          {hasTasks ? (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: '#f97316' }}>待辦事項</div>
              <div className="space-y-1.5">
                {sys.pending_tasks.map((task, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs shrink-0 mt-0.5" style={{ color: '#eab308' }}>·</span>
                    <span className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                      {task}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs" style={{ color: '#22c55e' }}>✓ 目前無待辦事項</div>
          )}

          {/* 備註 */}
          {sys.notes && (
            <div>
              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>備註</div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {sys.notes.length > 160 ? sys.notes.slice(0, 160) + '…' : sys.notes}
              </div>
            </div>
          )}

          {/* 最後更新 */}
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            最後更新：{sys.last_updated}
          </div>
        </div>
      )}
    </div>
  );
}
