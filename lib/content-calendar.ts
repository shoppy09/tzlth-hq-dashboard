// lib/content-calendar.ts
// 「近期內容排程」解析：HQ content/content-calendar.md → 近期（台北今天 -3 天 ～ +30 天）各平台排程列。
//
// 2026-10-06 重寫（tzlth-hq tasks「儀表板近期內容排程解析失敗」）。舊版的四個問題：
//   ① 只認 MM/DD，認不出的列一律保留 ⇒ 數百列舊排程永遠顯示
//   ② 欄位寫死位置，且 .filter(Boolean) 丟掉空格子 ⇒ 欄位錯位（Threads 表第一欄是週次）
//   ③ 各平台的表被說明文字切成多段、後段沒有表頭 ⇒ 後段整段讀不到
//   ④ 「今天」用伺服器時區（UTC）、年份只會往後推 ⇒ 台灣清晨差一天、跨年月份錯年
// 做法：依表頭欄名取欄；同一個「## 」節內沿用最近一次的表頭；日期取離台北今天最近的那一年。
// ⚠️ 本 repo 為 public：本檔只放解析邏輯，不放任何內容資料。
// ⚠️ 「狀態」欄刻意不讀：多個平台的狀態格不是實況（FB 寫的是備註、影片區為 build 時初值），顯示會誤導。

export interface ContentItem {
  isoDate: string;   // YYYY-MM-DD（台北日期）
  label: string;     // 顯示用：MM/DD（週X）
  platform: string;  // 官網／Threads／FB／IG／影片／LINE／電子報／其他（取自所在「## 」節標題）
  topic: string;
  link?: string;
}

const PLATFORM_RULES: [RegExp, string][] = [
  [/官網/, '官網'],
  [/Threads/i, 'Threads'],
  [/(^|[^A-Za-z])FB([^A-Za-z]|$)|粉專/, 'FB'],
  [/(^|[^A-Za-z])IG([^A-Za-z]|$)/, 'IG'],
  [/影片|Reel/i, '影片'],
  [/LINE/i, 'LINE'],
  [/電子報|Kit/, '電子報'],
];
export const PLATFORM_ORDER = ['官網', 'Threads', 'FB', 'IG', '影片', 'LINE', '電子報', '其他'];

const LINK_COLUMNS = ['連結', '草稿', '草稿/腳本'];
const HQ_CONTENT_BLOB = 'https://github.com/shoppy09/tzlth-hq/blob/main/content/';
const DAY = 24 * 60 * 60 * 1000;
const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

function platformOf(heading: string): string {
  for (const [re, name] of PLATFORM_RULES) if (re.test(heading)) return name;
  return '其他';
}

/** 台北「今天」的 UTC 午夜時間戳 */
export function taipeiToday(now: Date): number {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function validDate(y: number, m: number, d: number): number | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const t = Date.UTC(y, m - 1, d);
  const back = new Date(t);
  return back.getUTCMonth() === m - 1 && back.getUTCDate() === d ? t : null;
}

/** 日期格：YYYY-MM-DD／MM/DD／MM-DD（後面可接星期）；無年份者取離 today 最近的年份。認不出 → null */
export function parseCellDate(cell: string, today: number): number | null {
  const s = cell.replace(/\*/g, '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[/-](\d{1,2})(?=$|\s|（|\()/);
  if (!m) return null;
  const y = new Date(today).getUTCFullYear();
  let best: number | null = null;
  for (const yy of [y - 1, y, y + 1]) {
    const t = validDate(yy, +m[1], +m[2]);
    if (t !== null && (best === null || Math.abs(t - today) < Math.abs(best - today))) best = t;
  }
  return best;
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
}

function cleanText(cell: string): string {
  return cell
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim();
}

/** 只放行 http(s)；相對路徑（草稿檔）補成 HQ content/ 的 GitHub 網址；其他一律丟棄 */
function extractLink(cell: string): string | undefined {
  const md = cell.match(/\[[^\]]*\]\(([^)\s]+)\)/);
  const raw = md ? md[1] : cell.trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (md && raw.endsWith('.md') && !raw.includes(':') && !raw.startsWith('/') && !raw.includes('..')) {
    return HQ_CONTENT_BLOB + encodeURI(raw);
  }
  return undefined;
}

export function parseContentCalendar(md: string, now: Date = new Date()): ContentItem[] {
  const today = taipeiToday(now);
  const from = today - 3 * DAY;
  const to = today + 30 * DAY;
  const items: (ContentItem & { t: number })[] = [];

  let platform = '其他';
  let header: string[] | null = null;

  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) { platform = platformOf(line.slice(3)); header = null; continue; }
    if (!line.startsWith('|')) continue;                 // 說明文字：不結束表格（同節後段沿用表頭）
    const cols = splitRow(line);
    if (cols.includes('日期')) { header = cols; continue; }
    if (!header || /^:?-{3,}/.test(cols[0] ?? '')) continue;

    const di = header.indexOf('日期');
    const ti = header.indexOf('主題');
    if (di < 0 || ti < 0 || di >= cols.length || ti >= cols.length) continue;

    const t = parseCellDate(cols[di], today);
    if (t === null || t < from || t > to) continue;
    const topic = cleanText(cols[ti]);
    if (!topic || topic === '-' || topic === '—') continue;

    let link: string | undefined;
    for (const name of LINK_COLUMNS) {
      const li = header.indexOf(name);
      if (li >= 0 && li < cols.length && (link = extractLink(cols[li]))) break;
    }

    const d = new Date(t);
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    items.push({
      t,
      isoDate: `${d.getUTCFullYear()}-${mm}-${dd}`,
      label: `${mm}/${dd}（${WEEKDAY[d.getUTCDay()]}）`,
      platform,
      topic,
      link,
    });
  }

  items.sort((a, b) => a.t - b.t || PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform));
  return items.map(i => ({ isoDate: i.isoDate, label: i.label, platform: i.platform, topic: i.topic, link: i.link }));
}
