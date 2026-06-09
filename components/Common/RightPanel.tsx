'use client';
import { useEffect, useState } from 'react';
import type { User } from '@/types';

const trends = [
  { tag: '#WebDev', posts: '48.2K posts' },
  { tag: '#TechNews', posts: '31.5K posts' },
  { tag: '#Photography', posts: '76.1K posts' },
  { tag: '#AIArt', posts: '112K posts' },
  { tag: '#FitnessGoals', posts: '55.8K posts' },
  { tag: '#TravelVibes', posts: '89.3K posts' },
];

export default function RightPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [followed, setFollowed] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/users/suggestions').then(r => r.json()).then((d: User[]) => setUsers(d.slice(0, 5))).catch(console.error);
  }, []);

  const toggle = (id: number) => {
    setFollowed(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card" style={{ padding: 16, overflow: 'hidden' }}>
        <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, color: 'var(--gray-800)', fontFamily: 'Syne, sans-serif' }}>
          🔥 Trending Now
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {trends.map((t, i) => (
            <div key={t.tag} style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>#{i + 1} Trending</div>
                  <div style={{ fontWeight: 700, color: 'var(--blue-600)', fontSize: '0.9rem' }}>{t.tag}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{t.posts}</div>
                </div>
                <span style={{ fontSize: '1.2rem' }}>{['🔥','💡','📸','🤖','💪','✈️'][i]}</span>
              </div>
            </div>
          ))}
        </div>
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
        © 2024 SocialFusion · Privacy · Terms · About
      </div>
    </div>
  );
}
