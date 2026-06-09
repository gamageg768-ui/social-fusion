'use client';
import { useState, useEffect } from 'react';
import type { User, Post } from '@/types';

function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

export default function Explore() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<'all' | 'people' | 'photos'>('all');
  const [followed, setFollowed] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch('/api/users/suggestions').then(r => r.json()).then(setUsers).catch(console.error);
    fetch('/api/posts?page=1').then(r => r.json()).then(d => setPosts(d.posts)).catch(console.error);
  }, []);

  const search = async () => {
    if (query.trim()) {
      const u = await fetch(`/api/users?q=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => []);
      setUsers(u);
    } else {
      fetch('/api/users/suggestions').then(r => r.json()).then(setUsers).catch(console.error);
    }
  };

  const photoPosts = posts.filter(p => p.image_url);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
          placeholder="Search people, posts, topics..." style={{
            width: '100%', padding: '13px 16px 13px 44px',
            background: 'var(--white)', border: '1.5px solid var(--blue-200)',
            borderRadius: 'var(--radius-full)', fontSize: '0.95rem', outline: 'none',
            boxShadow: 'var(--shadow-sm)', transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--blue-400)')}
          onBlur={e => (e.target.style.borderColor = 'var(--blue-200)')}
        />
        <button onClick={search} className="btn btn-primary btn-sm" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}>Search</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'people', 'photos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`}
            style={{ textTransform: 'capitalize' }}>
            {t === 'all' ? '✨ All' : t === 'people' ? '👥 People' : '📸 Photos'}
          </button>
        ))}
      </div>

      {tab === 'all' && (
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, fontFamily: 'Syne, sans-serif' }}>🔥 Trending Topics</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['#WebDev','#AIArt','#Photography','#FitnessGoals','#TravelVibes','#Gaming','#MusicProduction','#OpenSource','#SustainableLiving','#Startup','#FoodBlogger','#Coding','#Design','#Film','#Dance'].map(tag => (
              <span key={tag} style={{
                padding: '6px 14px', background: 'var(--blue-50)',
                color: 'var(--blue-600)', borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
                border: '1px solid var(--blue-100)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--blue-100)'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.background = 'var(--blue-50)'; }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {(tab === 'all' || tab === 'people') && (
        <div className="card" style={{ padding: 16, marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 14, fontFamily: 'Syne, sans-serif' }}>👥 People</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {users.slice(0, 8).map(u => (
              <div key={u.id} className="card" style={{ padding: 14, textAlign: 'center', transition: 'transform 0.2s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'translateY(0)')}>
                <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.avatar} alt={u.name} className="avatar" style={{ width: 56, height: 56 }} />
                  {u.is_verified && (
                    <span style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, background: 'var(--blue-500)', borderRadius: '50%', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 2 }}>{u.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: 6 }}>@{u.username}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: 10 }}>{fmt(u.followers_count)} followers</div>
                <button
                  onClick={() => setFollowed(prev => { const n = new Set(prev); n.has(u.id) ? n.delete(u.id) : n.add(u.id); return n; })}
                  className={`btn btn-sm w-full ${followed.has(u.id) ? 'btn-ghost' : 'btn-primary'}`}
                  style={{ justifyContent: 'center', padding: 6 }}>
                  {followed.has(u.id) ? '✓ Following' : '+ Follow'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {(tab === 'all' || tab === 'photos') && (
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 14, fontFamily: 'Syne, sans-serif' }}>📸 Photo Feed</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
            {photoPosts.map(p => (
              <div key={p.id} style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: 6, cursor: 'pointer', position: 'relative' }}
                onMouseEnter={e => { const img = e.currentTarget.querySelector('img') as HTMLElement; if (img) img.style.transform = 'scale(1.05)'; }}
                onMouseLeave={e => { const img = e.currentTarget.querySelector('img') as HTMLElement; if (img) img.style.transform = 'scale(1)'; }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'white', fontWeight: 700, fontSize: '0.85rem' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.4)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}>
                  <span>❤️ {p.likes_count >= 1000 ? (p.likes_count/1000).toFixed(1)+'K' : p.likes_count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
