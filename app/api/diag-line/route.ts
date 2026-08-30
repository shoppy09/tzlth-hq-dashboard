// ⚠️ 臨時診斷端點（2026-08-30 tasks L781）——定位 LINE 卡 fallback 第二層原因後即刪除。
// 只回傳 HTTP 狀態碼與欄位存在與否，不回傳、不記錄 token。
export const dynamic = 'force-dynamic';

export async function GET() {
  const t = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!t) return Response.json({ tokenPresent: false });

  const jstDay = (daysAgo: number) =>
    new Date(Date.now() - daysAgo * 86400000)
      .toLocaleDateString('sv', { timeZone: 'Asia/Tokyo' })
      .replace(/-/g, '');

  const out: Record<string, unknown> = { tokenPresent: true, tokenLen: t.length };
  for (const d of [1, 2]) {
    const date = jstDay(d);
    try {
      const r = await fetch(`https://api.line.biz/v2/bot/insight/followers?date=${date}`, {
        headers: { Authorization: `Bearer ${t}` }, cache: 'no-store',
      });
      const body = await r.json().catch(() => ({}));
      out[`d${d}`] = {
        date, http: r.status, apiStatus: body?.status ?? null,
        hasTargetedReaches: body?.targetedReaches != null,
        hasFollowers: body?.followers != null,
        targetedReaches: body?.targetedReaches ?? null,
        message: body?.message ?? null,
      };
    } catch (e) {
      const err = e as { message?: string; cause?: { message?: string; code?: string; errno?: number } };
      out[`d${d}`] = {
        date, thrown: String(err?.message).slice(0, 120),
        causeMsg: String(err?.cause?.message ?? '').slice(0, 200),
        causeCode: err?.cause?.code ?? null,
      };
    }
  }
  // 對照探針：確認是「LINE 這個 host 不通」還是「整體 outbound 不通」
  for (const [k, u] of [['probeLine', 'https://api.line.biz/'], ['probeKit', 'https://api.convertkit.com/']]) {
    try {
      const r = await fetch(u, { cache: 'no-store' });
      out[k] = { http: r.status };
    } catch (e) {
      const err = e as { message?: string; cause?: { message?: string; code?: string } };
      out[k] = { thrown: String(err?.message).slice(0, 80), causeMsg: String(err?.cause?.message ?? '').slice(0, 160), causeCode: err?.cause?.code ?? null };
    }
  }
  return Response.json(out);
}
