/**
 * GA4 Data API 自動抓取
 * 使用 Google Service Account 驗證，無需手動授權
 *
 * 需要的 Vercel 環境變數：
 *   GOOGLE_ANALYTICS_PROPERTY_ID  — GA4 數字 Property ID（非 G-XXXXXX，是純數字）
 *   GOOGLE_SERVICE_ACCOUNT_JSON   — Service Account JSON 整份貼成一行
 */

import { GoogleAuth } from 'google-auth-library';

export interface DiagnosisGA4Data {
  diagnoseStarted: number;
  diagnoseCompleted: number;
  upsellClicked: number;
  completeRate: string;   // "診斷完成 / 診斷開始" 百分比
  convRate: string;       // "升級點擊 / 診斷完成" 百分比
  period: string;         // e.g. "過去 7 天"
}

export interface WebsiteGA4Data {
  sessions: number;
  users: number;
  pageViews: number;
  period: string;
}

export async function getWebsiteGA4Data(): Promise<WebsiteGA4Data | null> {
  // 官網使用獨立的 Property ID（G-TK8D1DX7MJ 對應的數字 ID）
  const propertyId = process.env.WEBSITE_GA4_PROPERTY_ID || process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
  const credJson   = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!propertyId || !credJson) return null;
  try {
    const credentials = JSON.parse(credJson);
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
    if (!res.ok) return null;
    const data = await res.json();
    const row = data.rows?.[0];
    if (!row) return null;
    return {
      sessions:  parseInt(row.metricValues?.[0]?.value ?? '0', 10),
      users:     parseInt(row.metricValues?.[1]?.value ?? '0', 10),
      pageViews: parseInt(row.metricValues?.[2]?.value ?? '0', 10),
      period: '過去 7 天',
    };
  } catch {
    return null;
  }
}

export async function getDiagnosisGA4Data(): Promise<DiagnosisGA4Data | null> {
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID;
  const credJson   = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!propertyId || !credJson) return null;

  try {
    const credentials = JSON.parse(credJson);

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;
    if (!token) return null;

    const res = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          metrics: [{ name: 'eventCount' }],
          dimensions: [{ name: 'eventName' }],
          dimensionFilter: {
            filter: {
              fieldName: 'eventName',
              inListFilter: {
                values: ['diagnose_started', 'diagnose_completed', 'upsell_clicked'],
              },
            },
          },
        }),
        next: { revalidate: 3600 }, // 每小時更新
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const rows: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }> =
      data.rows ?? [];

    const eventMap: Record<string, number> = {};
    for (const row of rows) {
      const name  = row.dimensionValues?.[0]?.value ?? '';
      const count = parseInt(row.metricValues?.[0]?.value ?? '0', 10);
      eventMap[name] = count;
    }

    const started   = eventMap['diagnose_started']   ?? 0;
    const completed = eventMap['diagnose_completed']  ?? 0;
    const upsell    = eventMap['upsell_clicked']      ?? 0;

    const completeRate = started > 0
      ? `${Math.round((completed / started) * 100)}%`
      : '—';
    const convRate = completed > 0
      ? `${Math.round((upsell / completed) * 100)}%`
      : '—';

    return {
      diagnoseStarted: started,
      diagnoseCompleted: completed,
      upsellClicked: upsell,
      completeRate,
      convRate,
      period: '過去 7 天',
    };
  } catch {
    return null;
  }
}
