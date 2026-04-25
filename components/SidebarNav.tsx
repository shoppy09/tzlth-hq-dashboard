'use client';
import { useEffect, useState } from 'react';

interface NavItem { label: string; href: string; highlight?: boolean; }

export function SidebarNav({ navItems }: { navItems: NavItem[] }) {
  const [active, setActive] = useState('overview');

  useEffect(() => {
    const sectionIds = navItems.map(({ href }) => href.replace('#', ''));
    const observers: IntersectionObserver[] = [];

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      // rootMargin: 上方留 15%（header 高度）、下方 65% ── 讓 section 進入視口上方 1/4 時觸發
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { rootMargin: '-15% 0px -65% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [navItems]);

  return (
    <nav className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        const id = item.href.replace('#', '');
        const isActive = active === id;
        return (
          <a
            key={item.href}
            href={item.href}
            className="text-xs font-semibold px-2.5 py-2 rounded-lg"
            style={{
              color: isActive
                ? '#ffffff'
                : item.highlight
                  ? 'var(--accent)'
                  : 'var(--text-secondary)',
              backgroundColor: isActive
                ? 'var(--accent)'
                : 'transparent',
              border: !isActive && item.highlight
                ? `1px solid var(--accent)`
                : '1px solid transparent',
              textDecoration: 'none',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
          >
            {item.highlight ? `⚡ ${item.label}` : item.label}
          </a>
        );
      })}
    </nav>
  );
}
