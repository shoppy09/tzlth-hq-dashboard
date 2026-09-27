'use client';
import { useEffect, useState } from 'react';
import { FinanceTrend } from '@/components/FinanceTrend';
import type { MonthlyTotals } from '@/lib/finance';

// 2026-09-28（HQ tasks L192②）：移除「新增記錄」「歷史記錄」兩個 Tab 與概覽的「手動補充」區塊。
// 三者全部只服務 finance/external-revenue.json，而該檔建檔（2026-04-24）至今 0 筆、不進 /api/summary 與月報；
// 系統外收入實際一直記在 ledger（課程／其他 14 筆）⇒ 這是一條「寫了也不進任何數字」的入口，留著就是漏帳陷阱。

// ─── 既有介面（與 page.tsx 保持相容）───────────────────────
interface FinanceSummary { income: string; expense: string; profit: string; }
interface UnpaidItem { client: string; service: string; amount: number; dueDate: string; status: string; overdue: boolean; }
interface UnpaidSummary { count: number; totalAmount: number; overdueCount: number; items: UnpaidItem[]; }
interface ViewTotals { booking: { count: number; revenue: number }; payment: { count: number; revenue: number }; created: { count: number; confirmed: number }; }

type ViewMode    = 'booking' | 'payment' | 'created';
type PresentMode = 'full' | 'rounded' | 'public_safe' | 'cumulative';

const VIEW_LABEL: Record<ViewMode, string> = { booking: '預約服務日', payment: '實際收款日', created: '預約建立日' };
const MODE_LABEL: Record<PresentMode, { icon: string; name: string }> = {
  full:        { icon: '🔓', name: '原值' },
  rounded:     { icon: '🔄', name: '千元' },
  public_safe: { icon: '🔒', name: '公開' },
  cumulative:  { icon: '📈', name: '累計' },
};

function toNumber(s: string): number { return Number((s || '').replace(/,/g, '')) || 0; }
function fmt(n: number): string { return n.toLocaleString('zh-TW'); }
function round(n: number): number { return Math.round(n / 1000) * 1000; }

function applyMode(rawStr: string, mode: PresentMode): string {
  if (rawStr === '—' || rawStr === '' || rawStr == null) return '—';
  const n = toNumber(rawStr);
  if (mode === 'rounded') return fmt(round(n));
  return fmt(n);
}

// ─── Overview Tab ─────────────────────────────────────────
function OverviewTab({
  financeSummary, unpaidSummary, viewTotals, syncedAt,
  cumulativeProfitAvailable, mode, setMode, view, setView,
}: {
  financeSummary: FinanceSummary | null;
  unpaidSummary: UnpaidSummary | null;
  viewTotals: ViewTotals | null;
  syncedAt: string | null;
  cumulativeProfitAvailable: boolean;
  mode: PresentMode;
  setMode: (m: PresentMode) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
}) {
  const income  = financeSummary ? applyMode(financeSummary.income, mode) : '—';
  const expense = financeSummary ? applyMode(financeSummary.expense, mode) : '—';
  const profit  = financeSummary ? applyMode(financeSummary.profit, mode) : '—';
  const unpaidShown    = mode !== 'public_safe';
  const cumulativeShown = mode === 'cumulative';

  const viewLabel = VIEW_LABEL[view];
  let viewValue = '—', viewNote = '';
  if (viewTotals) {
    if (view === 'booking')       { viewValue = `NT$${applyMode(String(viewTotals.booking.revenue), mode)}`; viewNote = `${viewTotals.booking.count} 筆`; }
    else if (view === 'payment')  { viewValue = `NT$${applyMode(String(viewTotals.payment.revenue), mode)}`; viewNote = `${viewTotals.payment.count} 筆`; }
    else                          { viewValue = `${viewTotals.created.count} 筆`; viewNote = `已確認 ${viewTotals.created.confirmed} 筆`; }
  }

  return (
    <div className="space-y-3">
      {/* 模式切換列 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>💰 本月財務</div>
        <div className="flex items-center gap-1 flex-wrap">
          {(Object.keys(MODE_LABEL) as PresentMode[]).map(m => (
            <button key={m} onClick={() => setMode(m)} title={MODE_LABEL[m].name}
              className="text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: mode === m ? 'var(--accent)' : 'transparent',
                color: mode === m ? '#fff' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}>
              {MODE_LABEL[m].icon} <span className="hidden sm:inline">{MODE_LABEL[m].name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 上層：核心數字（官方月報） */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>月收入</div>
          <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>NT${income}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>月支出</div>
          <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>NT${expense}</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{cumulativeShown ? '累計淨利' : '月淨利'}</div>
          <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {cumulativeShown && !cumulativeProfitAvailable
              ? <span className="text-xs">資料累積中</span>
              : (profit === '—' ? '—' : `NT$${profit}`)}
          </div>
        </div>
      </div>

      {/* 未收款追蹤 */}
      {unpaidShown && (
        <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span style={{ color: 'var(--text-secondary)' }}>💳 未收款</span>
            {unpaidSummary && unpaidSummary.overdueCount > 0 && (
              <span style={{ color: '#ef4444' }}>⚠️ 逾期 {unpaidSummary.overdueCount} 筆</span>
            )}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {unpaidSummary && unpaidSummary.count > 0
              ? `${unpaidSummary.count} 筆 / NT$${applyMode(String(unpaidSummary.totalAmount), mode)}`
              : <span style={{ color: 'var(--text-secondary)' }}>無</span>}
          </div>
        </div>
      )}

      {/* 自動對賬（daily.json）*/}
      <div className="border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>🤖 自動對賬（本月）</span>
          <div className="flex items-center gap-1 flex-wrap">
            {(Object.keys(VIEW_LABEL) as ViewMode[]).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="text-xs px-2 py-0.5 rounded"
                style={{
                  backgroundColor: view === v ? 'var(--accent-muted, #334155)' : 'transparent',
                  color: view === v ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}>
                {VIEW_LABEL[v]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{viewLabel}：{viewValue}</div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{viewNote}</div>
        </div>
        {syncedAt && (
          <div className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
            最後同步：{new Date(syncedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Main FinancePanel Export
// ═══════════════════════════════════════════════════════════
export function FinancePanel({
  financeSummary,
  unpaidSummary,
  viewTotals,
  syncedAt,
  cumulativeProfitAvailable,
  trendMonths,
}: {
  financeSummary: FinanceSummary | null;
  unpaidSummary: UnpaidSummary | null;
  viewTotals: ViewTotals | null;
  syncedAt: string | null;
  cumulativeProfitAvailable: boolean;
  trendMonths?: MonthlyTotals[];
}) {
  // ── 狀態 ─────────────────────────────────────────────
  const [mode, setMode]     = useState<PresentMode>('full');
  const [view, setView]     = useState<ViewMode>('payment');

  useEffect(() => {
    const savedMode = typeof window !== 'undefined' ? localStorage.getItem('finance-mode') : null;
    const savedView = typeof window !== 'undefined' ? localStorage.getItem('finance-view') : null;
    if (savedMode && ['full', 'rounded', 'public_safe', 'cumulative'].includes(savedMode)) setMode(savedMode as PresentMode);
    if (savedView && ['booking', 'payment', 'created'].includes(savedView)) setView(savedView as ViewMode);
  }, []);

  const setModeWith = (m: PresentMode) => { setMode(m); if (typeof window !== 'undefined') localStorage.setItem('finance-mode', m); };
  const setViewWith = (v: ViewMode)    => { setView(v); if (typeof window !== 'undefined') localStorage.setItem('finance-view', v); };

  // ─── Render ──────────────────────────────────────────
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <OverviewTab
        financeSummary={financeSummary}
        unpaidSummary={unpaidSummary}
        viewTotals={viewTotals}
        syncedAt={syncedAt}
        cumulativeProfitAvailable={cumulativeProfitAvailable}
        mode={mode}
        setMode={setModeWith}
        view={view}
        setView={setViewWith}
      />

      {/* 近 6 月收支趨勢（L444）*/}
      {trendMonths && trendMonths.length > 0 && (
        <div className="mt-3">
          <FinanceTrend months={trendMonths} />
        </div>
      )}
    </div>
  );
}
