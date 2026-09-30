import { NextResponse } from 'next/server';
import { getTimActionsState, setTimActionKey } from '@/lib/github';

export async function GET() {
  try {
    const raw = await getTimActionsState();
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({});
  }
}

// body：{ key: 'ta-012' | 'ta-005@2026-10', checked: boolean }
// 只改一個 key（伺服器端讀最新再寫），寫入失敗回 502，前端據此顯示「未同步」。
const KEY_RE = /^ta-\d{3}(@\d{4}-\d{2})?$/;

export async function POST(req: Request) {
  let body: { key?: unknown; checked?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: '格式錯誤' }, { status: 400 });
  }
  const { key, checked } = body;
  if (typeof key !== 'string' || !KEY_RE.test(key) || typeof checked !== 'boolean') {
    return NextResponse.json({ ok: false, error: '參數錯誤' }, { status: 400 });
  }
  try {
    const state = await setTimActionKey(key, checked);
    return NextResponse.json({ ok: true, state });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
