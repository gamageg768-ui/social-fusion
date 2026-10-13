'use client';
import { useEffect, useState, useCallback } from 'react';
import PostCard from '@/components/Feed/PostCard';
import type { Post } from '@/types';

export default function HashtagPage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag);
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const data = await fetch(`/api/hashtag/${encodeURIComponent(tag)}?page=${p}`).then(r => r.json());
      if (p === 1) setPosts(data.posts ?? []);
      else setPosts(prev => [...prev, ...(data.posts ?? [])]);
      setHasNext(data.has_next ?? false);
      setTotal(data.total ?? 0);
    } catch {}
    setLoading(false);
  }, [tag]);

  useEffect(() => { setPage(1); load(1); }, [load]);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="card" style={{ padding: '20px 20px 14px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <a href="/" style={{ color: 'var(--gray-400)', textDecoration: 'none', fontSize: '0.85rem' }}>← Back</a>
        </div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: 'var(--blue-600)', margin: '8px 0 2px' }}>
          #{tag}
        </h1>
        {!loading && (
          <div style={{ fontSize: '0.82rem', color: 'var(--gray-400)' }}>{total} post{total !== 1 ? 's' : ''}</div>
        )}
      </div>

      {loading && page === 1 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                  <div className="skeleton" style={{ height: 12, width: '40%' }} />
                </div>
              </div>
              <div className="skeleton" style={{ height: 80, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>#</div>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--gray-600)', marginBottom: 6 }}>No posts yet</div>
          <div style={{ fontSize: '0.875rem' }}>Be the first to post with <strong>#{tag}</strong></div>
        </div>
      ) : (
        <>
          {posts.map(p => <PostCard key={p.id} post={p} />)}
          {hasNext && !loading && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <button className="btn btn-outline" onClick={() => { const next = page + 1; setPage(next); load(next); }}>
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
