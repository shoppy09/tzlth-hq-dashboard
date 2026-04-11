import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '職涯停看聽 總部',
  description: 'TZLTH-HQ 指揮中心',
};

const navItems = [
  { label: '總覽', href: '#overview' },
  { label: '任務', href: '#tasks' },
  { label: '內容', href: '#content' },
  { label: '系統', href: '#systems' },
  { label: '部門', href: '#departments' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* 固定頂部：標題列 + 導航列 */}
        <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="max-w-2xl mx-auto px-4">
            {/* 標題列 */}
            <div className="py-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--accent)' }}>
                  TZLTH-HQ
                </div>
                <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  職涯停看聽 總部
                </div>
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                蒲朝棟 Tim
              </div>
            </div>
            {/* 導航列 */}
            <div className="pb-3 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
              {navItems.map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  className="shrink-0 text-xs font-semibold px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    color: 'var(--accent)',
                    textDecoration: 'none',
                  }}
                >
                  {item.label}
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
