import { NextResponse } from 'next/server';
import { getChecklistState, setChecklistKey } from '@/lib/github';

export async function GET() {
  try {
    const raw = await getChecklistState();
    return NextResponse.json(JSON.parse(raw) as Record<string, Record<string, boolean>>);
  } catch {
    return NextResponse.json({});
  }
}

// body：{ date: 'YYYY-MM-DD', id: 'sun-1a2b3c4d', checked: boolean }
// 只改一格（伺服器端讀最新再寫），寫入失敗回 502，前端據此退回勾選並顯示「未同步」。
// [2026-09-30 L1106] 原版收整份狀態覆蓋、且不論 PUT 成敗一律回 ok。
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-z0-9]+-[a-z0-9]{1,16}$/;

export async function POST(req: Request) {
  let body: { date?: unknown; id?: unknown; checked?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: '格式錯誤' }, { status: 400 });
  }
  const { date, id, checked } = body;
  if (typeof date !== 'string' || !DATE_RE.test(date) ||
      typeof id !== 'string' || !ID_RE.test(id) || typeof checked !== 'boolean') {
    return NextResponse.json({ ok: false, error: '參數錯誤' }, { status: 400 });
  }
  try {
    const state = await setChecklistKey(date, id, checked);
    return NextResponse.json({ ok: true, day: state[date] ?? {} });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
