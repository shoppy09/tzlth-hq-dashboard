@AGENTS.md

# 總部儀表板 - 操作規則

## 系統定位
職涯停看聽的數據指揮中心。即時顯示所有系統狀態、任務清單、數據摘要，讓 Tim 一個畫面掌握全局。

## 角色說明
你是這個 Next.js 儀表板的開發維護者。確保顯示的數據是最新的、功能正常、各系統狀態準確。

## 技術架構
- Framework：Next.js + TypeScript
- 部署：Vercel（hq-dashboard-alpha.vercel.app）
- 資料來源：讀取本機 tzlth-hq/ 各 Markdown 檔案 + GA4 API + Threads API
- 指令中心：Google Gemini 2.5 Flash（GOOGLE_API_KEY；2026-06-01 自 2.0-flash 遷移——2.0 已停用；⚠️ 2.5-flash 2026-10-16 退場，遷移追蹤 tzlth-hq RCF-123 / tasks L322）

## Vercel 環境變數清單
| 變數名稱 | 用途 | 最後更新 |
|---------|------|---------|
| GITHUB_TOKEN | 讀取 GitHub 私有 repo | 2026-04-11 |
| GOOGLE_API_KEY | Gemini 指令中心 | 2026-04-13 |
| KIT_API_KEY | Kit 訂閱者數 | 2026-04-12 |
| LINE_CHANNEL_ACCESS_TOKEN | LINE 粉絲數 | 2026-04-12 |
| GOOGLE_ANALYTICS_PROPERTY_ID | GA4 診斷系統 Property ID（532491434）| 2026-04-12 |
| WEBSITE_GA4_PROPERTY_ID | GA4 官網 Property ID（530451281）| 2026-04-12 |
| GOOGLE_SERVICE_ACCOUNT_JSON | GA4 Service Account（授權兩個 GA4 Property）| 2026-04-12 |
| BOOKING_STATS_URL | 預約系統 /api/stats（預約 KPI 來源）| 2026-04-12 |

---
## ⚡ 跨視窗同步協議（最高優先規則）

> 所有對話視窗共用檔案系統。**文件是各視窗之間唯一的共用記憶。**

### 收尾七件事（每次對話結束前必做，2026-07-02 指針化 RCF-120）
收尾完整規則詳見**總部 CLAUDE.md →「核心原則零：收尾七件事」**（7 步驟：git push / 最近修改記錄 / tasks.md / inventory.json / daily-log / reflection-log / 品質自查 HARD STOP / 未完成清單 HARD STOP）。
**本 repo 部署特例（步驟 0）**：程式碼修改＝`npm run build` → git push → `npx vercel --prod` 三步缺一不可；純文件修改 push 即可。
**步驟 1 提醒**：「更新本文件最近修改記錄」= 更新本 CLAUDE.md 的「最近修改記錄」表格。

> 未完成收尾七件事 = 任務未完成。未 push + deploy = 儀表板看不到。

### 最近修改記錄

| 日期 | 修改內容 | 執行視窗 | 狀態 |
|------|---------|---------|------|
| 2026-07-06 | 全系統盤點 G-07-1 修正：L15 指令中心記載 2.0 Flash→2.5 Flash（實裝 06-01 已遷移，文件漂移 35 天）＋補登 4-7 月缺席修改記錄 4 筆（下列 ↓）| 總部視窗 | ✅ |
| 2026-07-02 | （補登）A-durable：page.tsx 3 處改讀 social/metrics.json SoT（原直讀 inventory 鏡像欄，RCF-117）＋ npx vercel --prod | 總部視窗 | ✅ |
| 2026-07-01 | （補登）RCF-118 B-pre：middleware.ts 全站 HTTP Basic Auth（fail-closed，commit cd9b2dd）；07-02 部署+curl 401 驗證 | 總部視窗 | ✅ |
| 2026-06-01 | （補登）Gemini 指令中心 2.0-flash→2.5-flash 遷移（2.0 停用，commit 2383d1e→b354043）| 總部視窗 | ✅ |
| 2026-05-24 | （補登）FinancePanel 整合（finance.careerssl.com/api/summary，FINANCE_SUMMARY_API_KEY）| 總部視窗 | ✅ |
| 2026-07-02 | 收尾規則指針化（RCF-120 D6）：舊「收尾四/五件事」清單 → 總部 CLAUDE.md 收尾七件事指針式（部署特例保留在地）；消除與主檔的版本漂移 | 總部視窗 | ✅ |
| 2026-04-13 | 新增知識庫區塊（#knowledge，GitHub 4 資料夾，methodology/operations 顯示全文，decisions/reference 顯示清單）| 總部視窗 | ✅ |
| 2026-04-13 | 導航列新增「知識庫」按鈕（layout.tsx）| 總部視窗 | ✅ |
| 2026-04-13 | 新增指令中心（Gemini 2.0 Flash，6 預設指令）| 總部視窗 | ✅ |
| 2026-04-13 | UI 全面優化（快速連結列、系統卡片 URL、並排雙欄）| 總部視窗 | ✅ |
| 2026-04-12 | GA4 Service Account 整合完成（自動抓取診斷事件數據）| 總部視窗 | ✅ |
| 2026-04-17 | 補齊環境變數清單：新增 WEBSITE_GA4_PROPERTY_ID + BOOKING_STATS_URL；修正 GOOGLE_ANALYTICS_PROPERTY_ID 值（530451281→532491434）| 總部視窗 | ✅ |
| 2026-04-12 | 新增 KIT_API_KEY + LINE_CHANNEL_ACCESS_TOKEN | 總部視窗 | ✅ |

---
## 總部連結（TZLTH-HQ）
- 系統代號：SYS-07
- 總部路徑：C:\Users\USER\Desktop\tzlth-hq
- HQ 角色：這個系統本身就是總部的對外顯示介面。
- 存檔規定：部署更新後 Vercel 自動同步，無額外存檔需求
