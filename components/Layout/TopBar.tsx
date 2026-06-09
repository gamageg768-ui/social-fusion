'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

export function TopBar() {
  const [q, setQ] = useState('');
  const router = useRouter();

  return (
    <header className="topbar" style={{
      background: 'var(--white)', borderBottom: '1px solid var(--blue-100)',
      padding: '0 20px', display: 'flex', alignItems: 'center', gap: 16,
      height: 'var(--topbar-height)', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="mobile-logo">
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--blue-400), var(--blue-600))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
        </div>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--blue-600)' }}>SocialFusion</span>
      </div>

      <div style={{ flex: 1, maxWidth: 480, position: 'relative' }}>
        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && q.trim()) router.push(`/explore?q=${encodeURIComponent(q)}`); }}
          placeholder="Search people, posts, trends..."
          style={{
            width: '100%', padding: '9px 12px 9px 38px',
            background: 'var(--gray-50)', border: '1.5px solid var(--blue-100)',
            borderRadius: 'var(--radius-full)', fontSize: '0.875rem',
            outline: 'none', transition: 'all 0.2s', color: 'var(--gray-700)',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--blue-300)')}
          onBlur={e => (e.target.style.borderColor = 'var(--blue-100)')}
        />
      </div>

      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
        <button className="btn btn-ghost btn-icon" title="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://picsum.photos/seed/1114/32/32" alt="You" className="avatar" style={{ width: 34, height: 34, cursor: 'pointer' }} />
      </div>
    </header>
  );
}

const mobileNav = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/explore', icon: '🔍', label: 'Explore' },
  { path: '/reels', icon: '🎬', label: 'Reels' },
  { path: '/messages', icon: '💬', label: 'Chat' },
  { path: '/profile', icon: '👤', label: 'Profile' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav style={{
      background: 'var(--white)', borderTop: '1px solid var(--blue-100)',
      display: 'flex', alignItems: 'center',
      height: 'var(--bottomnav-height)',
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
    }} className="bottom-nav-mobile">
      {mobileNav.map(({ path, icon, label }) => {
        const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path);
        return (
          <Link key={path} href={path} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '8px 4px', fontSize: '1.3rem',
            color: isActive ? 'var(--blue-500)' : 'var(--gray-400)',
            fontWeight: 600,
          }}>
            <span>{icon}</span>
            <span style={{ fontSize: '0.65rem' }}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
