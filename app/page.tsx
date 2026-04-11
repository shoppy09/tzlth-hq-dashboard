import { getInventory, getTasksMd, getContentCalendar, getOutreachLog, getFinanceReport } from '@/lib/github';
import { parseTasks } from '@/lib/parse-tasks';
import { SystemCard } from '@/components/SystemCard';

interface ContentItem {
  date: string;
  type: string;
  topic: string;
  status: string;
}

function parseItemDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const now = new Date();
  const d = new Date(now.getFullYear(), parseInt(match[1], 10) - 1, parseInt(match[2], 10));
  // If date is more than 6 months in the past, it's probably next year
  if (now.getTime() - d.getTime() > 180 * 24 * 60 * 60 * 1000) d.setFullYear(d.getFullYear() + 1);
  return d;
}

function parseContentCalendar(md: string): ContentItem[] {
  const lines = md.split('\n');
  const items: ContentItem[] = [];
  let inTable = false;
  for (const line of lines) {
    if (line.includes('| 日期 |')) { inTable = true; continue; }
    if (inTable && line.startsWith('|---')) continue;
    if (inTable && line.startsWith('|')) {
      const cols = line.split('|').map(s => s.trim()).filter(Boolean);
      if (cols.length >= 4 && cols[0] !== '-' && cols[0] !== '' && !cols[0].includes('---')) {
        items.push({ date: cols[0], type: cols[1], topic: cols[2], status: cols[4] ?? cols[3] });
      }
    } else if (inTable && !line.startsWith('|')) {
      inTable = false;
    }
  }
  const now = new Date();
  const cutoffPast = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);   // 3 天前
  const cutoffFuture = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 未來 30 天
  return items.filter(i => {
    if (i.date === '-' || i.topic === '-' || i.topic === '') return false;
    const d = parseItemDate(i.date);
    if (!d) return true; // 無法解析日期則保留
    return d >= cutoffPast && d <= cutoffFuture;
  });
}

interface OutreachStats {
  sent: number;
  replied: number;
  negotiating: number;
}

function parseOutreachLog(md: string): OutreachStats {
  const sent = Number(md.match(/累計寄出：(\d+)/)?.[1] ?? 0);
  const replied = Number(md.match(/已回覆：(\d+)/)?.[1] ?? 0);
  const negotiating = Number(md.match(/進入洽談：(\d+)/)?.[1] ?? 0);
  return { sent, replied, negotiating };
}

interface FinanceSummary {
  income: string;
  expense: string;
  profit: string;
}

function parseFinanceReport(md: string): FinanceSummary {
  const incomeMatch = md.match(/本月收入合計：NT\$([^\s\n\*]+)/);
  const expenseMatch = md.match(/本月支出合計：NT\$([^\s\n\*]+)/);
  const profitMatch = md.match(/\*\*本月淨利\*\*\s*\|\s*\*\*([^*\n]+)\*\*/);
  return {
    income: incomeMatch?.[1] ?? '—',
    expense: expenseMatch?.[1] ?? '—',
    profit: profitMatch?.[1] ?? '—',
  };
}

function priorityColor(p: string) {
  if (p === 'P0') return '#ef4444';
  if (p === 'P1') return '#f97316';
  if (p === 'P2') return '#eab308';
  return '#94a3b8';
}

const departments = [
  { dept: '人資部 HR',  role: '員工冊・盤點・健康度' },
  { dept: '開發部 DEV', role: '功能開發・Bug・版本管理' },
  { dept: '資安部 SEC', role: '安全架構・API 金鑰・存取控制' },
  { dept: '內容部 CNT', role: '內容策略・Threads 規劃・文章' },
  { dept: '社群部 SOC', role: 'LINE@・Threads 數據・粉絲成長' },
  { dept: '業務部 BIZ', role: '合作外展・潛在客戶' },
  { dept: '知識庫 KM',  role: '方法論・SOP・決策記錄・參考文件' },
  { dept: '策略部 STR', role: '組織架構・長期規劃・總管模式' },
  { dept: '財務部 FIN', role: '收入・支出・月淨利・未收款' },
  { dept: '客戶部 CRM', role: '諮詢記錄・來源追蹤・回訪轉介紹' },
  { dept: '產品部 PRD', role: '診斷・預約・產品路線圖・轉換率' },
  { dept: '法務部 LEG', role: '服務條款・隱私政策・合作合約' },
];

function statusColor(status: string) {
  if (status === '已發布' || status === '已發') return '#22c55e';
  if (status === '排程中') return '#3b82f6';
  if (status === '草稿') return '#f97316';
  return '#94a3b8';
}

function typeIcon(type: string) {
  if (type === '影片') return '🎬';
  if (type === '貼文') return '✏️';
  if (type === '文章') return '📝';
  if (type === '廣播') return '📢';
  return '📌';
}

export default async function Home() {
  let systems = [];
  let tasksMd = '';
  let contentItems: ContentItem[] = [];
  let outreachStats: OutreachStats | null = null;
  let financeSummary: FinanceSummary | null = null;

  try {
    const inventory = await getInventory();
    systems = inventory.systems;
    tasksMd = await getTasksMd();
  } catch {
    return (
      <div className="text-center py-20" style={{ color: '#ef4444' }}>
        無法讀取總部資料。請確認 GITHUB_TOKEN 環境變數已設定。
      </div>
    );
  }

  try {
    const calMd = await getContentCalendar();
    contentItems = parseContentCalendar(calMd);
  } catch {
    // optional — fail silently
  }

  try {
    const outreachMd = await getOutreachLog();
    outreachStats = parseOutreachLog(outreachMd);
  } catch {
    // optional — fail silently
  }

  try {
    const financeMd = await getFinanceReport();
    financeSummary = parseFinanceReport(financeMd);
  } catch {
    // optional — fail silently
  }

  const tasks = parseTasks(tasksMd);
  const p1Tasks = tasks.filter(t => t.priority === 'P1' || t.priority === 'P0');
  const p2Tasks = tasks.filter(t => t.priority === 'P2');
  const avgHealth = systems.length
    ? (systems.reduce((s: number, sys: { health_score: number }) => s + sys.health_score, 0) / systems.length).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">

      {/* 總覽數字 */}
      <section id="overview" className="grid grid-cols-3 gap-3">
        {[
          { label: '系統總數', value: String(systems.length) },
          { label: '平均健康', value: avgHealth + '/5' },
          { label: 'P1 任務', value: String(p1Tasks.length) },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-xl p-4 text-center"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{stat.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
          </div>
        ))}
      </section>

      {/* P1 任務 */}
      <section id="tasks">
        <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#f97316' }}>
          ⚡ 本週必須完成
        </h2>
        {p1Tasks.length > 0 ? (
          <div className="space-y-2">
            {p1Tasks.map((t, i) => (
              <div
                key={i}
                className="rounded-xl px-4 py-3 flex items-start gap-3"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded mt-0.5 shrink-0"
                  style={{ backgroundColor: priorityColor(t.priority) + '22', color: priorityColor(t.priority) }}
                >
                  {t.priority}
                </span>
                <div>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--accent)' }}>{t.system}</div>
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{t.content}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: '#22c55e' }}>
            ✓ 本週無緊急任務
          </div>
        )}

        {/* P2 任務 */}
        {p2Tasks.length > 0 && (
          <div className="mt-3">
            <h3 className="text-xs font-semibold tracking-widest uppercase mb-2 mt-4" style={{ color: 'var(--text-secondary)' }}>
              本週推進
            </h3>
            <div className="space-y-2">
              {p2Tasks.map((t, i) => (
                <div
                  key={i}
                  className="rounded-xl px-4 py-3 flex items-start gap-3"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded mt-0.5 shrink-0"
                    style={{ backgroundColor: '#eab30822', color: '#eab308' }}
                  >P2</span>
                  <div>
                    <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t.system}</div>
                    <div className="text-sm" style={{ color: 'var(--text-primary)' }}>{t.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 本週內容排程 */}
      <section id="content">
        <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>
          近期內容排程
        </h2>
        {contentItems.length > 0 ? (
          <div
            className="rounded-xl px-4 py-2 divide-y"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {contentItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{typeIcon(item.type)}</span>
                  <div className="min-w-0">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{item.date}</span>
                    <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>{item.type}</span>
                    <div className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{item.topic}</div>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded shrink-0"
                  style={{ backgroundColor: statusColor(item.status) + '22', color: statusColor(item.status) }}
                >
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            近 30 天內無排程內容 — 請更新 content/content-calendar.md
          </div>
        )}
      </section>

      {/* 外展進度 */}
      <section id="outreach">
        <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>
          外展進度
        </h2>
        {outreachStats ? (
          <div
            className="rounded-xl px-4 py-3 grid grid-cols-3 gap-4"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {[
              { label: '累計寄出', value: outreachStats.sent, unit: '封' },
              { label: '已回覆', value: outreachStats.replied, unit: '封' },
              { label: '進入洽談', value: outreachStats.negotiating, unit: '組' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
                  {stat.value}<span className="text-sm ml-0.5">{stat.unit}</span>
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            無法讀取外展資料
          </div>
        )}
      </section>

      {/* 財務摘要 */}
      <section id="finance">
        <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>
          本月財務
        </h2>
        {financeSummary ? (
          <div
            className="rounded-xl px-4 py-3 grid grid-cols-3 gap-4"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {[
              { label: '收入', value: financeSummary.income, color: '#22c55e' },
              { label: '支出', value: financeSummary.expense, color: '#ef4444' },
              { label: '淨利', value: financeSummary.profit, color: 'var(--accent)' },
            ].map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-sm font-bold leading-tight" style={{ color: stat.color }}>
                  {stat.value}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            無法讀取財務資料
          </div>
        )}
      </section>

      {/* 系統狀態（可展開） */}
      <section id="systems">
        <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>
          系統狀態 <span className="normal-case font-normal ml-1">（點擊展開詳情）</span>
        </h2>
        <div className="space-y-2">
          {systems.map((sys: Parameters<typeof SystemCard>[0]['sys']) => (
            <SystemCard key={sys.id} sys={sys} />
          ))}
        </div>
      </section>

      {/* 部門架構 */}
      <section id="departments">
        <h2 className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text-secondary)' }}>
          部門架構
        </h2>
        <div
          className="rounded-xl px-4 py-2 divide-y"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {departments.map(d => (
            <div key={d.dept} className="flex items-center justify-between py-2.5">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{d.dept}</span>
              <span className="text-xs text-right" style={{ color: 'var(--text-secondary)' }}>{d.role}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-xs pb-4" style={{ color: 'var(--text-secondary)' }}>
        資料每 5 分鐘自動更新 · TZLTH-HQ
      </p>
    </div>
  );
}
