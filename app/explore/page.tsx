'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PostCard from '@/components/Feed/PostCard';
import type { User, Post } from '@/types';

function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

type TrendItem = { tag: string; count: number; trend: 'rising' | 'stable' | 'falling' };

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [hashtags, setHashtags] = useState<{ tag: string; count: number }[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendItem[]>([]);
  const [tab, setTab] = useState<'all' | 'people' | 'photos'>('all');
  const [followed, setFollowed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const loadDefault = async () => {
    const [u, p, t] = await Promise.all([
      fetch('/api/users/suggestions').then(r => r.json()).catch(() => []),
      fetch('/api/posts?page=1').then(r => r.json()).then(d => d.posts).catch(() => []),
      fetch('/api/trending').then(r => r.json()).then(d => d.trending ?? []).catch(() => []),
    ]);
    setUsers(u);
    setPosts(p);
    setTrendingTags(t);
  };

  const search = async (q: string) => {
    if (!q.trim()) { setSearched(false); loadDefault(); return; }
    setLoading(true);
    setSearched(true);
    const data = await fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => ({ users: [], posts: [], hashtags: [] }));
    setUsers(data.users);
    setPosts(data.posts);
    setHashtags(data.hashtags);
    setLoading(false);
  };

  useEffect(() => {
    const q = searchParams.get('q') || '';
    setQuery(q);
    if (q) search(q);
    else loadDefault();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSearch = () => {
    if (query.trim()) router.push(`/explore?q=${encodeURIComponent(query)}`);
    else { setSearched(false); loadDefault(); }
  };

  const toggleFollow = async (id: number) => {
    const res = await fetch(`/api/users/${id}/follow`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res) {
      setFollowed(prev => { const n = new Set(prev); res.following ? n.add(id) : n.delete(id); return n; });
    }
  };

  const photoPosts = posts.filter(p => p.image_url);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }}
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search people, posts, #hashtags..." style={{
            width: '100%', padding: '13px 16px 13px 44px',
            background: 'var(--white)', border: '1.5px solid var(--blue-200)',
            borderRadius: 'var(--radius-full)', fontSize: '0.95rem', outline: 'none',
            boxShadow: 'var(--shadow-sm)', transition: 'border-color 0.2s',
          }}
          onFocus={e => (e.target.style.borderColor = 'var(--blue-400)')}
          onBlur={e => (e.target.style.borderColor = 'var(--blue-200)')}
        />
        <button onClick={handleSearch} className="btn btn-primary btn-sm" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}>Search</button>
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

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      )}

      {!loading && (
        <>
          {searched && hashtags.length > 0 && tab === 'all' && (
            <div className="card" style={{ padding: 16, marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, fontFamily: 'Syne, sans-serif' }}>🏷️ Hashtags</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {hashtags.map(h => (
                  <button key={h.tag} onClick={() => { setQuery(h.tag); router.push(`/explore?q=${encodeURIComponent(h.tag)}`); }}
                    style={{ padding: '6px 14px', background: 'var(--blue-50)', color: 'var(--blue-600)', borderRadius: 'var(--radius-full)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--blue-100)' }}>
                    {h.tag} <span style={{ color: 'var(--gray-400)' }}>({h.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!searched && tab === 'all' && (
            <div className="card" style={{ padding: 16, marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 12, fontFamily: 'Syne, sans-serif' }}>🔥 Trending Topics</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {trendingTags.map(t => (
                  <button key={t.tag} onClick={() => { setQuery(t.tag); router.push(`/explore?q=${encodeURIComponent(t.tag)}`); }}
                    style={{ padding: '6px 14px', background: 'var(--blue-50)', color: 'var(--blue-600)', borderRadius: 'var(--radius-full)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--blue-100)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4 }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--blue-100)'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = 'var(--blue-50)'; }}>
                    {t.tag}
                    {t.trend === 'rising' && <span style={{ color: 'var(--green-500)', fontSize: '0.7rem' }}>↑</span>}
                    <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>{t.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(tab === 'all' || tab === 'people') && users.length > 0 && (
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
                    <button onClick={() => toggleFollow(u.id)}
                      className={`btn btn-sm w-full ${followed.has(u.id) ? 'btn-ghost' : 'btn-primary'}`}
                      style={{ justifyContent: 'center', padding: 6 }}>
                      {followed.has(u.id) ? '✓ Following' : '+ Follow'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searched && tab === 'all' && posts.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 14, fontFamily: 'Syne, sans-serif', padding: '0 4px' }}>📄 Posts</h3>
              {posts.slice(0, 5).map(p => <PostCard key={p.id} post={p} />)}
            </div>
          )}

          {(tab === 'all' || tab === 'photos') && photoPosts.length > 0 && (
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

          {searched && users.length === 0 && posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--gray-600)' }}>No results for &quot;{query}&quot;</div>
              <div style={{ fontSize: '0.875rem', marginTop: 4 }}>Try a different search term or hashtag.</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Explore() {
  return (
    <Suspense>
      <ExploreContent />
    </Suspense>
  );
}
