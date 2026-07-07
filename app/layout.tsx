import type { Metadata } from 'next';
import './globals.css';
import { RefreshButton } from '@/components/RefreshButton';
import { SidebarNav } from '@/components/SidebarNav';

export const metadata: Metadata = {
  title: '職涯停看聽 總部',
  description: 'TZLTH-HQ 指揮中心',
};

const navItems = [
  { label: '總覽',  href: '#overview' },
  { label: '指令',  href: '#command',     highlight: true },
  { label: '任務',  href: '#tasks' },
  { label: '內容',  href: '#content' },
  { label: '排程文章', href: '#scheduled-articles' },
  { label: '外展',  href: '#outreach' },
  { label: '財務',  href: '#finance' },
  { label: '系統',  href: '#systems' },
  { label: '知識庫', href: '#knowledge' },
  { label: '部門',  href: '#departments' },
  { label: '客戶',  href: '/clients' },
];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Taiwan is UTC+8 (no DST) — Vercel runs on UTC, must offset manually
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const month = now.getUTCMonth() + 1;
  const day   = now.getUTCDate();
  const dow   = WEEKDAYS[now.getUTCDay()];
  const dateStr = `${month}月${day}日・週${dow}`;

  return (
    <html lang="zh-TW">
      <body className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>

        {/* ── 固定頂部導覽 ───────────────────────────────── */}
        <header
          className="sticky top-0 z-40 border-b"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          {/* 最大寬度對齊 sidebar + 內容的外框 */}
          <div className="max-w-[1100px] mx-auto px-4">

            {/* 標題列 */}
            <div className="pt-3 pb-2 flex items-center justify-between">
              <div>
                <div
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: 'var(--accent)', letterSpacing: '0.18em' }}
                >
                  TZLTH-HQ
                </div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  職涯停看聽 總部
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RefreshButton />
                <div className="text-right">
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    蒲朝棟 Tim
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {dateStr}
                  </div>
                </div>
              </div>
            </div>

            {/* 導航列：手機版（lg 以下）保留橫向 pill，桌機版靠 sidebar 導覽 */}
            <div
              className="pb-3 flex gap-1.5 overflow-x-auto lg:hidden"
              style={{ scrollbarWidth: 'none' } as React.CSSProperties}
            >
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="shrink-0 link-pill text-xs font-semibold px-3.5 py-1.5 rounded-full"
                  style={{
                    backgroundColor: item.highlight ? 'var(--accent)' : 'transparent',
                    border: item.highlight ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: item.highlight ? '#ffffff' : 'var(--text-secondary)',
                    textDecoration: 'none',
                  }}
                >
                  {item.highlight ? `⚡ ${item.label}` : item.label}
                </a>
              ))}
            </div>

          </div>
        </header>

        {/* ── 頁面主體：sidebar + content ──────────────── */}
        <div className="max-w-[1100px] mx-auto flex items-start">

          {/* 左側導覽（桌機專用，lg 以上顯示）*/}
          <aside
            className="hidden lg:flex flex-col shrink-0 py-5 pl-4 pr-3"
            style={{
              width: '164px',
              position: 'sticky',
              /* 頂部對齊 header 高度（約 88px：標題列 54px + nav列 34px）*/
              top: '88px',
              height: 'calc(100vh - 88px)',
              overflowY: 'auto',
              borderRight: '1px solid var(--border)',
            }}
          >
            <div
              className="text-[10px] font-bold uppercase mb-3"
              style={{ color: 'var(--text-secondary)', letterSpacing: '0.12em' }}
            >
              導覽
            </div>

            <SidebarNav navItems={navItems} />

            {/* 底部版本標記 */}
            <div className="mt-auto pt-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              TZLTH-HQ<br />v2025
            </div>
          </aside>

          {/* 主要內容區 */}
          <main className="flex-1 min-w-0 px-4 py-6">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}
