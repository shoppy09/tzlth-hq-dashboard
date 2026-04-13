'use client';
import { useRouter } from 'next/navigation';
import { useTransition, useState } from 'react';

export function RefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
      setLastRefresh(new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }));
    });
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={isPending}
      title={lastRefresh ? `上次更新：${lastRefresh}` : '重新整理資料'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 10px',
        borderRadius: '9999px',
        border: '1px solid var(--border)',
        backgroundColor: 'transparent',
        color: isPending ? 'var(--accent)' : 'var(--text-secondary)',
        fontSize: '11px',
        fontWeight: 600,
        cursor: isPending ? 'not-allowed' : 'pointer',
        transition: 'color 0.15s',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          fontSize: '13px',
          animation: isPending ? 'spin 0.8s linear infinite' : 'none',
        }}
      >
        ↻
      </span>
      {isPending ? '更新中' : lastRefresh ? lastRefresh : '重新整理'}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </button>
  );
}
