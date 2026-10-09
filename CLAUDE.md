@AGENTS.md

# 總部儀表板 - 操作規則

## 系統定位
職涯停看聽的數據指揮中心。即時顯示所有系統狀態、任務清單、數據摘要，讓 Tim 一個畫面掌握全局。

## 角色說明
你是這個 Next.js 儀表板的開發維護者。確保顯示的數據是最新的、功能正常、各系統狀態準確。

## 技術架構
- Framework：Next.js + TypeScript
- 部署：Vercel，正式網址 **dashboard.careerssl.com**（`hq-dashboard-alpha.vercel.app` 為 Vercel 備援網域）；版本自報 `/api/version`（全站 Basic Auth 的唯一例外）（2026-10-03 更正；架構全貌見 tzlth-hq `projects/SYS-07-hq-dashboard.md`）
- 資料來源：**經 GitHub Contents API 讀 `shoppy09/tzlth-hq`（線上 main，非本機）**＋看板 repo `follower-history.json`＋官網 repo 排程文章＋GA4／LINE／Kit／預約 stats／財務 summary 五個外部 API；另**回寫** tzlth-hq 兩個狀態檔（`dev/daily-checklist-state.json`、`dev/tim-actions-state.json`）。逐項讀寫契約見說明書 §C（2026-10-03 更正；架構全貌見 tzlth-hq `projects/SYS-07-hq-dashboard.md`）
- ⛔ **新增或移除任何 HQ 讀取點／回寫點 → 同步更新說明書 §C**（說明書的維護觸發點；否則 §C 會像本檔 04-11 版一樣默默漂移）
- ⛔ **指令中心已於 2026-09-09 移除**（Tim 裁決：總部定位＝資訊集合體，不是問答介面）：本 repo 自此**無任何 LLM 依賴**，`@google/genai` 已 uninstall，儀表板隨之退出 tzlth-hq `批次:B5` 的 2026-10-16 Gemini 遷移母體。決策全文＝RCF-123 補記四；自由問答需求改由 LINE Bot「隨身總部包 B」承接（RCF-139 補記二）。

## Vercel 環境變數清單
> 2026-10-03 依 `vercel env ls`（只看名稱）＋程式碼 `git grep process.env` 重建：Vercel 上 12 個名稱＝程式讀的 11 個＋已無消費者的 `GOOGLE_API_KEY`（另 `VERCEL_GIT_COMMIT_SHA`／`VERCEL_REGION` 為平台自帶）。原表漏 4 個（BASIC_AUTH ×2、BOOKING_STATS_KEY、FINANCE_SUMMARY_API_KEY）。⛔ 只記名稱、不記值（RCF-111）；憑證清冊 SoT＝tzlth-hq `security/security-log.md`。
> ⚠️ 型別：Vercel 2026-08-24 起分 **Config**（有專案權限者可在主控台／`vercel env pull` 讀回明文）與 **Secret**（存了就讀不回）。下表標「Config」的憑證類 5 個，改成 Secret 須刪除重加（只能用於正式／預覽環境），待 Tim 處理（tzlth-hq tasks P3）。

| 變數名稱 | 用途 | 型別 |
|---------|------|------|
| GITHUB_TOKEN | 讀 tzlth-hq／看板／官網 repo；寫回兩個狀態檔 | Config ⚠️ |
| BASIC_AUTH_USER / BASIC_AUTH_PASSWORD | `middleware.ts` 全站 Basic Auth（未設＝一律 503） | Secret |
| GOOGLE_SERVICE_ACCOUNT_JSON | GA4 Data API 服務帳號 | Config ⚠️ |
| WEBSITE_GA4_PROPERTY_ID | 官網 GA4 Property ID | Config |
| GOOGLE_ANALYTICS_PROPERTY_ID | 原為**診斷** Property ID。2026-10-06 起程式碼不再讀取（`lib/ga4.ts` 已拿掉錯的備援）；只設在 Production，刪不刪由 Tim 決定，不刪無影響 | Config |
| KIT_API_KEY | Kit 訂閱者數（放在網址參數；只在伺服器端呼叫） | Config ⚠️ |
| LINE_CHANNEL_ACCESS_TOKEN | 主 OA 好友數（insight API） | Config ⚠️ |
| BOOKING_STATS_URL / BOOKING_STATS_KEY | 預約後端 `/api/stats`（Bearer） | Config／Secret |
| FINANCE_SUMMARY_API_KEY | 財務 `/api/summary`（Bearer，與財務 `SUMMARY_API_KEY` 同值異名） | Secret |
| ~~GOOGLE_API_KEY~~ | ⛔ 2026-09-09 起零消費者（指令中心移除），刻意暫留；建議由 Tim 於 Vercel 刪除 | Config ⚠️ |

---
## ⚡ 跨視窗同步協議（最高優先規則）

> 所有對話視窗共用檔案系統。**文件是各視窗之間唯一的共用記憶。**

### 收尾七件事（每次對話結束前必做，2026-07-02 指針化 RCF-120）
收尾完整規則詳見**總部 CLAUDE.md →「核心原則零：收尾七件事」**（7 步驟：git push / 最近修改記錄 / tasks.md / inventory.json / daily-log / reflection-log / 品質自查 HARD STOP / 未完成清單 HARD STOP）。
**本 repo 部署特例（步驟 0）**：程式碼修改＝`npm run build` → git push → `npx vercel --prod`。
> 🔴 **2026-08-23 dashboard 實查更正：本 repo 的 Vercel Git auto-deploy 是「開啟」的**（Deployments 列表證每個 commit 皆有 git-source 部署，含**純 docs commit `bf914e5`**）⇒ **`git push` 即觸發部署上線**，`npx vercel --prod` 為加速/備援。原記「三步缺一不可」的第三步不再是唯一途徑。
> ⛔ **但 `npm run build` 仍為 HARD STOP、更不能跳過**：本 repo 是 Next.js，build 失敗時 Vercel **靜默保留舊版**只寄信通知（2026-04-29 事故原型）⇒ 不 build 就 push，會以為上線了其實沒有。
> 總部主檔規則零原載「Vercel GitHub 自動部署永久停用（2026-04-29）」為錯誤通則（該日處置只針對看板一個專案，IMP-088），已於 2026-08-23 改寫為逐 repo 記載（RCF-153）。
> ~~⚠️ 本機 Vercel 憑證已於 2026-08-15～08-22 間消失…待 Tim `vercel login`~~ ✅ 2026-08-23 已重新登入恢復（2026-10-03 `vercel ls`／`vercel env ls` 裸跑可用）
**步驟 1 提醒**：「更新本文件最近修改記錄」= 更新本 CLAUDE.md 的「最近修改記錄」表格。

> 未完成收尾七件事 = 任務未完成。未 push + deploy = 儀表板看不到。

### 最近修改記錄

| 日期 | 修改內容 | 執行視窗 | 狀態 |
|------|---------|---------|------|
| 2026-10-09 | 客戶頁來源標籤加 `PRG: 合作計劃`、`104: 104 平台`（`34dfc48`；HQ RCF-234）。桌機線上核對 46 位：合作計劃 14／104 平台 3／其他 1；手機待 Tim 目視（HQ ta-024），HQ inventory 暫為 deployed_unverified。詳 archive | Claude Code（HQ） | ⏳ |
| 2026-10-06 | 【SYS-07】**近期內容排程重寫＋GA4 錯的備援移除**（tzlth-hq 組 H，Tim「執行」）：解析移至 `lib/content-calendar.ts`，依表頭取欄、續表沿用表頭、台北日期，改顯示平台不顯示狀態；今天 434 列誤顯示→37 列。詳 archive | 總部視窗 | ✅ |
| 2026-10-03 | 【SYS-07】**說明書九章化反查（tzlth-hq RCF-187 第 7 份）**：部門清單 12→16、`github.ts` 舊註解、本檔技術架構／env 表 8→12 列（含 Config 型警示）＋讀取點維護觸發行。全文見 `CLAUDE-archive-2026-10.md` | tzlth-hq | ✅ |
| 2026-10-01 | 【SYS-07】**今日任務清單可用性修正（RCF-218）**：寫入單格＋失敗退回提示、星期改瀏覽器端、補週六日與月初月底、id 改內容雜湊、剝除 ws 標記、刪寫死例行卡；P2 進行中標籤。`a4792c5`＋`a22da4b` live | tzlth-hq 組 3＋19 | ✅ |
| 2026-09-30 | 【DEV】**Tim 待辦面板改版（HQ 組 3 L1204／RCF-216）**：勾選＝🟡 已回報、寫入只改單一項並檢查結果、失敗提示與重試、清單更新日、例行項按月、最近確認區；線上勾選→寫入→取消實測、回歸 ①～⑥ 通過。詳 archive | tzlth-hq（組 3） | ✅ |
| 2026-09-28 | 【DEV/FIN】**四項（HQ L192②／L716／L586／L191）**：移除 external-revenue 入口與財務面板兩個 Tab；ledger 改讀 2026 起各年度檔（原硬編 2026）；公開 `/api/version`（Basic Auth 唯一例外）；25 日 banner 點名月底結帳。詳 `CLAUDE-archive-2026-09.md` | Claude Code | ✅ |
| 2026-09-24 | 【DEV】新增 `.gitattributes`：文字檔一律以 LF 存入 repo、二進位檔明列不轉換（總部批次:B28／RCF-198 統一推送）。本 repo renormalize 零檔變動（index 原本即全為 LF）；零程式碼改動 | tzlth-hq（批次:B28） | ✅ |
| 2026-09-09 | ⛔ **診斷退場下游清理：刪診斷 KpiCard ＋ 拆整條 GA4 孤兒鏈 ＋ retired 不計入健康度**（tzlth-hq 批次:B5，診斷 technical retirement 同批）：🔴 **只刪卡會 build 失敗**——grep 實證 `getGA4Log`／`getDiagnosisGA4Data`／`GA4WeekRow`／`parseGA4Log`／`ga4Md`／`ga4Live`／`ga4Row` 七者**除診斷卡外零消費者**，留著就是七個 unused。同批拆乾淨，並比照 2026-08-17 `getOutreachLog` 前例在 `lib/github.ts`／`lib/ga4.ts` 留碑不留碼（含 `DiagnosisGA4Data` 型別）。⚠️ **`GOOGLE_ANALYTICS_PROPERTY_ID` 不可刪**：`getWebsiteGA4Data` 仍以它為 `WEBSITE_GA4_PROPERTY_ID` 的 fallback，刪了哪天主 env 出事官網卡會靜默改讀診斷 property（已在 `lib/ga4.ts` 留註解）。📌 **`retired` 的處理取「篩選」不取「抹值」**：`health_score` 保留退場當下的 2（歷史事實），新增 `activeSystems` 過濾器——因 `lib/types.ts` 的 `health_score` 是 `number` 非 `number|null`，改型別會連累 `SystemCard` 的 `HealthSegments`。⚠️ **本列曾被自己的工具吃掉**：上一版用 bash 雙引號字串寫入，其中的反引號被 shell 當成命令替換，16 個識別字全被執行成空字串（commit 47c12df）——IMP-047 家族：**反引號與反斜線一樣，不該由 bash 命令字串承載**，已改用 Write 工具落檔重寫。驗收：build ✅ 7/7 static、`ƒ Proxy` 在。 | 總部視窗 | ✅ |
| 2026-09-09 | ⛔ **指令中心移除（Tim 裁決，5 輪 rigor gate）**：刪 `app/api/command/`（107 行）＋`components/CommandCenter.tsx`（205 行），`page.tsx`／`layout.tsx`／`globals.css` 三處各留一行「為何刪」，`npm uninstall @google/genai`。**理由不是它壞了，是需求不存在**——總部定位＝資訊集合體，各資料卡本身即交付物；自由問答它做得比 Claude Code 弱、比 LINE Bot 遠（後者正在建「隨身總部包 B」）。🔴 **`npm run build` 抓到 5 輪掃描沒抓到的東西**：`highlight` 是**只有被刪那個 nav 項在用**的可選屬性 ⇒ 刪掉後 TS 推斷型別不含它，`layout.tsx:84-90` 四處 `item.highlight` 全部編譯失敗。⇒ 靜態掃描找得到「誰引用了 X」，找不到「X 消失後型別會塌」——**這正是 build 為 HARD STOP 的理由**。修法取顯式型別註記（保留 nav 強調能力）而非刪渲染邏輯，爆炸半徑最小。驗收：build ✅ 路由表**無** `/api/command`、`ƒ Proxy (Middleware)` 仍在（Basic Auth 未破）、7/7 static。⚠️ `GOOGLE_API_KEY` **刻意暫留**（見上表）。 | 總部視窗 | ✅ |
| 2026-08-30 | 🔴 **LINE 卡「自動」路徑首次生效——真根因是主機名不是日期**（HQ tasks L781）：原碼 host 寫 `api.line.biz`，runtime 實測 `getaddrinfo ENOTFOUND`（同 runtime 打 `api.convertkit.com` 回 200 ⇒ 非 outbound 問題）；LINE Messaging API 官方 host 為 **`api.line.me`**。⚠️ 同組雙 bug（host＋Insight T-1 日期）**2026-07-06 已在 tzlth-hq `scripts/update-social-metrics.py` 修過**，本支漏修、潛伏 55 天（期間靜默 fallback 到 metrics.json，只有一個「手動」小字為證）。**三層全修**：① host ② 日期改 JST-1、unready 退 JST-2 ③ **口徑定案 targetedReaches**（＝OA Manager「好友」；followers 含已封鎖者對外虛高）。同族順修 3 處 UTC-當本地日：`page.tsx` 月報提醒（裸 getDate/getMonth 在 Vercel=UTC）／`DailyChecklist` storageKey（台灣 08:00 跳日致已勾選項消失）／`TimActions` 逾期判定。**已驗證本就正確、未動**：`layout.tsx` L29-32、`page.tsx` L455、`lib/github.ts` L181、`FinanceInput.todayTaipei()`、`FinancePanel.currentTaipeiMonth()`。live 驗證：卡片「手動 124」→「**自動 124**」。臨時診斷端點用畢已刪。`npm run build` 通過（8/8）＋auto-deploy。 | 開發部 | ✅ |
| 2026-07-07 | L444 近 6 月收支趨勢 mini 圖（Tim「執行」，A+D+口徑統一）：lib/finance.ts +buildLedgerTrend（ledger 實收制 status='received'，與 SYS-09 /reports、月底結帳月報三方一致；external-revenue 不併入防口徑漂移）+ FinanceTrend.tsx（收/支 bar+淨利，含「完整月報 ↗」連結）+ github.ts getExpenseLedger + FinancePanel/page.tsx 接線。df16d4b build✅→push→vercel Ready；Tim 登入態實測 6 月數字逐月核對全中；另揪既有 bug：本月財務卡顯示 4 月舊數（summary API fallback），記 tzlth-hq tasks P3 | 總部視窗 | ✅ |
| 2026-07-07 | 客戶穿透視圖 /clients v0 上線（B-b 啟動，RCF-125，Tim「執行」）：lib/crm.ts（依 tzlth-hq strategy/customer-360-spec.md 資料契約 parse client-log + income ledger join；營收一律 ledger 即時計算；PII 資料層阻斷只萃取 🟢 欄）+ app/clients/page.tsx（列表/回訪標記/timeline）+ layout nav +客戶 + github.ts 兩 fetcher。be48f4b build✅→push→`npx vercel --prod` Ready；實測 21 客戶/回訪 1/NT$5,550/零 PII/curl 401；deploy-verify SYS-07-2026-07-07 | 總部視窗 | ✅ |
| 2026-07-06 | 全系統盤點 G-07-1 修正：L15 指令中心記載 2.0 Flash→2.5 Flash（實裝 06-01 已遷移，文件漂移 35 天）＋補登 4-7 月缺席修改記錄 4 筆（下列 ↓）| 總部視窗 | ✅ |
| 2026-07-02 | （補登）A-durable：page.tsx 3 處改讀 social/metrics.json SoT（原直讀 inventory 鏡像欄，RCF-117）＋ npx vercel --prod | 總部視窗 | ✅ |
| 2026-07-01 | （補登）RCF-118 B-pre：middleware.ts 全站 HTTP Basic Auth（fail-closed，commit cd9b2dd）；07-02 部署+curl 401 驗證 | 總部視窗 | ✅ |
| 2026-06-01 | （補登）Gemini 指令中心 2.0-flash→2.5-flash 遷移（2.0 停用，commit 2383d1e→b354043）| 總部視窗 | ✅ |
| 2026-05-24 | （補登）FinancePanel 整合（finance.careerssl.com/api/summary，FINANCE_SUMMARY_API_KEY）| 總部視窗 | ✅ |
| 2026-07-02 | 收尾規則指針化（RCF-120 D6）：舊「收尾四/五件事」清單 → 總部 CLAUDE.md 收尾七件事指針式（部署特例保留在地）；消除與主檔的版本漂移 | 總部視窗 | ✅ |
| 2026-04-13 | 新增知識庫區塊（#knowledge，GitHub 4 資料夾，methodology/operations 顯示全文，decisions/reference 顯示清單）| 總部視窗 | ✅ |
| 2026-04-13 | 導航列新增「知識庫」按鈕（layout.tsx）| 總部視窗 | ✅ |
| 2026-04-13 | UI 全面優化（快速連結列、系統卡片 URL、並排雙欄）| 總部視窗 | ✅ |

---
## 總部連結（TZLTH-HQ）
- 系統代號：SYS-07
- 總部路徑：C:\Users\USER\Desktop\tzlth-hq
- HQ 角色：這個系統本身就是總部的對外顯示介面。
- 存檔規定：部署更新後 Vercel 自動同步，無額外存檔需求
