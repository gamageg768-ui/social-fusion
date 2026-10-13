'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PostCard from '@/components/Feed/PostCard';
import type { Community, Post, User } from '@/types';

type Tab = 'posts' | 'members';

interface CommunityDetail extends Community {
  members?: { user: User; role: string }[];
}

export default function CommunityDetailPage({ params }: { params: { id: string } }) {
  const [community, setCommunity] = useState<CommunityDetail | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('posts');
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/communities/${params.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/communities/${params.id}/posts`).then(r => r.json()).catch(() => ({ posts: [] })),
    ]).then(([com, postsData]) => {
      setCommunity(com);
      setPosts(postsData?.posts ?? []);
      setLoading(false);
    });
  }, [params.id]);

  const handleJoin = async () => {
    if (!community) return;
    await fetch(`/api/communities/${community.id}/join`, { method: 'POST' }).catch(() => {});
    setCommunity(prev => prev ? {
      ...prev,
      is_member: !prev.is_member,
      _count: { ...prev._count, members: (prev._count?.members ?? 0) + (prev.is_member ? -1 : 1), posts: prev._count?.posts ?? 0 },
    } : prev);
  };

  const handlePost = async () => {
    if (!newContent.trim() || posting) return;
    setPosting(true);
    const res = await fetch(`/api/communities/${params.id}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent, image_url: newImage }),
    }).then(r => r.json()).catch(() => null);
    if (res?.id) {
      setPosts(prev => [res, ...prev]);
      setNewContent(''); setNewImage('');
    }
    setPosting(false);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 120, borderRadius: 12, marginBottom: 16 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  if (!community) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--gray-400)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>😕</div>
        <div style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Community not found</div>
        <Link href="/communities" style={{ color: 'var(--blue-500)', textDecoration: 'none', marginTop: 8, display: 'inline-block' }}>← Communities</Link>
      </div>
    );
  }

  const members = community.members ?? [];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <Link href="/communities" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--blue-500)', textDecoration: 'none', marginBottom: 16, fontSize: '0.9rem', fontWeight: 600 }}>
        ← Communities
      </Link>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {community.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={community.avatar_url} alt={community.name} className="avatar" style={{ width: 64, height: 64 }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🏘️</div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.25rem', color: 'var(--gray-900)', margin: 0 }}>{community.name}</h1>
              {community.is_private && (
                <span style={{ fontSize: '0.7rem', background: 'var(--gray-100)', color: 'var(--gray-500)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>Private</span>
              )}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-400)', marginBottom: 8 }}>
              {community._count?.members ?? 0} member{community._count?.members !== 1 ? 's' : ''}
            </div>
            {community.description && (
              <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', margin: 0 }}>{community.description}</p>
            )}
          </div>
          <button onClick={handleJoin} className={`btn btn-sm ${community.is_member ? 'btn-ghost' : 'btn-primary'}`}>
            {community.is_member ? 'Leave' : 'Join'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['posts', 'members'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`}
            style={{ textTransform: 'capitalize' }}>
            {t === 'posts' ? `📝 Posts (${community._count?.posts ?? posts.length})` : `👥 Members (${community._count?.members ?? 0})`}
          </button>
        ))}
      </div>

      {tab === 'posts' && (
        <div>
          {community.is_member && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
                placeholder="Share something with the community..."
                rows={3}
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid var(--blue-100)', borderRadius: 8, fontSize: '0.875rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }} />
              <input value={newImage} onChange={e => setNewImage(e.target.value)}
                placeholder="Image URL (optional)"
                style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--blue-100)', borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={handlePost} disabled={posting || !newContent.trim()} className="btn btn-primary btn-sm">
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          )}
          {posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📝</div>
              <div style={{ fontWeight: 600, color: 'var(--gray-600)' }}>No posts yet</div>
            </div>
          ) : (
            posts.map(post => <PostCard key={post.id} post={post} />)
          )}
        </div>
      )}

      {tab === 'members' && (
        <div className="card" style={{ padding: 20 }}>
          {members.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>👥</div>
              <div style={{ fontWeight: 600, color: 'var(--gray-600)' }}>No members listed</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {members.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.user.avatar} alt={m.user.name} className="avatar" style={{ width: 40, height: 40 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-800)' }}>{m.user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>@{m.user.username}</div>
                  </div>
                  {m.role === 'owner' && (
                    <span style={{ fontSize: '0.7rem', background: 'var(--blue-50)', color: 'var(--blue-600)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>Owner</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
