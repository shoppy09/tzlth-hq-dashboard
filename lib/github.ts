const OWNER = 'shoppy09';
const REPO = 'tzlth-hq';
const TOKEN = process.env.GITHUB_TOKEN;

async function fetchFile(path: string): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github.v3.raw',
      },
      next: { revalidate: 300 }, // refresh every 5 minutes
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
  return fetchFile('social/followers-history.json');
}

export async function getDailyLog() {
  return fetchFile('reports/daily-log.md');
}
