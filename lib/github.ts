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
