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
