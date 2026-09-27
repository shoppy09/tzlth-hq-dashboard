// lib/finance.ts
// 財務共用型別與計算函式（Server + Client 兩端均可使用，零 browser API 依賴）

export interface MonthlyTotals {
  month: string;   // YYYY-MM
  income: number;
  expense: number;
  net: number;
  incomeCount: number;
  expenseCount: number;
}

// ─── 月收支趨勢（L444）────────────────────────────────────
// 口徑：ledger only、income 實收制（status==='received'），與 SYS-09 /reports、月底結帳月報一致。
// （原「external-revenue.json 手動補充另列」已於 2026-09-28 移除：該檔建檔至今 0 筆，系統外收入實際記在 ledger，HQ tasks L192②）

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
  year?: number;       // 2026-09-28 起 getIncomeLedger／getExpenseLedger 回多年合併物件，無此欄
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
