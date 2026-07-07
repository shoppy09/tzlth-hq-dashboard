// lib/crm.ts
// 客戶穿透視圖（B-b v0）資料層 — 資料契約 SoT：tzlth-hq strategy/customer-360-spec.md（RCF-125）
//
// ⛔ PII 邊界（spec 第五節）：本模組只萃取 🟢 可渲染欄位。
//    諮詢摘要 / 三關鍵字 / 性別・年資・產業等背景欄 / 客戶回饋 = repo-only，
//    禁止在此 parse 或回傳（前端拿不到 = 不可能誤渲染）。
//
// Rollup 規則（spec 第三節）：累計營收一律從 income ledger 即時計算，
//    不讀 client-log「累計營收」欄（該欄為人讀快照，防雙 SoT 漂移）。

export interface TimelineEvent {
  date: string;                    // YYYY-MM-DD
  system: '諮詢' | '診斷' | '財務';
  type: 'consultation' | 'diagnosis' | 'payment';
  amount?: number;
  summary: string;
}

export interface ClientView {
  clientCode: string;              // 主鍵 C-YYYYMM-NNN
  source: string;                  // THR/LINE/REF/WEB/DIAG/OTHER
  consultType: string;             // RES/CAR/INT/CHG/COMP
  servicePlan: string;
  sessionCount: number;            // 第 N 次；≥2 = 回訪
  consultDates: string[];
  lifecycle: string;               // 診斷/初談/諮詢/陪跑/追蹤/見證/結案
  orderIds: string[];              // join key → 預約（無值時空陣列）
  lineUserLinked: boolean;         // lineUserId 是否已對應（值本身不渲染）
  revenueTotal: number;            // 計算值：ledger client_code 加總
  paymentCount: number;
  timeline: TimelineEvent[];
  isReturning: boolean;
}

interface IncomeTx {
  date: string;
  amount: number;
  client_code: string;
  service_type: string;
}

const CODE_RE = /^## (C-\d{6}-\d{3})\s*$/;

/** 取欄位值：行首「- 欄名：值」 */
function field(block: string, name: string): string {
  const m = block.match(new RegExp(`^- ${name}：(.+)$`, 'm'));
  return m ? m[1].trim() : '';
}

/** 值取代號部分（去掉括號補充說明），如「OTHER（來源不明…）」→ OTHER */
function codeOf(value: string): string {
  return value.split(/[（(]/)[0].trim();
}

function extractDates(value: string): string[] {
  return [...value.matchAll(/\d{4}-\d{2}-\d{2}/g)].map(m => m[0]);
}

/** 解析 client-log.md → 🟢 欄位；排除範本區塊與非客戶段落 */
export function parseClientLog(md: string): Omit<ClientView, 'revenueTotal' | 'paymentCount' | 'timeline' | 'isReturning'>[] {
  const clients: ReturnType<typeof parseClientLog> = [];
  // 以 "## " 切段；只收 header 完全符合客戶代號者（範本 header 含「範本」字樣自然不符）
  const blocks = md.split(/^## /m);
  for (const raw of blocks) {
    const headerLine = raw.split('\n', 1)[0].trim();
    const codeMatch = ('## ' + headerLine).match(CODE_RE);
    if (!codeMatch) continue;
    const block = raw;

    const countMatch = field(block, '次數').match(/第\s*(\d+)\s*次/);
    const orderRaw = field(block, '預約 orderId');
    const orderIds = [...orderRaw.matchAll(/ORD\d+/g)].map(m => m[0]);
    const lineRaw = field(block, 'LINE userId');

    clients.push({
      clientCode: codeMatch[1],
      source: codeOf(field(block, '來源')),
      consultType: codeOf(field(block, '諮詢類型')),
      servicePlan: field(block, '服務方案'),
      sessionCount: countMatch ? parseInt(countMatch[1], 10) : 0,
      consultDates: extractDates(field(block, '諮詢日期')),
      lifecycle: codeOf(field(block, '生命週期狀態')) || '—',
      orderIds,
      lineUserLinked: /^U[0-9a-f]{32}/.test(lineRaw),
    });
  }
  return clients;
}

/** 組合 client-log + income ledger → ClientView[]（rollup 依 spec 第三節） */
export function buildClientViews(clientLogMd: string, incomeLedgerJson: string): ClientView[] {
  const base = parseClientLog(clientLogMd);
  let txs: IncomeTx[] = [];
  try {
    txs = (JSON.parse(incomeLedgerJson).transactions ?? []) as IncomeTx[];
  } catch { /* ledger 損壞時營收顯示 0，不擋整頁 */ }

  return base.map(c => {
    // 歸戶：client_code 精確比對（空值＝機構案，spec 第四節排除）
    const mine = txs.filter(t => t.client_code === c.clientCode);
    const revenueTotal = mine.reduce((s, t) => s + (t.amount || 0), 0);

    const timeline: TimelineEvent[] = [
      ...c.consultDates.map((d, i): TimelineEvent => ({
        date: d, system: '諮詢', type: 'consultation',
        summary: `諮詢 第 ${i + 1} 次（${c.consultType}）`,
      })),
      ...mine.map((t): TimelineEvent => ({
        date: t.date, system: '財務', type: 'payment', amount: t.amount,
        summary: `收款 ${t.service_type}`,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return {
      ...c,
      revenueTotal,
      paymentCount: mine.length,
      timeline,
      isReturning: c.sessionCount >= 2,
    };
  }).sort((a, b) => {
    // 回訪優先 → 營收高 → 代號新
    if (a.isReturning !== b.isReturning) return a.isReturning ? -1 : 1;
    if (a.revenueTotal !== b.revenueTotal) return b.revenueTotal - a.revenueTotal;
    return b.clientCode.localeCompare(a.clientCode);
  });
}
