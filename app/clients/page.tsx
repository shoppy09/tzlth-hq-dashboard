// app/clients/page.tsx
// 客戶穿透視圖 v0（B-b，RCF-125）— 資料契約：tzlth-hq strategy/customer-360-spec.md
// 來源切片：crm/client-log.md + finance/ledger/income-2026.json；LINE／預約明細留位未接。
// ⛔ PII：只渲染 spec 🟢 欄位（lib/crm.ts 已在資料層擋掉 repo-only 欄）。

import { getClientLog, getIncomeLedger } from '@/lib/github';
import { buildClientViews } from '@/lib/crm';

export const metadata = { title: '客戶穿透視圖 | 職涯停看聽 總部' };
export const dynamic = 'force-dynamic';

const SOURCE_LABEL: Record<string, string> = {
  THR: 'Threads', LINE: 'LINE@', REF: '轉介紹', WEB: '官網', DIAG: '診斷', OTHER: '其他',
};

export default async function ClientsPage() {
  let error: string | null = null;
  let clients: Awaited<ReturnType<typeof buildViews>> = [];

  async function buildViews() {
    const [log, ledger] = await Promise.all([getClientLog(), getIncomeLedger()]);
    return buildClientViews(log, ledger);
  }

  try {
    clients = await buildViews();
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const returning = clients.filter(c => c.isReturning);
  const totalRevenue = clients.reduce((s, c) => s + c.revenueTotal, 0);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            👥 客戶穿透視圖 <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>v0</span>
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            來源：CRM 客戶記錄 ＋ 財務 income ledger（營收即時計算）・LINE／預約明細未連動（架構已留位）
          </p>
        </div>
        <a href="/" className="link-pill text-xs font-semibold px-3.5 py-1.5 rounded-full"
           style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
          ← 返回總覽
        </a>
      </div>

      {error && (
        <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--red)', color: 'var(--red)' }}>
          資料載入失敗：{error}
        </div>
      )}

      {/* 摘要列 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '累計客戶', value: String(clients.length) },
          { label: '回訪客戶', value: String(returning.length) },
          { label: '已歸戶營收', value: `NT$${totalRevenue.toLocaleString()}` },
          { label: '有付款記錄', value: String(clients.filter(c => c.paymentCount > 0).length) },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-secondary)', letterSpacing: '0.1em' }}>{s.label}</div>
            <div className="text-lg font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 客戶卡片 */}
      <div className="flex flex-col gap-3">
        {clients.map(c => (
          <div key={c.clientCode} className="hover-card rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{c.clientCode}</span>
              {c.isReturning && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
                  🔁 回訪 第 {c.sessionCount} 次
                </span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {SOURCE_LABEL[c.source] ?? c.source}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {c.lifecycle}
              </span>
              <span className="ml-auto text-sm font-bold" style={{ color: c.revenueTotal > 0 ? 'var(--green)' : 'var(--text-muted)' }}>
                {c.revenueTotal > 0 ? `NT$${c.revenueTotal.toLocaleString()}` : '—'}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div>類型：{c.consultType || '—'}</div>
              <div>方案：{c.servicePlan || '—'}</div>
              <div>預約單：{c.orderIds.length ? c.orderIds.join('・') : '未連動'}</div>
              <div>LINE：{c.lineUserLinked ? '已對應' : '未連動'}</div>
            </div>

            {c.timeline.length > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                {c.timeline.map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="shrink-0 font-mono" style={{ color: 'var(--text-muted)' }}>{ev.date}</span>
                    <span className="shrink-0 text-[10px] px-1.5 rounded" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{ev.system}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{ev.summary}</span>
                    {typeof ev.amount === 'number' && (
                      <span className="font-semibold" style={{ color: 'var(--green)' }}>NT${ev.amount.toLocaleString()}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
        資料契約：strategy/customer-360-spec.md（RCF-125）・營收 SoT＝finance ledger 即時計算・機構案（client_code 空值）不列入
      </p>
    </div>
  );
}
