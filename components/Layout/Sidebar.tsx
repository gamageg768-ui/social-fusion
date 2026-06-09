'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function HomeIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>; }
function ExploreIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>; }
function ReelsIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>; }
function MessagesIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function BellIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function ProfileIcon() { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function PlusIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }

const navItems = [
  { path: '/', label: 'Home', Icon: HomeIcon },
  { path: '/explore', label: 'Explore', Icon: ExploreIcon },
  { path: '/reels', label: 'Reels', Icon: ReelsIcon },
  { path: '/messages', label: 'Messages', Icon: MessagesIcon, badge: 3 },
  { path: '/notifications', label: 'Notifications', Icon: BellIcon, badge: 6 },
  { path: '/profile', label: 'Profile', Icon: ProfileIcon },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar" style={{
      background: 'var(--white)',
      borderRight: '1px solid var(--blue-100)',
      display: 'flex',
      flexDirection: 'column',
      padding: 0,
      position: 'relative',
      zIndex: 10,
    }}>
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--blue-50)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--blue-400), var(--blue-600))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: 'var(--blue-600)', letterSpacing: '-0.5px' }}>
            SocialFusion
          </span>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ path, label, Icon, badge }) => {
          const isActive = path === '/' ? pathname === '/' : pathname.startsWith(path);
          return (
            <Link key={path} href={path} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 'var(--radius)',
              fontWeight: isActive ? 700 : 500, fontSize: '0.925rem',
              color: isActive ? 'var(--blue-600)' : 'var(--gray-600)',
              background: isActive ? 'var(--blue-50)' : 'transparent',
              transition: 'all 0.15s', position: 'relative',
            }}>
              <span style={{ color: isActive ? 'var(--blue-500)' : 'var(--gray-400)' }}><Icon /></span>
              <span style={{ flex: 1 }}>{label}</span>
              {badge && <span className="badge">{badge}</span>}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--blue-50)' }}>
        <button className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '12px' }}>
          <PlusIcon /> Create Post
        </button>
      </div>

      <div style={{ padding: '12px 16px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://picsum.photos/seed/1114/40/40" alt="You" className="avatar" width={38} height={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--gray-800)' }}>You (Demo)</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>@you</div>
        </div>
        <button className="btn-ghost btn-icon" style={{ color: 'var(--gray-400)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
