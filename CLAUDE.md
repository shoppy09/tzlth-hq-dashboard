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
- 指令中心：Google Gemini 2.0 Flash（GOOGLE_API_KEY）

## Vercel 環境變數清單
| 變數名稱 | 用途 | 最後更新 |
|---------|------|---------|
| GITHUB_TOKEN | 讀取 GitHub 私有 repo | 2026-04-11 |
| GOOGLE_API_KEY | Gemini 指令中心 | 2026-04-13 |
| KIT_API_KEY | Kit 訂閱者數 | 2026-04-12 |
| LINE_CHANNEL_ACCESS_TOKEN | LINE 粉絲數 | 2026-04-12 |
| GOOGLE_ANALYTICS_PROPERTY_ID | GA4 數據（530451281）| 2026-04-12 |
| GOOGLE_SERVICE_ACCOUNT_JSON | GA4 Service Account | 2026-04-12 |

---
## ⚡ 跨視窗同步協議（最高優先規則）

> 所有對話視窗共用檔案系統。**文件是各視窗之間唯一的共用記憶。**

### 每次完成任何修改後，必須執行收尾四件事：
1. **更新本文件「最近修改記錄」**（見下表）
2. **更新總部任務清單**：`C:\Users\USER\Desktop\tzlth-hq\dev\tasks.md`
3. **更新每日日誌**：`C:\Users\USER\Desktop\tzlth-hq\reports\daily-log.md`
4. **寫入反思日誌**：`C:\Users\USER\Desktop\tzlth-hq\reports\reflection-log.md`（有實質改善價值才寫）

> 未完成收尾四件事 = 任務未完成。

### 最近修改記錄

| 日期 | 修改內容 | 執行視窗 | 狀態 |
|------|---------|---------|------|
| 2026-04-13 | 新增知識庫區塊（#knowledge，GitHub 4 資料夾，methodology/operations 顯示全文，decisions/reference 顯示清單）| 總部視窗 | ✅ |
| 2026-04-13 | 導航列新增「知識庫」按鈕（layout.tsx）| 總部視窗 | ✅ |
| 2026-04-13 | 新增指令中心（Gemini 2.0 Flash，6 預設指令）| 總部視窗 | ✅ |
| 2026-04-13 | UI 全面優化（快速連結列、系統卡片 URL、並排雙欄）| 總部視窗 | ✅ |
| 2026-04-12 | GA4 Service Account 整合完成（自動抓取診斷事件數據）| 總部視窗 | ✅ |
| 2026-04-12 | 新增 KIT_API_KEY + LINE_CHANNEL_ACCESS_TOKEN | 總部視窗 | ✅ |

---
## 總部連結（TZLTH-HQ）
- 系統代號：SYS-07
- 總部路徑：C:\Users\USER\Desktop\tzlth-hq
- HQ 角色：這個系統本身就是總部的對外顯示介面。
- 存檔規定：部署更新後 Vercel 自動同步，無額外存檔需求
