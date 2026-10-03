# 最近修改記錄全文封存 — 2026-10

> 雙層制（RCF-175）：主檔只放摘要列，完整敘事寫在這裡（newest-first）。

| 日期 | 修改內容 | 執行視窗 | 狀態 |
|------|---------|---------|------|
| 2026-10-03 | 【SYS-07】**說明書九章化逐條反查（tzlth-hq「說明書格式推廣其餘系統」L119，RCF-187 第 7 份；Tim「照建議，執行」＋5 版查照）**：① `app/page.tsx` 部門清單寫死 12 個（缺 EDU／GRW／IAUD／EAUD，產品部仍寫「診斷」）→ 補成 16 個、產品部改「預約・電子書」，並加註「寫死副本、部門增減要回來改」② `lib/github.ts` getFollowerHistory 註解「auto-fetch.bat」（該機制 2026-05 已棄用，RCF-092）→ 改指 HQ `fetch-threads.yml`，並註明備援檔 `social/followers-history.json` 停在 04-12 ③ 本檔「資料來源：讀取本機 tzlth-hq」→ 實為 GitHub Contents API 讀線上 main，另回寫兩個狀態檔 ④ 部署網址補正式域 ⑤ env 表重建 8→12 列（`vercel env ls`＋`git grep`），標 Config／Secret 型別（Vercel 2026-08-24 changelog：Config 可被讀回明文，5 個憑證類為 Config，交 Tim）⑥ 憑證消失舊註更正為已恢復 ⑦ 新增「讀取點增減 → 同步說明書 §C」維護觸發。最舊一列（2026-04-13 新增指令中心）逐字移入本檔底部。驗證：`npm run build` 通過；部署後 `/api/version`＋Chrome 桌機／手機寬度實看＋charters 回歸清單 ①②③⑤，驗證檔 tzlth-hq `dev/deploy-verify/SYS-07-2026-10-03-dept-list.md` | tzlth-hq | ✅ |
| 2026-10-01 | 【SYS-07】tzlth-hq 組 3＋19 L1106／L1105：`setChecklistKey`（比照 `setTimActionKey`）、route 參數驗證＋502、`DailyChecklist` 掛載後解析、週六日＋月底（25 日起）＋月初（1-5 日）、`段落-djb2` id、`<!-- ws: -->` 剝除、點過不被載入讀取覆蓋（`a22da4b`，線上驗證順查）；`parse-tasks` 收 `[~]`；刪 `page.tsx` 例行卡。驗證：本機 11 日期解析＋失敗路徑＋375 手機；線上勾選 `2f9bc2ad`／取消 `28c488f5`、回歸 ①～⑥。tzlth-hq `dev/deploy-verify/SYS-07-2026-10-01-daily-checklist.md` | tzlth-hq 組 3＋19 | ✅ |
| 2026-04-13 | 新增指令中心（Gemini 2.0 Flash，6 預設指令）| 總部視窗 | ✅ |
