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

export async function getOutreachLog() {
  return fetchFile('business/outreach-log.md');
}

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

// 近 N 個月的 daily-revenue（趨勢圖預留 API，本次不做 UI）
export async function getRecentDailyRevenues(nMonths = 6): Promise<Array<{ ym: string; raw: string | null }>> {
  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < nMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const results = await Promise.all(months.map(async ym => ({ ym, raw: await getDailyRevenue(ym) })));
  return results;
}

export async function getGA4Log() {
  return fetchFile('product/ga4-weekly-log.md');
}

export async function getSocialLog() {
  return fetchFile('social/weekly-log.md');
}

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

export async function getDailyLog() {
  return fetchFile('reports/daily-log.md');
}

// ─── Finance external revenue ─────────────────────────
export async function getExternalRevenue(): Promise<string> {
  // revalidate: 0 = always fresh（用戶可能剛剛新增了一筆）
  return fetchFile('finance/external-revenue.json', REPO, 0);
}

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

export async function getIncomeLedger(): Promise<string> {
  return fetchFile('finance/ledger/income-2026.json');
}
