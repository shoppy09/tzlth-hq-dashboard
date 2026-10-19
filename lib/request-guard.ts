// 寫入／花錢類 API 的跨站請求防護（2026-10-19 HQ 批次:B63，資安稽核 10-17 C-9／第五節；照看板 lib/request-guard.js，10-18 上線）
//
// WHY：全站有 Basic Auth（middleware.ts），但瀏覽器登入過後，別的網站的表單可能讓瀏覽器帶著登入狀態送請求進來。
//      route 原本直接 req.json()、不看 Content-Type ⇒ text/plain 表單也能送進 JSON 內容。
// 兩道：
//   ① 同源：帶了 Origin 就必須等於本次請求的主機（Host 或 x-forwarded-host）。不寫死網址，任何部署網址都能用。
//      ⛔ 不帶 Origin 一律放行（仍要先過 Basic 登入）——LINE Bot 開放圖書館從伺服器端呼叫 /api/ask 不帶 Origin
//      （2026-10-19 本機 Node 24 fetch 實測），改成「必須帶 Origin」會把它擋掉。
//   ② 只收 JSON：跨站表單只能送 urlencoded／multipart／text/plain，送 application/json 一定要先預檢，本站不回應跨站預檢。
// 通過回 null；不通過回 403／415 的 Response，呼叫端直接 return。
export function guard(req: Request): Response | null {
  const origin = req.headers.get('origin');
  if (origin) {
    let host = '';
    try {
      host = new URL(origin).host.toLowerCase();
    } catch {
      return Response.json({ error: 'Forbidden（跨站請求）' }, { status: 403 }); // 含 Origin: null
    }
    const hosts = [req.headers.get('host'), req.headers.get('x-forwarded-host')]
      .filter((h): h is string => Boolean(h))
      .flatMap((h) => h.split(',').map((s) => s.trim().toLowerCase()));
    if (!hosts.includes(host)) {
      return Response.json({ error: 'Forbidden（跨站請求）' }, { status: 403 });
    }
  }
  if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) {
    return Response.json({ error: '只接受 application/json' }, { status: 415 });
  }
  return null;
}
