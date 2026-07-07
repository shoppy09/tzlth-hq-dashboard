'use client';
import { useEffect, useState } from 'react';
import { FinanceInput } from '@/components/FinanceInput';
import { FinanceTrend } from '@/components/FinanceTrend';
import { computeMonthlyTotals, groupByMonth } from '@/lib/finance';
import type { FinanceEntry, MonthGroup, MonthlyTotals } from '@/lib/finance';

// ─── 既有介面（與 page.tsx 保持相容）───────────────────────
interface FinanceSummary { income: string; expense: string; profit: string; }
interface UnpaidItem { client: string; service: string; amount: number; dueDate: string; status: string; overdue: boolean; }
interface UnpaidSummary { count: number; totalAmount: number; overdueCount: number; items: UnpaidItem[]; }
interface ViewTotals { booking: { count: number; revenue: number }; payment: { count: number; revenue: number }; created: { count: number; confirmed: number }; }

type ViewMode    = 'booking' | 'payment' | 'created';
type PresentMode = 'full' | 'rounded' | 'public_safe' | 'cumulative';
type PanelTab    = 'overview' | 'input' | 'history';

const VIEW_LABEL: Record<ViewMode, string> = { booking: '預約服務日', payment: '實際收款日', created: '預約建立日' };
const MODE_LABEL: Record<PresentMode, { icon: string; name: string }> = {
  full:        { icon: '🔓', name: '原值' },
  rounded:     { icon: '🔄', name: '千元' },
  public_safe: { icon: '🔒', name: '公開' },
  cumulative:  { icon: '📈', name: '累計' },
};
const TAB_LABEL: Record<PanelTab, string> = { overview: '概覽', input: '新增記錄', history: '歷史記錄' };

function toNumber(s: string): number { return Number((s || '').replace(/,/g, '')) || 0; }
function fmt(n: number): string { return n.toLocaleString('zh-TW'); }
function round(n: number): number { return Math.round(n / 1000) * 1000; }

function applyMode(rawStr: string, mode: PresentMode): string {
  if (rawStr === '—' || rawStr === '' || rawStr == null) return '—';
  const n = toNumber(rawStr);
  if (mode === 'rounded') return fmt(round(n));
  return fmt(n);
}

function currentTaipeiMonth(): string {
  const d = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 7);
}

// ─── Tab Bar ──────────────────────────────────────────────
function TabBar({ tab, setTab }: { tab: PanelTab; setTab: (t: PanelTab) => void }) {
  return (
    <div className="flex gap-1 mb-3">
      {(Object.keys(TAB_LABEL) as PanelTab[]).map(t => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className="flex-1 text-xs py-1.5 rounded-lg font-semibold transition-colors"
          style={{
            backgroundColor: tab === t ? 'var(--accent)' : 'var(--bg-primary)',
            color: tab === t ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${tab === t ? 'var(--accent)' : 'var(--border)'}`,
          }}
        >
          {TAB_LABEL[t]}
        </button>
      ))}
    </div>
  );
}

// ─── History Tab ──────────────────────────────────────────
function HistoryTab({ entries }: { entries: FinanceEntry[] }) {
  const groups: MonthGroup[] = groupByMonth(entries);

  if (groups.length === 0) {
    return (
      <div className="text-sm text-center py-6" style={{ color: 'var(--text-secondary)' }}>
        尚無手動記錄。<br />
        <span className="text-xs">點擊「新增記錄」填入現金收入或額外支出。</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groups.map(g => (
        <details key={g.month} className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <summary
            className="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none"
            style={{ listStyle: 'none', color: 'var(--text-primary)' }}
          >
            <span className="text-sm font-semibold">{g.month}</span>
            <div className="flex items-center gap-3 text-xs">
              {g.totals.incomeCount > 0 && (
                <span style={{ color: '#22c55e' }}>↑ NT${fmt(g.totals.income)}</span>
              )}
              {g.totals.expenseCount > 0 && (
                <span style={{ color: '#ef4444' }}>↓ NT${fmt(g.totals.expense)}</span>
              )}
              <span style={{ color: 'var(--text-secondary)' }}>▾</span>
            </div>
          </summary>
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {g.entries.map((e, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 text-xs"
                style={{ borderBottom: i < g.entries.length - 1 ? '1px solid var(--border)' : 'none', color: 'var(--text-primary)' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: e.entry_type === 'expense' ? '#ef4444' : '#22c55e' }}
                  />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{e.type}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{e.date} · {e.payment_method}</div>
                    {e.note && <div className="truncate" style={{ color: 'var(--text-secondary)' }}>{e.note}</div>}
                  </div>
                </div>
                <span
                  className="font-bold shrink-0 ml-2"
                  style={{ color: e.entry_type === 'expense' ? '#ef4444' : '#22c55e' }}
                >
                  {e.entry_type === 'expense' ? '－' : '＋'}NT${fmt(e.amount)}
                </span>
              </div>
            ))}
            {/* 月小計 */}
            <div className="flex items-center justify-between px-3 py-2 text-xs font-bold" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
              <span>淨計</span>
              <span style={{ color: g.totals.net >= 0 ? '#22c55e' : '#ef4444' }}>
                NT${fmt(Math.abs(g.totals.net))} {g.totals.net >= 0 ? '（收入）' : '（支出）'}
              </span>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────
function OverviewTab({
  financeSummary, unpaidSummary, viewTotals, syncedAt,
  cumulativeProfitAvailable, mode, setMode, view, setView,
  manualIncome, manualExpense,
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
  manualIncome: number;
  manualExpense: number;
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

  const hasManual = manualIncome > 0 || manualExpense > 0;

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

      {/* 手動記錄補充（有資料才顯示）*/}
      {hasManual && (
        <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <div className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>✏️ 手動補充（本月）</div>
          <div className="flex gap-4">
            {manualIncome  > 0 && <span style={{ color: '#22c55e' }}>↑ NT${fmt(manualIncome)}</span>}
            {manualExpense > 0 && <span style={{ color: '#ef4444' }}>↓ NT${fmt(manualExpense)}</span>}
          </div>
        </div>
      )}

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
  initialEntries,
  trendMonths,
}: {
  financeSummary: FinanceSummary | null;
  unpaidSummary: UnpaidSummary | null;
  viewTotals: ViewTotals | null;
  syncedAt: string | null;
  cumulativeProfitAvailable: boolean;
  initialEntries: FinanceEntry[];
  trendMonths?: MonthlyTotals[];
}) {
  // ── 狀態 ─────────────────────────────────────────────
  const [tab, setTab]       = useState<PanelTab>('overview');
  const [mode, setMode]     = useState<PresentMode>('full');
  const [view, setView]     = useState<ViewMode>('payment');
  // entries 提升到父層：概覽與歷史共享同一份資料
  const [entries, setEntries] = useState<FinanceEntry[]>(initialEntries);

  useEffect(() => {
    const savedMode = typeof window !== 'undefined' ? localStorage.getItem('finance-mode') : null;
    const savedView = typeof window !== 'undefined' ? localStorage.getItem('finance-view') : null;
    if (savedMode && ['full', 'rounded', 'public_safe', 'cumulative'].includes(savedMode)) setMode(savedMode as PresentMode);
    if (savedView && ['booking', 'payment', 'created'].includes(savedView)) setView(savedView as ViewMode);
  }, []);

  const setModeWith = (m: PresentMode) => { setMode(m); if (typeof window !== 'undefined') localStorage.setItem('finance-mode', m); };
  const setViewWith = (v: ViewMode)    => { setView(v); if (typeof window !== 'undefined') localStorage.setItem('finance-view', v); };

  // ── 計算本月手動記錄合計（概覽顯示 + 歷史區間同步）──
  const currentMonth = currentTaipeiMonth();
  const manualTotals = computeMonthlyTotals(entries, currentMonth);

  // ── 新增成功回調（B 選項：append → 兩個 tab 同步更新）─
  const handleEntryAdded = (newEntry: FinanceEntry) => {
    setEntries(prev => [...prev, newEntry]);
    setTab('overview'); // 新增後自動切回概覽確認
  };

  // ─── Render ──────────────────────────────────────────
  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <TabBar tab={tab} setTab={setTab} />

      {tab === 'overview' && (
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
          manualIncome={manualTotals.income}
          manualExpense={manualTotals.expense}
        />
      )}

      {/* 近 6 月收支趨勢（L444）— 僅概覽 Tab 顯示 */}
      {tab === 'overview' && trendMonths && trendMonths.length > 0 && (
        <div className="mt-3">
          <FinanceTrend months={trendMonths} />
        </div>
      )}

      {tab === 'input' && (
        <FinanceInput onSuccess={handleEntryAdded} />
      )}

      {tab === 'history' && (
        <HistoryTab entries={entries} />
      )}
    </div>
  );
}
