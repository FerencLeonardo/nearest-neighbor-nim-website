'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Calculator' },
  { href: '/play', label: 'Play' },
  { href: '/learn', label: 'Learn' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-grid bg-card/90 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group min-w-0">
          <svg viewBox="0 0 32 32" className="w-6 h-6 shrink-0" aria-hidden="true">
            <circle cx="16" cy="16" r="13" fill="#FFFFFF" stroke="#223056" strokeWidth="1.8" />
            <circle cx="11.5" cy="20.5" r="2.6" fill="#223056" />
            <circle cx="16" cy="16" r="2.6" fill="#223056" />
            <circle cx="20.5" cy="11.5" r="2.6" fill="#223056" />
          </svg>
          <span className="font-display font-semibold text-ink text-[15px] sm:text-lg tracking-tight truncate">
            Nearest Neighbor Nim
          </span>
        </Link>
        <nav className="flex items-stretch self-stretch gap-1 sm:gap-4">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center px-2 sm:px-1 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? 'text-ink border-pen'
                    : 'text-graphite border-transparent hover:text-ink'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
