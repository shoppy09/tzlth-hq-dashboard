import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '職涯停看聽 總部',
  description: 'TZLTH-HQ 指揮中心',
};

const navItems = [
  { label: '總覽', href: '#overview' },
  { label: '指令', href: '#command' },
  { label: '任務', href: '#tasks' },
  { label: '內容', href: '#content' },
  { label: '外展', href: '#outreach' },
  { label: '財務', href: '#finance' },
  { label: '系統', href: '#systems' },
  { label: '部門', href: '#departments' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* 固定頂部 */}
        <header
          className="sticky top-0 z-40 border-b"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
          <div className="max-w-2xl mx-auto px-4">
            {/* 標題列 */}
            <div className="py-3 flex items-center justify-between">
              <div>
                <div
                  className="text-xs font-semibold tracking-widest uppercase"
                  style={{ color: 'var(--accent)' }}
                >
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
            <div
              className="pb-3 flex gap-2 overflow-x-auto"
              style={{ scrollbarWidth: 'none' } as React.CSSProperties}
            >
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="shrink-0 text-xs font-semibold px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: item.label === '指令' ? 'var(--accent)' : 'var(--bg-primary)',
                    border: item.label === '指令' ? '1px solid var(--accent)' : '1px solid var(--border)',
                    color: item.label === '指令' ? '#ffffff' : 'var(--accent)',
                    textDecoration: 'none',
                  }}
                >
                  {item.label === '指令' ? '⚡ 指令' : item.label}
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
