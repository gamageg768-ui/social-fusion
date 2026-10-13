'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { Post } from '@/types';
import PostCard from '@/components/Feed/PostCard';

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/threads/${id}`).then(r => r.json()).then(data => {
      setPosts(data.posts || []);
      setLoading(false);
    });
  }, [id]);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <a href="/" style={{ fontSize: '1.2rem', textDecoration: 'none', color: 'var(--gray-600)' }}>←</a>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.3rem', color: 'var(--gray-900)' }}>
          Thread
        </h1>
        {posts.length > 0 && (
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>{posts.length} posts</span>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 150, borderRadius: 12 }} />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)' }}>
          Thread not found
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {posts.map((post, idx) => (
            <div key={post.id} style={{ position: 'relative' }}>
              {idx < posts.length - 1 && (
                <div style={{
                  position: 'absolute', left: 30, top: 60, bottom: -12, width: 2,
                  background: 'linear-gradient(to bottom, var(--blue-200), var(--blue-100))',
                  zIndex: 0,
                }} />
              )}
              <div style={{ position: 'relative', zIndex: 1, marginBottom: 12 }}>
                <PostCard post={post} threadMode />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
