import { NextRequest, NextResponse } from 'next/server';

/**
 * HTTP Basic Auth 存取控制（2026-07-01，B 層評估 D1 / RCF-118）
 *
 * WHY：SYS-07 儀表板 server-render 公開顯示財務摘要（FinancePanel）+ 未收款追蹤（客戶代號）
 * 等敏感營運資料，卻無任何存取控制（curl 200、無 gate）。與 SYS-08 知識庫 2026-06-27 補
 * Basic Auth 前的暴露同型——SYS-08 補 auth 時漏了顯示更敏感資料的本站。此 middleware 補平。
 *
 * 設定：在 Vercel 專案 Environment Variables 設 BASIC_AUTH_USER + BASIC_AUTH_PASSWORD（Tim 自設）。
 * Fail-closed：未設定 env var → 一律 503，強制設定後才開放，避免「以為有保護其實沒設」。
 * 全站 gate：/api/* 亦一併保護（add-entry 有自身 PIN，UI 登入後瀏覽器自動帶 auth；無外部程式呼叫）。
 * 可逆：移除本檔即還原為公開站。
 */

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};

export function middleware(req: NextRequest) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPass = process.env.BASIC_AUTH_PASSWORD;

  // Fail-closed：尚未設定帳密 env var → 拒絕
  if (!expectedUser || !expectedPass) {
    return new NextResponse('存取控制尚未設定（BASIC_AUTH_USER / BASIC_AUTH_PASSWORD）', {
      status: 503,
    });
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      // UTF-8 安全解碼（支援中文等非 ASCII 密碼）
      const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
      const decoded = new TextDecoder().decode(bytes);
      const sep = decoded.indexOf(':'); // 帳號不含冒號、密碼可含 → 取首個冒號分隔
      const user = decoded.slice(0, sep);
      const pass = decoded.slice(sep + 1);
      if (user === expectedUser && pass === expectedPass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse('需要登入', {
    status: 401,
    // realm 必須 ASCII（HTTP header 不可含非 Latin-1）；charset=UTF-8 提示以 UTF-8 送帳密
    headers: { 'WWW-Authenticate': 'Basic realm="TZLTH-HQ Dashboard", charset="UTF-8"' },
  });
}
