// lib/finance.ts
// 財務共用型別與計算函式（Server + Client 兩端均可使用，零 browser API 依賴）

export interface FinanceEntry {
  date: string;                          // YYYY-MM-DD（實際收/付款日）
  entry_type: 'income' | 'expense';      // 新欄位：區分收入/支出（舊記錄無此欄預設為 income）
  type: string;                          // 分類（收入：顧問諮詢/合作收入/企業包案/校園講座/電子書/課程/業師計畫/其他；支出：固定支出/臨時支出/其他）
  amount: number;                        // NT$（正數）
  client_code?: string | null;           // 客戶/機構代號（去識別化，可 null）
  invoice_method?: string;               // 個人收據 / 公司發票 / 無
  payment_method?: string;               // 銀行轉帳 / 現金 / 第三方支付 / 其他
  note?: string;                         // 備註（選填）
  recorded_at: string;                   // ISO 8601 寫入時間
}

export interface FinanceData {
  _schema: Record<string, unknown>;
  records: FinanceEntry[];
}

export interface MonthlyTotals {
  month: string;   // YYYY-MM
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
}

export interface MonthGroup {
  month: string;
  totals: MonthlyTotals;
  entries: FinanceEntry[];
}

/**
 * 計算指定月份的收支合計。
 * 舊記錄（無 entry_type 欄位）一律視為 income。
 */
export function computeMonthlyTotals(records: FinanceEntry[], month: string): MonthlyTotals {
  const filtered = records.filter(r => typeof r.date === 'string' && r.date.startsWith(month));
  let income = 0, expense = 0, incomeCount = 0, expenseCount = 0;
  for (const r of filtered) {
    if (r.entry_type === 'expense') {
      expense += r.amount;
      expenseCount++;
    } else {
      income += r.amount;
      incomeCount++;
    }
  }
  return { month, income, expense, net: income - expense, incomeCount, expenseCount };
}

/**
 * 將所有記錄依月份分組，降序排列（最新月份在前）。
 */
export function groupByMonth(records: FinanceEntry[]): MonthGroup[] {
  const map = new Map<string, FinanceEntry[]>();
  for (const r of records) {
    const m = typeof r.date === 'string' ? r.date.slice(0, 7) : 'unknown';
    if (!map.has(m)) map.set(m, []);
    map.get(m)!.push(r);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, entries]) => ({
      month,
      totals: computeMonthlyTotals(records, month),
      entries: entries.sort((a, b) => b.date.localeCompare(a.date)),
    }));
}

// ─── 月收支趨勢（L444）────────────────────────────────────
// 口徑：ledger only、income 實收制（status==='received'），與 SYS-09 /reports、月底結帳月報一致。
// external-revenue.json（手動補充）不併入，維持獨立顯示，避免三處數字漂移。

export interface LedgerTransaction {
  id?: string;
  date: string;        // YYYY-MM-DD
  amount: number;
  status?: string;     // income: received / pending；expense 無此欄
  client_code?: string | null;
  service_type?: string;
  note?: string;
}

export interface LedgerFile {
  year: number;
  transactions: LedgerTransaction[];
}

/**
 * 從 income/expense ledger 建立近 N 個月的 MonthlyTotals（含無資料月份，補零）。
 * @param endYm 最新月份（YYYY-MM，含），由呼叫端傳入避免時區歧義
 */
export function buildLedgerTrend(
  incomeTx: LedgerTransaction[],
  expenseTx: LedgerTransaction[],
  endYm: string,
  nMonths = 6,
): MonthlyTotals[] {
  const [y, m] = endYm.split('-').map(Number);
  const months: string[] = [];
  for (let i = nMonths - 1; i >= 0; i--) {
    const total = y * 12 + (m - 1) - i;
    months.push(`${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`);
  }
  return months.map(month => {
    const inc = incomeTx.filter(t => t.date?.startsWith(month) && t.status === 'received');
    const exp = expenseTx.filter(t => t.date?.startsWith(month));
    const income  = inc.reduce((s, t) => s + t.amount, 0);
    const expense = exp.reduce((s, t) => s + t.amount, 0);
    return { month, income, expense, net: income - expense, incomeCount: inc.length, expenseCount: exp.length };
  });
}

export const INCOME_CATEGORIES = ['顧問諮詢', '合作收入', '企業包案', '校園講座', '電子書', '課程', '業師計畫', '其他'] as const;
export const EXPENSE_CATEGORIES = ['固定支出', '臨時支出', '其他'] as const;
export const PAYMENT_METHODS    = ['銀行轉帳', '現金', '第三方支付', '其他'] as const;
export const INVOICE_METHODS    = ['個人收據', '公司發票', '無'] as const;
