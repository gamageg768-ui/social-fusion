'use client';
import { useState, useRef, useCallback } from 'react';
import type { User } from '@/types';

function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

interface HoverCardProps { user: User; }

function Card({ user }: HoverCardProps) {
  const [following, setFollowing] = useState(user.is_following ?? false);

  const toggle = async () => {
    const res = await fetch(`/api/users/${user.id}/follow`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res) setFollowing(res.following);
  };

  return (
    <div style={{
      position: 'absolute', left: 0, top: '100%', zIndex: 1000, marginTop: 4,
      background: 'white', borderRadius: 12, padding: 16, minWidth: 260,
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid var(--blue-100)',
      pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.avatar} alt={user.name} className="avatar" style={{ width: 48, height: 48 }} />
          {user.is_verified && (
            <span style={{ position: 'absolute', bottom: -1, right: -1, width: 16, height: 16, background: 'var(--blue-500)', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </span>
          )}
        </div>
        <button onClick={toggle} className={`btn btn-sm ${following ? 'btn-ghost' : 'btn-primary'}`} style={{ fontSize: '0.78rem' }}>
          {following ? '✓ Following' : '+ Follow'}
        </button>
      </div>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-900)' }}>{user.name}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginBottom: 6 }}>@{user.username}</div>
      {user.bio && <p style={{ fontSize: '0.82rem', color: 'var(--gray-600)', lineHeight: 1.5, marginBottom: 8 }}>{user.bio}</p>}
      <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem' }}>
        <span><strong>{fmt(user.followers_count)}</strong> <span style={{ color: 'var(--gray-400)' }}>Followers</span></span>
        <span><strong>{fmt(user.following_count)}</strong> <span style={{ color: 'var(--gray-400)' }}>Following</span></span>
      </div>
    </div>
  );
}

interface MentionProps { username: string; }

export function UserMention({ username }: MentionProps) {
  const [show, setShow] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (user) return;
    const data = await fetch(`/api/users?username=${encodeURIComponent(username)}`).then(r => r.json()).catch(() => []);
    if (data[0]) setUser(data[0]);
  }, [user, username]);

  const handleMouseEnter = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    timerRef.current = setTimeout(() => { setShow(true); load(); }, 300);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    hideTimerRef.current = setTimeout(() => setShow(false), 200);
  };

  return (
    <span style={{ position: 'relative', display: 'inline' }}>
      <a
        href={`/profile?u=${username}`}
        style={{ color: 'var(--blue-500)', fontWeight: 600, textDecoration: 'none' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        @{username}
      </a>
      {show && user && (
        <span onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <Card user={user} />
        </span>
      )}
    </span>
  );
}
