'use client';
import { useEffect, useState, useCallback } from 'react';
import Stories from '@/components/Feed/Stories';
import PostCard from '@/components/Feed/PostCard';
import CreatePost from '@/components/Feed/CreatePost';
import type { Post } from '@/types';

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'post' | 'tweet'>('all');

  const load = useCallback(async (p: number, f: string) => {
    setLoading(true);
    try {
      const typeParam = f !== 'all' ? `&type=${f}` : '';
      const data = await fetch(`/api/posts?page=${p}${typeParam}`).then(r => r.json());
      if (p === 1) setPosts(data.posts);
      else setPosts(prev => [...prev, ...data.posts]);
      setHasNext(data.has_next);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    setPage(1);
    load(1, filter);
  }, [filter, load]);

  const filterBtns: { key: typeof filter; label: string }[] = [
    { key: 'all', label: '✨ All' },
    { key: 'post', label: '📝 Posts' },
    { key: 'tweet', label: '🐦 Tweets' },
  ];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Stories />
      <CreatePost onPost={p => setPosts(prev => [p, ...prev])} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {filterBtns.map(b => (
          <button key={b.key} onClick={() => setFilter(b.key)}
            className={`btn btn-sm ${filter === b.key ? 'btn-primary' : 'btn-outline'}`}>
            {b.label}
          </button>
        ))}
      </div>

      {posts.map(p => <PostCard key={p.id} post={p} />)}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2].map(i => (
            <div key={i} className="card" style={{ padding: 16, gap: 12, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                  <div className="skeleton" style={{ height: 12, width: '40%' }} />
                </div>
              </div>
              <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      )}

      {hasNext && !loading && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <button className="btn btn-outline" onClick={() => { const next = page + 1; setPage(next); load(next, filter); }}>
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
