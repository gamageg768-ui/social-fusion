'use client';
import { useEffect, useState } from 'react';
import type { User, Post } from '@/types';

function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<'posts' | 'photos' | 'liked'>('posts');
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    fetch('/api/users/me').then(r => r.json()).then(setUser).catch(console.error);
    fetch('/api/posts?page=1').then(r => r.json()).then(d => setPosts(d.posts.slice(0, 12))).catch(console.error);
  }, []);

  if (!user) return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)', marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius)', marginBottom: 16 }} />
    </div>
  );

  const photoPosts = posts.filter(p => p.image_url);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 60 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.cover} alt="" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
        <div style={{ position: 'absolute', bottom: -44, left: 24 }}>
          <div style={{ padding: 3, background: 'white', borderRadius: '50%', boxShadow: 'var(--shadow)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.avatar} alt={user.name} className="avatar" style={{ width: 88, height: 88 }} />
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: -44, right: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Profile
          </button>
          <button onClick={() => setFollowing(v => !v)} className={`btn btn-sm ${following ? 'btn-ghost' : 'btn-primary'}`}>
            {following ? '✓ Following' : '+ Follow'}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: 'var(--gray-900)' }}>{user.name}</h1>
              {user.is_verified && (
                <span style={{ width: 22, height: 22, background: 'var(--blue-500)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </span>
              )}
            </div>
            <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem', marginBottom: 10 }}>@{user.username}</div>
            {user.bio && <p style={{ color: 'var(--gray-700)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 10 }}>{user.bio}</p>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: '0.8rem', color: 'var(--gray-500)' }}>
              {user.location && <span>📍 {user.location}</span>}
              {user.website && <a href={`https://${user.website}`} style={{ color: 'var(--blue-500)', fontWeight: 500 }}>🔗 {user.website}</a>}
              <span>📅 Joined {new Date(user.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 28, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--blue-50)' }}>
          {[
            { label: 'Posts', value: user.posts_count },
            { label: 'Followers', value: user.followers_count },
            { label: 'Following', value: user.following_count },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--gray-900)', fontFamily: 'Syne, sans-serif' }}>{fmt(s.value)}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'posts' as const, label: '📝 Posts' },
          { key: 'photos' as const, label: '📸 Photos' },
          { key: 'liked' as const, label: '❤️ Liked' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-outline'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'photos' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {photoPosts.map(p => (
            <div key={p.id} style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: 6, cursor: 'pointer' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                onMouseEnter={e => ((e.target as HTMLElement).style.transform = 'scale(1.05)')}
                onMouseLeave={e => ((e.target as HTMLElement).style.transform = 'scale(1)')} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.slice(0, 6).map(p => (
            <div key={p.id} className="card" style={{ padding: 14, display: 'flex', gap: 10 }}>
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt="" style={{ width: 70, height: 70, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--gray-700)', lineHeight: 1.5, marginBottom: 8 }}>{p.content}</p>
                <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--gray-400)' }}>
                  <span>❤️ {fmt(p.likes_count)}</span>
                  <span>💬 {fmt(p.comments_count)}</span>
                  <span>🔁 {fmt(p.shares_count)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
