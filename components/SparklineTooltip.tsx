'use client';
import { useState } from 'react';

interface Props { data: number[]; color?: string; }

export function SparklineTooltip({ data, color = '#4f8ef7' }: Props) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number } | null>(null);

  if (data.length < 2) return null;
  const w = 72, h = 24;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 4) - 2,
    value: v,
  }));

  const pts = points.map(p => `${p.x},${p.y}`).join(' ');
  const last = points[points.length - 1];

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg
        width={w}
        height={h}
        style={{ overflow: 'visible', flexShrink: 0, cursor: 'crosshair' }}
        onMouseLeave={() => setTooltip(null)}
      >
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* 透明 hit 區域，每個數據點可 hover */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="5"
            fill="transparent"
            onMouseEnter={() => setTooltip(p)}
          />
        ))}
        {/* 最後一點固定圓點 */}
        <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
        {/* hover 時高亮 */}
        {tooltip && (
          <circle cx={tooltip.x} cy={tooltip.y} r="3" fill={color} opacity={0.9} />
        )}
      </svg>
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '110%',
            left: `${tooltip.x}px`,
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '10px',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10,
            fontWeight: 600,
          }}
        >
          {tooltip.value.toLocaleString()}
        </div>
      )}
    </div>
  );
}
