import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '職涯停看聽 總部',
  description: 'TZLTH-HQ 指揮中心',
};

const navItems = [
  { label: '總覽',  href: '#overview' },
  { label: '指令',  href: '#command',     highlight: true },
  { label: '任務',  href: '#tasks' },
  { label: '內容',  href: '#content' },
  { label: '外展',  href: '#outreach' },
  { label: '財務',  href: '#finance' },
  { label: '系統',  href: '#systems' },
  { label: '知識庫', href: '#knowledge' },
  { label: '部門',  href: '#departments' },
];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();
  const dow   = WEEKDAYS[now.getDay()];
  const dateStr = `${month}月${day}日・週${dow}`;

  return (
    <html lang="zh-TW">
      <body className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>

        {/* ── 固定頂部導覽 ───────────────────────────────── */}
        <header
          className="sticky top-0 z-40 border-b"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div className="max-w-2xl mx-auto px-4">

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
              <div className="text-right">
                <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  蒲朝棟 Tim
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {dateStr}
                </div>
              </div>
            </div>

            {/* 導航列 */}
            <div
              className="pb-3 flex gap-1.5 overflow-x-auto"
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

        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
