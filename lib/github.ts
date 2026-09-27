const OWNER = 'shoppy09';
const REPO = 'tzlth-hq';
const TOKEN = process.env.GITHUB_TOKEN;

async function fetchFile(path: string, repo = REPO, ttl = 60): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github.v3.raw',
      },
      next: { revalidate: ttl }, // refresh every 60 seconds by default
    }
  );
  if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
  return res.text();
}

export async function getInventory() {
  const raw = await fetchFile('hr/inventory.json');
  return JSON.parse(raw);
}

export async function getTasksMd() {
  return fetchFile('dev/tasks.md');
}

// getOutreachLog 已於 2026-08-17 移除：business/outreach-log.md 2026-05-27 廢棄
// （SoT＝Google Sheets「發信日誌」分頁），外展活動同日裁決凍結，無消費者。

export async function getContentCalendar() {
  return fetchFile('content/content-calendar.md');
}

export async function getFinanceReport() {
  return fetchFile('finance/monthly-report.md');
}

// RCF-009 Phase 4：每日收入 JSON（依月份分檔）
export async function getDailyRevenue(ym: string): Promise<string | null> {
  try {
    return await fetchFile(`finance/${ym}-daily.json`);
  } catch {
    return null;
  }
}

// 2026-08-14 移除 getRecentDailyRevenues（趨勢圖預留 API，全史零呼叫）：
// 近 6 月趨勢已由 lib/finance.ts buildLedgerTrend（ledger 實收制口徑）實現於 page.tsx，預留永久落空。

// 2026-09-09 移除 getGA4Log（讀 product/ga4-weekly-log.md 的診斷欄）：
// AI 履歷診斷 technical retirement 完成，其唯一消費者診斷 KpiCard 已一併拆除。
// 比照 2026-08-17 getOutreachLog / 2026-08-14 getSocialLog 前例，留碑不留碼。

// 2026-08-14 移除 getSocialLog（讀 social/weekly-log.md，該檔 2026-07-06 廢止、批次 1B ④）：
// 社群 KPI 單一來源＝social/metrics.json，已由下方 getSocialMetrics 供應；本函式零呼叫者。

export async function getFollowerHistory() {
  // Try threads-dashboard repo first (updated by auto-fetch.bat), fall back to tzlth-hq
  try {
    return await fetchFile('follower-history.json', 'tzlth-threads-dashboard', 60);
  } catch {
    return fetchFile('social/followers-history.json');
  }
}

export async function getDailyChecklist() {
  return fetchFile('dev/daily-checklist.md');
}

export async function getSocialMetrics() {
  return fetchFile('social/metrics.json');
}

// 2026-08-14 移除 getDailyLog（reports/daily-log.md，全史零呼叫；檔案本身仍活躍，僅儀表板不消費）。


// ─── Checklist State (cross-device sync) ─────────────────

const CHECKLIST_STATE_PATH = 'dev/daily-checklist-state.json';

export async function getChecklistState(): Promise<string> {
  try {
    return await fetchFile(CHECKLIST_STATE_PATH, REPO, 0);
  } catch {
    return '{}';
  }
}

export async function putChecklistState(
  state: Record<string, Record<string, boolean>>
): Promise<void> {
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${CHECKLIST_STATE_PATH}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${TOKEN ?? ''}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  let sha: string | undefined;
  const getRes = await fetch(apiUrl, { headers });
  if (getRes.ok) {
    const data = await getRes.json() as { sha: string };
    sha = data.sha;
  }

  const content = Buffer.from(JSON.stringify(state, null, 2)).toString('base64');
  await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: 'chore: update daily checklist state',
      content,
      ...(sha ? { sha } : {}),
    }),
  });
}

// ─── Tim Actions (cross-device sync) ─────────────────────

export async function getTimActions(): Promise<string> {
  return fetchFile('dev/tim-actions.json');
}

const TIM_ACTIONS_STATE_PATH = 'dev/tim-actions-state.json';

export async function getTimActionsState(): Promise<string> {
  try {
    return await fetchFile(TIM_ACTIONS_STATE_PATH, REPO, 0);
  } catch {
    return '{}';
  }
}

export async function putTimActionsState(
  state: Record<string, boolean>
): Promise<void> {
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${TIM_ACTIONS_STATE_PATH}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${TOKEN ?? ''}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  let sha: string | undefined;
  const getRes = await fetch(apiUrl, { headers });
  if (getRes.ok) {
    const data = await getRes.json() as { sha: string };
    sha = data.sha;
  }

  const content = Buffer.from(JSON.stringify(state, null, 2)).toString('base64');
  await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: 'chore: update tim-actions state',
      content,
      ...(sha ? { sha } : {}),
    }),
  });
}

// ─── Scheduled Articles (tzlth-website repo) ─────────────

interface ScheduledArticle {
  slug: string;
  title: string;
  date: string;
  status: '待發布' | '已發布';
}

export async function getScheduledArticles(): Promise<ScheduledArticle[]> {
  // Taiwan date boundaries
  const today = new Date().toLocaleDateString('sv', { timeZone: 'Asia/Taipei' });
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('sv', { timeZone: 'Asia/Taipei' });

  // ── Source A: blog/scheduled/ → 待發布文章（未到期的 JSON 檔）
  // publish_scheduled.py 發布後會刪除此檔，資料夾可能不存在（空目錄 = Git 不追蹤）
  const pendingArticles = await (async (): Promise<ScheduledArticle[]> => {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${OWNER}/tzlth-website/contents/blog/scheduled`,
        {
          headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.v3+json' },
          next: { revalidate: 300 },
        } as RequestInit
      );
      if (!res.ok) return []; // 404 = 資料夾不存在（無排程文章），正常情況
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      const jsonFiles = (data as { name: string; type: string; path: string }[]).filter(
        f => f.type === 'file' && f.name.endsWith('.json')
      );

      return (
        await Promise.all(
          jsonFiles.map(async (f): Promise<ScheduledArticle | null> => {
            try {
              const content = await fetchFile(f.path, 'tzlth-website', 300);
              const parsed = JSON.parse(content) as { slug?: string; title?: string; date?: string };
              if (!parsed.slug || !parsed.title || !parsed.date) return null;
              return { slug: parsed.slug, title: parsed.title, date: parsed.date, status: '待發布' };
            } catch {
              return null;
            }
          })
        )
      ).filter((a): a is ScheduledArticle => a !== null);
    } catch {
      return [];
    }
  })();

  // ── Source B: blog/articles.json → 最近 14 天已發布文章
  const publishedArticles = await (async (): Promise<ScheduledArticle[]> => {
    try {
      const raw = await fetchFile('blog/articles.json', 'tzlth-website', 300);
      const all = JSON.parse(raw) as { slug?: string; title?: string; date?: string }[];
      if (!Array.isArray(all)) return [];
      return all
        .filter(a => a.slug && a.title && a.date && a.date <= today && a.date >= cutoff)
        .map(a => ({ slug: a.slug!, title: a.title!, date: a.date!, status: '已發布' as const }));
    } catch {
      return [];
    }
  })();

  // ── Merge: pending (all future) + recent published (14 days), descending by date
  const merged = [...pendingArticles, ...publishedArticles];
  return merged.sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Knowledge Base ───────────────────────────────────────

interface GitHubDirItem {
  name: string;
  type: 'file' | 'dir';
  path: string;
}

async function fetchDir(path: string): Promise<GitHubDirItem[]> {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github.v3+json' },
      next: { revalidate: 300 },
    } as RequestInit
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? (data as GitHubDirItem[]) : [];
}

export interface KnowledgeFile { name: string; content: string; }
export interface KnowledgeFolder { key: string; label: string; icon: string; files: KnowledgeFile[]; }

export async function getKnowledgeBase(): Promise<KnowledgeFolder[]> {
  const defs = [
    { key: 'methodology', label: '方法論',   icon: '🧠', fetchContent: true  },
    { key: 'operations',  label: '操作 SOP', icon: '⚙️', fetchContent: true  },
    { key: 'decisions',   label: '決策記錄', icon: '📋', fetchContent: false },
    { key: 'references',  label: '參考文件', icon: '📖', fetchContent: false },
  ];
  return Promise.all(defs.map(async d => {
    const items = await fetchDir(`knowledge/${d.key}`).catch(() => [] as GitHubDirItem[]);
    const mdFiles = items.filter(i => i.type === 'file' && i.name.endsWith('.md'));
    const files: KnowledgeFile[] = await Promise.all(mdFiles.map(async item => ({
      name: item.name.replace('.md', ''),
      content: d.fetchContent
        ? await fetchFile(item.path, REPO, 300).catch(() => '')
        : '',
    })));
    return { key: d.key, label: d.label, icon: d.icon, files };
  }));
}

// ─── 客戶穿透視圖（B-b v0，RCF-125）────────────────────────
// 資料契約：tzlth-hq strategy/customer-360-spec.md
export async function getClientLog(): Promise<string> {
  return fetchFile('crm/client-log.md');
}

// ─── ledger 讀取（2026-09-28 HQ tasks L716：原硬編 income-2026.json／expense-2026.json）──
// WHY：財務系統寫入端依「寫入當年」建檔（tzlth-finance lib/github.ts getIncomePath），2027 首筆會新建
//   income-2027.json；硬編 2026 會讓 2027 年的 6 月趨勢與客戶穿透視圖看不到新資料。
// 讀「2026 到台北今年」全部年度檔合併：客戶穿透視圖是全期視圖，只讀近兩年會在 2028 起丟掉 income-2026.json
//   （該檔同時承載 2024／2025 歷史 17 筆，那兩年從未獨立建檔）。每年多一次讀取，換永不丟資料。
// 缺檔（如跨年初日尚無新檔）視為空陣列——fetchFile 對非 2xx 會 throw，故逐檔 try/catch。
// 回傳型別維持 string（呼叫端 page.tsx／clients/page.tsx 以 JSON.parse 讀 .transactions，零改動）。
// ⛔ 只讀不寫：本 repo 不寫 ledger，合併後的物件不得回寫任何年度檔（會把舊年資料複製進新檔）。
const FIRST_LEDGER_YEAR = 2026; // 最早的年度檔；更早的交易都在這個檔裡

async function fetchLedgerYears(kind: 'income' | 'expense'): Promise<string> {
  const y = new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCFullYear();
  const years = Array.from({ length: Math.max(1, y - FIRST_LEDGER_YEAR + 1) }, (_, i) => FIRST_LEDGER_YEAR + i);
  const parts = await Promise.all(years.map(async yr => {
    try {
      const data = JSON.parse(await fetchFile(`finance/ledger/${kind}-${yr}.json`)) as { transactions?: unknown[] };
      return data.transactions ?? [];
    } catch {
      return null;
    }
  }));
  // 全部讀不到（GitHub API 故障／token 失效）→ 照舊拋錯，讓呼叫端 safe() 回 null、畫面不顯示；
  //   不可回空陣列，否則趨勢圖會畫出一排 0，看起來像真的零收入。
  if (parts.every(p => p === null)) throw new Error(`Failed to fetch any ${kind} ledger`);
  return JSON.stringify({ transactions: parts.flatMap(p => p ?? []) });
}

export async function getIncomeLedger(): Promise<string> {
  return fetchLedgerYears('income');
}

// ─── 月收支趨勢（L444，RCF-009 原設計「6個月趨勢圖」補完）──
export async function getExpenseLedger(): Promise<string> {
  return fetchLedgerYears('expense');
}
