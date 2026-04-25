import { NextRequest, NextResponse } from 'next/server';
import type { FinanceData, FinanceEntry } from '@/lib/finance';

const OWNER = 'shoppy09';
const REPO  = 'tzlth-hq';
const FILE  = 'finance/external-revenue.json';

export async function POST(req: NextRequest) {
  // ─── 1. 解析請求 ─────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '無效的 JSON' }, { status: 400 });
  }

  const { date, entry_type, type, amount, client_code, invoice_method, payment_method, note } = body as {
    date: string;
    entry_type: 'income' | 'expense';
    type?: string;
    amount: number;
    client_code?: string;
    invoice_method?: string;
    payment_method?: string;
    note?: string;
  };

  if (!date || !entry_type || !amount) {
    return NextResponse.json({ error: '缺少必要欄位：date / entry_type / amount' }, { status: 400 });
  }
  if (entry_type !== 'income' && entry_type !== 'expense') {
    return NextResponse.json({ error: 'entry_type 必須為 income 或 expense' }, { status: 400 });
  }
  if (Number(amount) <= 0) {
    return NextResponse.json({ error: '金額必須大於 0' }, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) return NextResponse.json({ error: '伺服器設定錯誤：缺少 GITHUB_TOKEN' }, { status: 500 });

  // ─── 2. 讀取現有檔案（含 SHA）──────────────────────────
  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'tzlth-hq-dashboard',
  };

  const getRes = await fetch(apiUrl, { headers });
  if (!getRes.ok) {
    return NextResponse.json({ error: `讀取 GitHub 失敗：${getRes.status}` }, { status: 500 });
  }
  const fileData = await getRes.json() as { sha: string; content: string };

  let current: FinanceData;
  try {
    const raw = Buffer.from(fileData.content.replace(/\n/g, ''), 'base64').toString('utf-8');
    current = JSON.parse(raw) as FinanceData;
  } catch {
    return NextResponse.json({ error: '解析 external-revenue.json 失敗' }, { status: 500 });
  }

  // ─── 3. 組裝新記錄 ──────────────────────────────────
  const entry: FinanceEntry = {
    date,
    entry_type,
    type: type || (entry_type === 'income' ? '其他' : '臨時支出'),
    amount: Number(amount),
    client_code: client_code || null,
    invoice_method: invoice_method || '無',
    payment_method: payment_method || '其他',
    note: note || '',
    recorded_at: new Date().toISOString(),
  };

  current.records = [...(current.records ?? []), entry];

  // ─── 4. 回寫 GitHub ────────────────────────────────
  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `finance: 手動記錄 ${entry_type === 'income' ? '收入' : '支出'} NT$${Number(amount).toLocaleString()} (${date})`,
      content: Buffer.from(JSON.stringify(current, null, 2), 'utf-8').toString('base64'),
      sha: fileData.sha,
    }),
  });

  if (!putRes.ok) {
    const errText = await putRes.text().catch(() => '');
    return NextResponse.json({ error: `寫入 GitHub 失敗：${putRes.status} ${errText}` }, { status: 500 });
  }

  // ─── 5. 回傳新記錄（前端用 entries state 自行計算月總計）──
  return NextResponse.json({ success: true, entry });
}
