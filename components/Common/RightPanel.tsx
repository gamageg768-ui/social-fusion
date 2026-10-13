'use client';
import { useEffect, useState } from 'react';
import type { User } from '@/types';

type TrendItem = { tag: string; count: number; trend: 'rising' | 'stable' | 'falling' };

const TREND_ICONS = ['🔥', '💡', '📸', '🤖', '💪', '✈️', '🎮', '🎵', '🌱', '🚀'];
const TREND_LABELS: Record<string, string> = { rising: '↑', stable: '→', falling: '↓' };

export default function RightPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [followed, setFollowed] = useState<Set<number>>(new Set());
  const [trends, setTrends] = useState<TrendItem[]>([]);

  useEffect(() => {
    fetch('/api/users/suggestions')
      .then(r => r.json())
      .then((d: User[]) => setUsers(d.slice(0, 5)))
      .catch(console.error);
    fetch('/api/trending')
      .then(r => r.json())
      .then((d: { trending: TrendItem[] }) => setTrends(d.trending ?? []))
      .catch(console.error);
  }, []);

  const toggle = async (id: number) => {
    const res = await fetch(`/api/users/${id}/follow`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res) {
      setFollowed(prev => {
        const n = new Set(prev);
        res.following ? n.add(id) : n.delete(id);
        return n;
      });
      setUsers(prev => prev.map(u =>
        u.id === id
          ? { ...u, followers_count: u.followers_count + (res.following ? 1 : -1) }
          : u
      ));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 16, overflow: 'hidden' }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, color: 'var(--gray-800)', fontFamily: 'Syne, sans-serif' }}>
          🔥 Trending Now
        </h3>
        {trends.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {trends.map((t, i) => (
              <a key={t.tag} href={`/explore?q=${encodeURIComponent(t.tag)}`} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>#{i + 1} Trending</div>
                      <div style={{ fontWeight: 700, color: 'var(--blue-600)', fontSize: '0.9rem' }}>{t.tag}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                        {t.count} post{t.count !== 1 ? 's' : ''}{' '}
                        <span style={{ color: t.trend === 'rising' ? 'var(--green-500)' : t.trend === 'falling' ? 'var(--red-400)' : 'var(--gray-400)' }}>
                          {TREND_LABELS[t.trend]}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: '1.2rem' }}>{TREND_ICONS[i] ?? '📌'}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, color: 'var(--gray-800)', fontFamily: 'Syne, sans-serif' }}>
          👥 Who to Follow
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {users.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.avatar} alt={u.name} className="avatar" style={{ width: 38, height: 38 }} />
                {u.is_verified && (
                  <span style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, background: 'var(--blue-500)', borderRadius: '50%', border: '1.5px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--gray-800)' }} className="truncate">{u.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>@{u.username}</div>
              </div>
              <button onClick={() => toggle(u.id)}
                className={`btn btn-sm ${followed.has(u.id) ? 'btn-ghost' : 'btn-outline'}`}
                style={{ padding: '4px 12px', fontSize: '0.78rem' }}>
                {followed.has(u.id) ? 'Following' : 'Follow'}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--gray-300)', padding: '0 4px' }}>
        © 2025 SocialFusion · Privacy · Terms · About
      </div>
    </div>
  );
}
