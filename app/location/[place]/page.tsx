'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PostCard from '@/components/Feed/PostCard';
import type { Post } from '@/types';

export default function LocationPage({ params }: { params: { place: string } }) {
  const router = useRouter();
  const place = decodeURIComponent(params.place);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPosts = async (p: number, append = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    const data = await fetch(`/api/location/${encodeURIComponent(params.place)}?page=${p}`)
      .then(r => r.json())
      .catch(() => ({ posts: [], has_next: false, total: 0 }));
    if (append) {
      setPosts(prev => [...prev, ...(data.posts ?? [])]);
    } else {
      setPosts(data.posts ?? []);
    }
    setHasNext(data.has_next ?? false);
    setTotal(data.total ?? 0);
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    setPage(1);
    loadPosts(1, false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.place]);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    loadPosts(next, true);
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ padding: '6px 10px' }}>
          ←
        </button>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: 'var(--gray-900)', margin: 0 }}>
            📍 {place}
          </h1>
          {!loading && (
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 2 }}>
              {total} post{total !== 1 ? 's' : ''} from this location
            </div>
          )}
        </div>
      </div>

      {loading ? (
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
              <div className="skeleton" style={{ height: 180, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--gray-400)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>📍</div>
          <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--gray-600)', marginBottom: 8 }}>No posts from this location</div>
          <div style={{ fontSize: '0.875rem' }}>Be the first to post from {place}!</div>
        </div>
      ) : (
        <>
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}

          {loadingMore && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
              {[1, 2].map(i => (
                <div key={i} className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="skeleton" style={{ height: 14, width: '60%' }} />
                      <div className="skeleton" style={{ height: 12, width: '40%' }} />
                    </div>
                  </div>
                  <div className="skeleton" style={{ height: 120, borderRadius: 8 }} />
                </div>
              ))}
            </div>
          )}

          {hasNext && !loadingMore && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <button onClick={handleLoadMore} className="btn btn-outline">
                Load more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
