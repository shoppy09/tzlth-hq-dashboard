import { getInventory, getTasksMd, getContentCalendar, getOutreachLog, getFinanceReport, getGA4Log, getFollowerHistory, getSocialMetrics, getDailyChecklist, getKnowledgeBase, KnowledgeFolder } from '@/lib/github';
import { getDiagnosisGA4Data, getWebsiteGA4Data } from '@/lib/ga4';
import { parseTasks } from '@/lib/parse-tasks';
import { SystemCard } from '@/components/SystemCard';
import { CommandCenter } from '@/components/CommandCenter';
import { DailyChecklist } from '@/components/DailyChecklist';
import { System } from '@/lib/types';

// ─── Types ────────────────────────────────────────────────
interface ContentItem  { date: string; type: string; topic: string; status: string; }
interface OutreachStats { sent: number; replied: number; negotiating: number; }
interface FinanceSummary { income: string; expense: string; profit: string; }
interface GA4WeekRow { week: string; diagnoseStart: string; diagnoseComplete: string; completeRate: string; upsellClick: string; convRate: string; }
interface FollowerPoint { date: string; followers: number; }
interface BookingStats { total: number; thisWeek: number; thisMonth: number; }
interface SocialMetrics {
  last_updated?: string;
  threads?: { followers?: number };
  line?: { friends?: number };
  vocus?: { followers?: number; articles_total?: number; monthly_reads?: number };
  facebook?: { followers?: number };
  instagram?: { followers?: number };
}

// ─── Parsers ──────────────────────────────────────────────
function parseItemDate(dateStr: string): Date | null {
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const now = new Date();
  const d = new Date(now.getFullYear(), parseInt(m[1], 10) - 1, parseInt(m[2], 10));
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
        const isNew = cols.length >= 6;
        items.push({ date: cols[0], type: cols[1], topic: isNew ? cols[3] : cols[2], status: isNew ? cols[5] : (cols[4] ?? cols[3]) });
      }
    } else if (inTable && !line.startsWith('|')) { inTable = false; }
  }
  const now = new Date();
  const cutoffPast   = new Date(now.getTime() - 3  * 24 * 60 * 60 * 1000);
  const cutoffFuture = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return items.filter(i => {
    if (i.date === '-' || i.topic === '-' || i.topic === '') return false;
    const d = parseItemDate(i.date);
    if (!d) return true;
    return d >= cutoffPast && d <= cutoffFuture;
  });
}

function parseOutreachLog(md: string): OutreachStats {
  return {
    sent:        Number(md.match(/累計寄出：(\d+)/)?.[1] ?? 0),
    replied:     Number(md.match(/已回覆：(\d+)/)?.[1]   ?? 0),
    negotiating: Number(md.match(/進入洽談：(\d+)/)?.[1] ?? 0),
  };
}

function parseFinanceReport(md: string): FinanceSummary {
  return {
    income:  md.match(/本月收入合計：NT\$([^\s\n\*]+)/)?.[1]           ?? '—',
    expense: md.match(/本月支出合計：NT\$([^\s\n\*]+)/)?.[1]           ?? '—',
    profit:  md.match(/\*\*本月淨利\*\*\s*\|\s*\*\*([^*\n]+)\*\*/)?.[1] ?? '—',
  };
}

function parseGA4Log(md: string): GA4WeekRow | null {
  const rows: GA4WeekRow[] = [];
  let inTable = false;
  for (const line of md.split('\n')) {
    if (line.includes('| 週次 |')) { inTable = true; continue; }
    if (inTable && line.startsWith('|---')) continue;
    if (inTable && line.startsWith('|')) {
      const cols = line.split('|').map(s => s.trim()).filter(Boolean);
      if (cols.length >= 6 && cols[0] !== '週次')
        rows.push({ week: cols[0], diagnoseStart: cols[1], diagnoseComplete: cols[2], completeRate: cols[3], upsellClick: cols[4], convRate: cols[5] });
    } else if (inTable && !line.startsWith('|')) { inTable = false; }
  }
  return rows.length > 0 ? rows[rows.length - 1] : null;
}

// ─── Colour helpers ───────────────────────────────────────
function priorityColor(p: string) {
  if (p === 'P0') return '#ef4444';
  if (p === 'P1') return '#f97316';
  if (p === 'P2') return '#eab308';
  return '#64748b';
}
function statusColor(s: string) {
  if (s === '已發布' || s === '已發')                 return '#22c55e';
  if (s === '排程中' || s === '待發布' || s === '待發') return '#4f8ef7';
  if (s === '草稿'   || s === '待草稿')               return '#f97316';
  return '#64748b';
}
function typeIcon(t: string) {
  if (t === '影片') return '🎬';
  if (t === '貼文') return '✏️';
  if (t === '文章') return '📝';
  if (t === '廣播') return '📢';
  if (t === '電子報') return '✉️';
  return '📌';
}
function healthColor(score: number) {
  if (score >= 4) return '#22c55e';
  if (score === 3) return '#eab308';
  return '#ef4444';
}

// ─── Section header (horizontal rule style) ───────────────
function SectionHeader({ icon, title, note }: { icon: string; title: string; note?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
        {icon} {title}
      </span>
      {note && (
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{note}</span>
      )}
      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
    </div>
  );
}

// ─── Sparkline (SVG, zero deps) ───────────────────────────
function Sparkline({ data, color = '#4f8ef7' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const w = 72, h = 24;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
  ).join(' ');
  const last = data[data.length - 1];
  const cy = h - ((last - min) / range) * (h - 4) - 2;
  return (
    <svg width={w} height={h} style={{ overflow: 'visible', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={w} cy={cy} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Stat row ─────────────────────────────────────────────
function StatRow({ label, value, unit = '', note, alert }: {
  label: string; value: string; unit?: string; note?: string; alert?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        {note && (
          <span className="text-xs" style={{ color: note === '自動' ? '#22c55e' : '#f97316', fontSize: '10px' }}>
            {note}
          </span>
        )}
      </div>
      <span className="text-sm font-bold" style={{ color: alert ? '#ef4444' : 'var(--accent)' }}>
        {value}
        {unit && <span className="text-xs ml-0.5" style={{ color: 'var(--text-secondary)' }}>{unit}</span>}
      </span>
    </div>
  );
}

// ─── KPI card ─────────────────────────────────────────────
function KpiCard({ icon, title, rows, health, sparkData, accentColor }: {
  icon: string; title: string;
  rows: { label: string; value: string; unit?: string; note?: string }[];
  health?: number;
  sparkData?: number[];
  accentColor?: string;
}) {
  const accent = accentColor ?? 'var(--border-bright)';
  return (
    <div
      className="rounded-xl px-3 py-3"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderTop: `2px solid ${accent}`,
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{icon} {title}</span>
        <div className="flex items-center gap-2">
          {sparkData && sparkData.length >= 2 && <Sparkline data={sparkData} />}
          {health != null && (
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded"
              style={{ color: healthColor(health), backgroundColor: healthColor(health) + '18', fontSize: '10px' }}
            >
              ♥ {health}/5
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1.5">
        {rows.map(r => <StatRow key={r.label} label={r.label} value={r.value} unit={r.unit} note={r.note} />)}
      </div>
    </div>
  );
}

// ─── Department list ──────────────────────────────────────
const departments = [
  { dept: '人資部 HR',  role: '員工冊・盤點・健康度' },
  { dept: '開發部 DEV', role: '功能開發・Bug・版本管理' },
  { dept: '資安部 SEC', role: '安全架構・API 金鑰・存取控制' },
  { dept: '內容部 CNT', role: '內容策略・Threads 規劃・文章' },
  { dept: '社群部 SOC', role: 'LINE@・Threads 數據・粉絲成長' },
  { dept: '業務部 BIZ', role: '合作外展・潛在客戶' },
  { dept: '知識庫 KM',  role: '方法論・SOP・決策記錄' },
  { dept: '策略部 STR', role: '組織架構・長期規劃・總管模式' },
  { dept: '財務部 FIN', role: '收入・支出・月淨利・未收款' },
  { dept: '客戶部 CRM', role: '諮詢記錄・來源追蹤・轉介紹' },
  { dept: '產品部 PRD', role: '診斷・預約・路線圖・轉換率' },
  { dept: '法務部 LEG', role: '服務條款・隱私政策・合作合約' },
];

// ══════════════════════════════════════════════════════════
export default async function Home() {
  let systems: System[] = [];
  let inventory: Record<string, unknown> = {};
  let tasksMd = '';
  let dailyChecklistMd = '';
  let contentItems: ContentItem[]    = [];
  let outreachStats: OutreachStats   | null = null;
  let financeSummary: FinanceSummary | null = null;
  let ga4Row: GA4WeekRow             | null = null;
  let followerHistory: FollowerPoint[]      = [];
  let knowledgeFolders: KnowledgeFolder[]   = [];

  // ── Core (required) ──────────────────────────────────
  try {
    inventory = await getInventory();
    systems   = inventory.systems as System[];
    tasksMd   = await getTasksMd();
    try { dailyChecklistMd = await getDailyChecklist(); } catch { /* optional */ }
  } catch {
    return (
      <div className="text-center py-20 text-sm" style={{ color: '#ef4444' }}>
        無法讀取總部資料。請確認 GITHUB_TOKEN 環境變數已設定。
      </div>
    );
  }

  // ── Optional fetches ─────────────────────────────────
  const safe = <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

  const fetchLine = async (): Promise<number | null> => {
    const t = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!t) return null;
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const r = await fetch(`https://api.line.biz/v2/bot/insight/followers?date=${today}`, {
      headers: { Authorization: `Bearer ${t}` }, next: { revalidate: 3600 },
    } as RequestInit);
    if (!r.ok) return null;
    const d = await r.json();
    return (d.followers ?? d.targetedReaches ?? null) as number | null;
  };

  const fetchKit = async (): Promise<number | null> => {
    const k = process.env.KIT_API_KEY;
    if (!k) return null;
    const r = await fetch(`https://api.convertkit.com/v3/subscribers?api_secret=${k}&count=0`, { next: { revalidate: 3600 } } as unknown as RequestInit);
    if (!r.ok) return null;
    const d = await r.json();
    return (d.total_subscribers ?? null) as number | null;
  };

  const fetchBooking = async (): Promise<BookingStats | null> => {
    const u = process.env.BOOKING_STATS_URL;
    if (!u) return null;
    const r = await fetch(`${u}/api/stats`, { next: { revalidate: 300 } } as unknown as RequestInit);
    if (!r.ok) return null;
    return r.json() as Promise<BookingStats>;
  };

  const [
    calMd, outreachMd, financeMd, ga4Md,
    ga4Live, websiteGA4,
    followerHistRaw, socialMetricsRaw,
    lineFollowers, , bookingStats,
    knowledgeResult,
  ] = await Promise.all([
    safe(getContentCalendar()),
    safe(getOutreachLog()),
    safe(getFinanceReport()),
    safe(getGA4Log()),
    safe(getDiagnosisGA4Data()),
    safe(getWebsiteGA4Data()),
    safe(getFollowerHistory()),
    safe(getSocialMetrics()),
    safe(fetchLine()),
    safe(fetchKit()),
    safe(fetchBooking()),
    safe(getKnowledgeBase()),
  ]);
  if (knowledgeResult) knowledgeFolders = knowledgeResult;

  contentItems   = calMd      ? parseContentCalendar(calMd)   : [];
  outreachStats  = outreachMd ? parseOutreachLog(outreachMd)  : null;
  financeSummary = financeMd  ? parseFinanceReport(financeMd) : null;
  ga4Row         = ga4Md      ? parseGA4Log(ga4Md)            : null;
  try { if (followerHistRaw) followerHistory = JSON.parse(followerHistRaw) as FollowerPoint[]; } catch { /* ignore */ }
  let socialMetrics: SocialMetrics | null = null;
  try { if (socialMetricsRaw) socialMetrics = JSON.parse(socialMetricsRaw) as SocialMetrics; } catch { /* ignore */ }

  const tasks       = parseTasks(tasksMd);
  const p1Tasks     = tasks.filter(t => t.priority === 'P1' || t.priority === 'P0');
  const p2Tasks     = tasks.filter(t => t.priority === 'P2');
  const avgHealth   = systems.length
    ? (systems.reduce((s, sys) => s + sys.health_score, 0) / systems.length).toFixed(1) : '0';
  const alertSystems = systems.filter(s => s.health_score <= 3);
  const quickLinks   = systems.filter(s => s.url && (s.status === 'live' || s.status === 'active') && s.id !== 'SYS-07');

  const threadsFollowers   = (systems.find(s => s.id === 'SYS-02') as any)?.current_followers ?? null;
  const followerSparkData  = (followerHistory as FollowerPoint[]).map(p => p.followers);
  if (threadsFollowers && (followerHistory.length === 0 || (followerHistory as FollowerPoint[])[followerHistory.length - 1].followers !== threadsFollowers)) {
    followerSparkData.push(threadsFollowers as number);
  }

  const _os = outreachStats;
  const outreachReplyRate = !_os ? '—' : _os.sent > 0 ? `${Math.round((_os.replied / _os.sent) * 100)}%` : '—';

  // ─── Render ───────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── 每日任務清單 */}
      {dailyChecklistMd && <DailyChecklist md={dailyChecklistMd} />}

      {/* ── 健康警示（有問題才顯示）*/}
      {alertSystems.length > 0 && (
        <div className="rounded-xl px-4 py-3 space-y-1.5"
          style={{ backgroundColor: '#ef444410', border: '1px solid #ef444430' }}>
          <div className="text-xs font-bold mb-1" style={{ color: '#ef4444' }}>⚠ 系統健康警示</div>
          {alertSystems.map(s => (
            <div key={s.id} className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold shrink-0" style={{ color: '#ef4444' }}>
                {s.short_code} — {s.health_score}/5
              </span>
              <span className="text-xs text-right" style={{ color: 'var(--text-secondary)' }}>
                {s.pending_tasks?.[0] ?? ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── 總覽 */}
      <section id="overview">
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: '系統總數', value: String(systems.length), icon: '🖥',  accent: '#4f8ef7' },
            { label: '平均健康', value: avgHealth + '/5',       icon: '❤️', accent: '#22c55e' },
            { label: 'P1 任務', value: String(p1Tasks.length), icon: '⚡',  accent: p1Tasks.length > 0 ? '#f97316' : '#22c55e' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-xl p-3 text-center"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderTop: `2px solid ${stat.accent}`,
              }}
            >
              <div className="text-base mb-0.5">{stat.icon}</div>
              <div className="text-xl font-bold tabular-nums" style={{ color: stat.accent }}>{stat.value}</div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* 快速連結 */}
        {quickLinks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickLinks.map(s => (
              <a
                key={s.id}
                href={s.url!}
                target="_blank"
                rel="noopener noreferrer"
                className="link-pill text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: '#22c55e' }} />
                {s.short_code} ↗
              </a>
            ))}
          </div>
        )}
      </section>

      {/* ── KPI 總覽 */}
      <section id="kpi">
        <SectionHeader icon="📊" title="KPI 總覽" />
        <div className="grid grid-cols-2 gap-3">

          <KpiCard icon="🌐" title="官網" accentColor="#4f8ef7"
            health={systems.find(s => s.id === 'SYS-01')?.health_score}
            rows={websiteGA4 ? [
              { label: 'Sessions',  value: websiteGA4.sessions.toLocaleString(),  unit: '次', note: '自動' },
              { label: '活躍用戶', value: websiteGA4.users.toLocaleString(),      unit: '人' },
              { label: '頁面瀏覽', value: websiteGA4.pageViews.toLocaleString(),  unit: '次' },
            ] : [
              { label: 'UV/Sessions', value: '—', note: '設定 GA4 啟用' },
            ]}
          />

          <KpiCard icon="📊" title="看板" accentColor="#22c55e"
            health={systems.find(s => s.id === 'SYS-02')?.health_score}
            sparkData={followerSparkData.length >= 2 ? followerSparkData : undefined}
            rows={[
              { label: 'Threads 追蹤', value: threadsFollowers ? threadsFollowers.toLocaleString() : '—', unit: '人' },
              { label: '趨勢', value: followerSparkData.length >= 2
                  ? (followerSparkData[followerSparkData.length - 1] - followerSparkData[0] >= 0 ? '↑' : '↓') +
                    ' ' + Math.abs(followerSparkData[followerSparkData.length - 1] - followerSparkData[0])
                  : '—' },
            ]}
          />

          <KpiCard icon="🔬" title="診斷" accentColor="#a78bfa"
            health={systems.find(s => s.id === 'SYS-03')?.health_score}
            rows={ga4Live ? [
              { label: '診斷開始', value: String(ga4Live.diagnoseStarted), unit: '次', note: '自動' },
              { label: '完成率',   value: ga4Live.completeRate },
              { label: 'Upsell 率', value: ga4Live.convRate },
            ] : ga4Row ? [
              { label: '完成率',   value: ga4Row.completeRate, note: '手動' },
              { label: 'Upsell 率', value: ga4Row.convRate },
            ] : [
              { label: '完成率', value: '—', note: '設定 GA4 啟用' },
            ]}
          />

          <KpiCard icon="📅" title="預約" accentColor="#f97316"
            health={systems.find(s => s.id === 'SYS-04')?.health_score}
            rows={bookingStats ? [
              { label: '本週新預約', value: String(bookingStats.thisWeek),  unit: '筆', note: '自動' },
              { label: '本月累計',   value: String(bookingStats.thisMonth), unit: '筆' },
              { label: '歷史總計',   value: String(bookingStats.total),     unit: '筆' },
            ] : [
              { label: '本週新預約', value: '—', note: '設定 BOOKING_STATS_URL 啟用' },
            ]}
          />

          <KpiCard icon="💬" title="社群平台" accentColor="#06b6d4"
            health={systems.find(s => s.id === 'SYS-05')?.health_score}
            rows={[
              { label: 'LINE 好友',  value: lineFollowers != null ? lineFollowers.toLocaleString() : ((socialMetrics?.line?.friends ?? (inventory as any)?.line_followers)?.toLocaleString() ?? '—'), unit: '人', note: lineFollowers != null ? '自動' : '手動' },
              { label: '方格子',     value: socialMetrics?.vocus?.followers    != null ? socialMetrics.vocus.followers.toLocaleString()    : '—', unit: '人', note: '手動' },
              { label: 'Facebook',  value: socialMetrics?.facebook?.followers  != null ? socialMetrics.facebook.followers.toLocaleString()  : '—', unit: '人' },
              { label: 'Instagram', value: socialMetrics?.instagram?.followers != null ? socialMetrics.instagram.followers.toLocaleString() : '—', unit: '人' },
            ]}
          />

          {/* 外展 — also anchors #outreach */}
          <div id="outreach">
            <KpiCard icon="📤" title="外展" accentColor="#eab308"
              health={systems.find(s => s.id === 'SYS-06')?.health_score}
              rows={outreachStats ? [
                { label: '累計發信', value: String(outreachStats.sent),        unit: '封' },
                { label: '回覆率',   value: outreachReplyRate },
                { label: '洽談中',   value: String(outreachStats.negotiating), unit: '組' },
              ] : [
                { label: '累計發信', value: '—' },
              ]}
            />
          </div>

        </div>

        {/* 財務摘要 — also anchors #finance */}
        <div id="finance" className="mt-3">
          {financeSummary ? (
            <div
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderTop: '2px solid #22c55e' }}
            >
              <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>💰 本月財務</span>
              <div className="flex items-center gap-4">
                <span className="text-xs">收入 <span className="font-bold" style={{ color: '#22c55e' }}>NT${financeSummary.income}</span></span>
                <span className="text-xs">支出 <span className="font-bold" style={{ color: '#ef4444' }}>NT${financeSummary.expense}</span></span>
                <span className="text-xs">淨利 <span className="font-bold" style={{ color: 'var(--accent)' }}>{financeSummary.profit}</span></span>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl px-4 py-3 text-xs"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              💰 財務數據未填入 — 請更新 finance/monthly-report.md
            </div>
          )}
        </div>
      </section>

      {/* ── 指令中心 */}
      <section id="command">
        <CommandCenter />
      </section>

      {/* ── P1 任務 */}
      <section id="tasks">
        <SectionHeader icon="⚡" title="本週必須完成" />
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
                  style={{ backgroundColor: priorityColor(t.priority) + '20', color: priorityColor(t.priority) }}
                >
                  {t.priority}
                </span>
                <div>
                  <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--accent)' }}>{t.system}</div>
                  <div className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{t.content}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="rounded-xl px-4 py-3 text-sm"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid #22c55e30', color: '#22c55e' }}
          >
            ✓ 本週無緊急任務
          </div>
        )}

        {p2Tasks.length > 0 && (
          <div className="mt-4">
            <SectionHeader icon="📌" title="本週推進" />
            <div className="space-y-2">
              {p2Tasks.map((t, i) => (
                <div
                  key={i}
                  className="rounded-xl px-4 py-3 flex items-start gap-3"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
                >
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded mt-0.5 shrink-0"
                    style={{ backgroundColor: '#eab30820', color: '#eab308' }}
                  >P2</span>
                  <div>
                    <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text-secondary)' }}>{t.system}</div>
                    <div className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{t.content}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── 近期內容排程 */}
      <section id="content">
        <SectionHeader icon="📆" title="近期內容排程" />
        {contentItems.length > 0 ? (
          <div
            className="rounded-xl divide-y overflow-hidden"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            {contentItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base shrink-0">{typeIcon(item.type)}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{item.date}</span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.type}</span>
                    </div>
                    <div className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{item.topic}</div>
                  </div>
                </div>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded shrink-0"
                  style={{ backgroundColor: statusColor(item.status) + '20', color: statusColor(item.status) }}
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

      {/* ── 系統狀態 */}
      <section id="systems">
        <SectionHeader icon="🖥" title="系統狀態" note="點擊展開詳情" />
        <div className="space-y-2">
          {systems.map((sys) => <SystemCard key={sys.id} sys={sys} />)}
        </div>
      </section>

      {/* ── 知識庫 */}
      <section id="knowledge">
        <SectionHeader icon="📚" title="知識庫" note={knowledgeFolders.length > 0 ? `${knowledgeFolders.reduce((s, f) => s + f.files.length, 0)} 份文件` : undefined} />
        {knowledgeFolders.length === 0 ? (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            知識庫讀取中…
          </div>
        ) : (
          <div className="space-y-2">
            {knowledgeFolders.map(folder => (
              <details
                key={folder.key}
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
              >
                <summary
                  className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                  style={{ listStyle: 'none', color: 'var(--text-primary)' }}
                >
                  <span className="text-sm font-semibold">{folder.icon} {folder.label}</span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                    {folder.files.length} 份 ▾
                  </span>
                </summary>
                <div style={{ borderTop: '1px solid var(--border)' }}>
                  {folder.files.length === 0 ? (
                    <div className="px-4 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>（尚無文件）</div>
                  ) : (
                    folder.files.map(file => (
                      <details
                        key={file.name}
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <summary
                          className="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none"
                          style={{ listStyle: 'none', color: 'var(--text-secondary)' }}
                        >
                          <span className="text-xs">📄</span>
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
                          {file.content && (
                            <span className="text-xs ml-auto" style={{ color: 'var(--text-secondary)' }}>點擊展開 ▾</span>
                          )}
                        </summary>
                        {file.content ? (
                          <div
                            className="px-4 pb-4 pt-2"
                            style={{ backgroundColor: 'var(--bg-primary)' }}
                          >
                            <pre
                              className="text-xs leading-relaxed whitespace-pre-wrap"
                              style={{
                                color: 'var(--text-primary)',
                                fontFamily: '"Noto Sans TC", "PingFang TC", sans-serif',
                                maxHeight: '400px',
                                overflowY: 'auto',
                              }}
                            >
                              {file.content}
                            </pre>
                          </div>
                        ) : (
                          <div className="px-4 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            內容請至 GitHub 查看
                          </div>
                        )}
                      </details>
                    ))
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>

      {/* ── 部門架構 */}
      <section id="departments">
        <SectionHeader icon="🏢" title="部門架構" />
        <div
          className="rounded-xl divide-y overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {departments.map(d => (
            <div key={d.dept} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{d.dept}</span>
              <span className="text-xs text-right" style={{ color: 'var(--text-secondary)' }}>{d.role}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-center text-xs pb-4" style={{ color: 'var(--text-muted)' }}>
        資料每 1 分鐘自動更新 · TZLTH-HQ
      </p>

    </div>
  );
}
