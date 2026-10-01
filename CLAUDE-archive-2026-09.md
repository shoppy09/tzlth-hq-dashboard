# CLAUDE.md 修改記錄全文封存（2026-09）

> RCF-175 雙層制（總部 CLAUDE.md 規則）：主檔 `CLAUDE.md`「最近修改記錄」只放 ≤300 字元摘要列，完整敘事在此。newest-first。
> 2026-09-28 首建（總部收尾檢查 `check_claude_record_bloat` 系統 repo 守門提示）。

| 日期 | 修改內容 | 執行視窗 | 狀態 |
|------|---------|---------|------|
| 2026-09-30 | 【DEV】**Tim 待辦面板改版（tzlth-hq 組 3 L1204／RCF-216）**：Tim 回報「勾選跟沒勾選都沒什麼差異」→ 診斷四病：勾了沒下游（HQ 讀取者 0）、清單不更新、例行項布林勾一次永遠是勾、寫入失敗被吞（`.catch(() => {})`、PUT 不檢查）＋前端送整份狀態會互蓋。改：`lib/github.ts` `setTimActionKey()` 伺服器端只改被點的 key（讀最新 sha、409 重試一次、失敗拋錯），勾選值改存勾選時間；`/api/tim-actions-state` POST 改收 `{key, checked}`（key 格式驗證，失敗 502）；`TimActions.tsx` 顯示 🟡 已回報／🔴 上次確認原因／👉 怎麼做＋前往／說明收合／未同步＋重試／清單更新日／例行項按台灣月份／最近 7 天確認；`page.tsx` 傳 `updated_at`。上線前本機預覽（測試帳密＋不提交預覽頁）截圖給 Tim，Tim 回「上線」→ `5b65568`；線上勾選 ta-013 寫入（HQ `6b0f89d8`）→ 真實滑鼠取消（`08dfec78`）；外稽回歸 ①～⑥ 通過；`tzlth-hq/dev/deploy-verify/SYS-07-2026-09-30-tim-actions.md` ✅。⚠️ 線上手機未實測（本機 375 寬同版模擬代之）；頁面剛載入時點勾選不會反應（刻意停用至前端接手） | tzlth-hq（組 3） | ✅ |
| 2026-09-28 | 【DEV/FIN】**四項（HQ tasks L192②／L716／L586／L191；commit `fc14cf1`）**：① **移除 external-revenue 入口**：刪 `app/api/finance/add-entry/route.ts`、`components/FinanceInput.tsx`，財務面板拿掉「新增記錄」「歷史記錄」Tab 與概覽「手動補充」區塊，`lib/finance.ts` 刪 FinanceEntry／FinanceData／MonthGroup／computeMonthlyTotals／groupByMonth，`lib/github.ts` 刪 getExternalRevenue（全數 grep 0 殘留）。依據＝`finance/external-revenue.json` 建檔（04-24）至今 0 筆、不進 `/api/summary`。⚠️ 執行中發現 HQ RCF-122 規定機構案 going-forward 記此檔、且月底結帳會讀它進月報；本 repo 的移除不牴觸（RCF-122 為 Claude 直接寫入），HQ 側去留交 Tim 重裁。② **ledger 跨年讀取**：`getIncomeLedger／getExpenseLedger` 原硬編 `*-2026.json`，2027 起看不到新資料 → `fetchLedgerYears` 讀 2026 起各年度檔合併（客戶穿透視圖為全期視圖，只讀近兩年會在 2028 丟掉承載 2024-26 歷史的 2026 檔）；缺檔視為空、**全部讀不到才拋錯**（否則 GitHub 故障時趨勢圖畫出一排 0）；回傳型別不變，兩呼叫端零改動；`LedgerFile.year` 改選填。③ **公開 `/api/version`**：`{commit 7 碼, node 大版本, region}`，middleware 在 env 檢查之前以精確路徑放行（全站 Basic Auth 唯一例外；`/` 401、`/api/version/x` 401）；部署後自報 `fc14cf1`。④ 25 日月報 banner 改「請執行「月底結帳」（收入＋支出＋訂閱核對）」| Claude Code | ✅ |
| 2026-04-12 | 新增 KIT_API_KEY + LINE_CHANNEL_ACCESS_TOKEN | 總部視窗 | ✅ |
| 2026-04-12 | GA4 Service Account 整合完成（自動抓取診斷事件數據）| 總部視窗 | ✅ |
