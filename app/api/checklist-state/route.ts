import { NextResponse } from 'next/server';
import { getChecklistState, putChecklistState } from '@/lib/github';

export async function GET() {
  try {
    const raw = await getChecklistState();
    return NextResponse.json(JSON.parse(raw) as Record<string, Record<string, boolean>>);
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, Record<string, boolean>>;
    await putChecklistState(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
