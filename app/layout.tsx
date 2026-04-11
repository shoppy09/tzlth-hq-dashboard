import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '職涯停看聽 總部',
  description: 'TZLTH-HQ 指揮中心',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <header
          className="border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
        >
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
        </header>
        <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
