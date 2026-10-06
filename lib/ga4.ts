/**
 * GA4 Data API 自動抓取
 * 使用 Google Service Account 驗證，無需手動授權
 *
 * 需要的 Vercel 環境變數：
 *   WEBSITE_GA4_PROPERTY_ID       — 官網 GA4 數字 Property ID（非 G-XXXXXX，是純數字）；未設＝官網卡不顯示
 *   GOOGLE_SERVICE_ACCOUNT_JSON   — Service Account JSON 整份貼成一行
 */

import { GoogleAuth } from 'google-auth-library';

/**
 * Vercel 環境變數貼上 JSON 時，private_key 可能含有字面換行符（0x0A）
 * 導致 JSON.parse 拋出 SyntaxError。
 * 此函式先嘗試直接 parse；失敗時將字面換行轉為 \n 再 parse。
 */
function safeParseCredentials(credJson: string) {
  try {
    return JSON.parse(credJson);
  } catch {
    // private_key 含字面換行 → 先 escape 再 parse
    return JSON.parse(credJson.replace(/\n/g, '\\n'));
  }
}


export interface WebsiteGA4Data {
  sessions: number;
  users: number;
  pageViews: number;
  period: string;
}

export async function getWebsiteGA4Data(): Promise<WebsiteGA4Data | null> {
  // 官網使用獨立的 Property ID（G-TK8D1DX7MJ 對應的數字 ID）
  // 2026-10-06 拿掉 GOOGLE_ANALYTICS_PROPERTY_ID 備援：那是診斷的 Property，退回時會把診斷資料當官網資料顯示。
  // 官網 ID 未設 → 回 null（卡片顯示無資料），不顯示錯的數字。
  const propertyId = process.env.WEBSITE_GA4_PROPERTY_ID;
  const credJson   = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!propertyId || !credJson) return null;
  try {
    const credentials = safeParseCredentials(credJson);
    const auth = new GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;
    if (!token) return null;
    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'screenPageViews' }],
        }),
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[GA4 website] HTTP ${res.status}: ${errText.slice(0, 300)}`);
      return null;
    }
    const data = await res.json();
    const row = data.rows?.[0];
    if (!row) {
      console.error(`[GA4 website] No rows returned. propertyId=${propertyId}`);
      return null;
    }
    return {
      sessions:  parseInt(row.metricValues?.[0]?.value ?? '0', 10),
      users:     parseInt(row.metricValues?.[1]?.value ?? '0', 10),
      pageViews: parseInt(row.metricValues?.[2]?.value ?? '0', 10),
      period: '過去 7 天',
    };
  } catch (e) {
    console.error('[GA4 website] exception:', e);
    return null;
  }
}

// 2026-09-09 移除 getDiagnosisGA4Data（打診斷 GA4 property 532491434）：
// AI 履歷診斷 technical retirement 完成，唯一消費者診斷 KpiCard 已拆除。
// 比照 lib/github.ts 既有慣例，留碑不留碼；歷史資料仍在 GA4 property 內。
// 同批移除其專屬型別 DiagnosisGA4Data。
// 2026-10-06：getWebsiteGA4Data 已不再以 GOOGLE_ANALYTICS_PROPERTY_ID 為備援，本 repo 程式碼不再讀這個 env；
// 要不要從 Vercel 刪除由 Tim 決定（不刪無影響）。
