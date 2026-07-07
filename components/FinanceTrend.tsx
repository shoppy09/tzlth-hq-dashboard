// components/FinanceTrend.tsx
// 近 6 月收支趨勢 mini 圖（L444；RCF-009 原設計「6個月趨勢圖」補完）
// 口徑：ledger 實收制，與 finance.careerssl.com/reports、月底結帳月報一致（見 lib/finance.ts buildLedgerTrend）
import type { MonthlyTotals } from '@/lib/finance';

const fmt = (n: number) => n.toLocaleString('zh-TW');

export function FinanceTrend({ months }: { months: MonthlyTotals[] }) {
  if (!months.length) return null;
  const maxBar = Math.max(...months.map(t => Math.max(t.income, t.expense)), 1);

  return (
    <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>📊 近 6 月收支趨勢</span>
        <a
          href="https://finance.careerssl.com/reports"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2 py-0.5 rounded"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          完整月報 ↗
        </a>
      </div>
      <div className="space-y-1.5">
        {months.map(t => (
          <div key={t.month} className="flex items-center gap-2 text-xs">
            <span className="w-10 shrink-0" style={{ color: 'var(--text-secondary)' }}>{t.month.slice(2)}</span>
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 rounded-full" style={{ width: `${(t.income / maxBar) * 100}%`, minWidth: t.income > 0 ? '2px' : '0', backgroundColor: '#22c55e' }} />
                <span style={{ color: '#22c55e' }}>{t.income > 0 ? fmt(t.income) : ''}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 rounded-full" style={{ width: `${(t.expense / maxBar) * 100}%`, minWidth: t.expense > 0 ? '2px' : '0', backgroundColor: '#ef4444' }} />
                <span style={{ color: '#ef4444' }}>{t.expense > 0 ? fmt(t.expense) : ''}</span>
              </div>
            </div>
            <span className="w-16 shrink-0 text-right font-semibold" style={{ color: t.net >= 0 ? '#22c55e' : '#ef4444' }}>
              {t.net >= 0 ? '+' : '−'}{fmt(Math.abs(t.net))}
            </span>
          </div>
        ))}
      </div>
      <div className="text-[10px] mt-1.5" style={{ color: 'var(--text-secondary)' }}>
        口徑：ledger 實收制（與月報一致）；手動補充另列不併入
      </div>
    </div>
  );
}
