'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Channel, ChannelPostItem } from '@/types';

const EMOJI_PICKER = ['❤️', '😂', '👏', '🔥'];

export default function ChannelDetailPage({ params }: { params: { id: string } }) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [posts, setPosts] = useState<ChannelPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [newImage, setNewImage] = useState('');
  const [posting, setPosting] = useState(false);
  const [pickerOpenId, setPickerOpenId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/channels/${params.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/channels/${params.id}/posts`).then(r => r.json()).catch(() => ({ posts: [] })),
      fetch('/api/users/me').then(r => r.json()).catch(() => null),
    ]).then(([ch, postsData, me]) => {
      setChannel(ch);
      setPosts(postsData?.posts ?? []);
      if (me?.id) setCurrentUserId(me.id);
      setLoading(false);
    });
  }, [params.id]);

  const handleSubscribe = async () => {
    if (!channel) return;
    await fetch(`/api/channels/${channel.id}/subscribe`, { method: 'POST' }).catch(() => {});
    setChannel(prev => prev ? {
      ...prev,
      is_subscribed: !prev.is_subscribed,
      _count: {
        ...prev._count,
        subscriptions: (prev._count?.subscriptions ?? 0) + (prev.is_subscribed ? -1 : 1),
        posts: prev._count?.posts ?? 0,
      },
    } : prev);
  };

  const handlePost = async () => {
    if (!newContent.trim() || posting) return;
    setPosting(true);
    const res = await fetch(`/api/channels/${params.id}/posts`, {
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

  const handleReact = async (channelPostId: number, postId: number, emoji: string) => {
    const item = posts.find(p => p.id === channelPostId);
    if (item?.my_reaction === emoji) return;
    await fetch(`/api/channels/${params.id}/posts/${postId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji }),
    }).catch(() => {});
    setPosts(prev => prev.map(p => {
      if (p.id !== channelPostId) return p;
      const prevReaction = p.my_reaction;
      const reactions = [...(p.reactions ?? [])];
      if (prevReaction) {
        const idx = reactions.findIndex(r => r.emoji === prevReaction);
        if (idx >= 0) reactions[idx] = { ...reactions[idx], count: Math.max(0, reactions[idx].count - 1) };
      }
      const newIdx = reactions.findIndex(r => r.emoji === emoji);
      if (newIdx >= 0) {
        reactions[newIdx] = { ...reactions[newIdx], count: reactions[newIdx].count + 1 };
      } else {
        reactions.push({ emoji, count: 1 });
      }
      return { ...p, reactions, my_reaction: emoji };
    }));
    setPickerOpenId(null);
  };

  const isOwner = channel?.owner_id === currentUserId;

  if (loading) {
    return (
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 100, borderRadius: 12, marginBottom: 16 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 120, borderRadius: 12 }} />)}
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--gray-400)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>😕</div>
        <div style={{ fontWeight: 600, color: 'var(--gray-600)' }}>Channel not found</div>
        <Link href="/channels" style={{ color: 'var(--blue-500)', textDecoration: 'none', marginTop: 8, display: 'inline-block' }}>← Channels</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <Link href="/channels" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--blue-500)', textDecoration: 'none', marginBottom: 16, fontSize: '0.9rem', fontWeight: 600 }}>
        ← Channels
      </Link>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {channel.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={channel.avatar_url} alt={channel.name} className="avatar" style={{ width: 56, height: 56 }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--blue-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>📡</div>
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: 'var(--gray-900)', margin: '0 0 4px' }}>{channel.name}</h1>
            {channel.description && (
              <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)', margin: '0 0 4px' }}>{channel.description}</p>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
              {channel._count?.subscriptions ?? 0} subscriber{channel._count?.subscriptions !== 1 ? 's' : ''}
            </div>
          </div>
          <button onClick={handleSubscribe} className={`btn btn-sm ${channel.is_subscribed ? 'btn-ghost' : 'btn-primary'}`}>
            {channel.is_subscribed ? 'Unsubscribe' : 'Subscribe'}
          </button>
        </div>
      </div>

      {isOwner && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
            placeholder="Post to your channel..."
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
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📡</div>
          <div style={{ fontWeight: 600, color: 'var(--gray-600)' }}>No posts yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map(item => (
            <div key={item.id} className="card" style={{ padding: 16 }}>
              <p style={{ margin: '0 0 10px', color: 'var(--gray-800)', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {item.post.content}
              </p>
              {item.post.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.post.image_url} alt="" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }} />
              )}
              <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginBottom: 10 }}>
                {new Date(item.created_at).toLocaleString()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {(item.reactions ?? []).filter(r => r.count > 0).map(r => (
                  <button key={r.emoji} onClick={() => handleReact(item.id, item.post_id, r.emoji)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 'var(--radius-full)',
                      border: `1.5px solid ${item.my_reaction === r.emoji ? 'var(--blue-400)' : 'var(--gray-100)'}`,
                      background: item.my_reaction === r.emoji ? 'var(--blue-50)' : 'var(--gray-50)',
                      fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600,
                    }}>
                    {r.emoji} <span style={{ color: 'var(--gray-600)' }}>{r.count}</span>
                  </button>
                ))}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setPickerOpenId(pickerOpenId === item.id ? null : item.id)}
                    className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem', padding: '3px 8px' }}>
                    + React
                  </button>
                  {pickerOpenId === item.id && (
                    <div style={{
                      position: 'absolute', bottom: '110%', left: 0, background: 'white',
                      border: '1px solid var(--gray-100)', borderRadius: 8, padding: 8,
                      display: 'flex', gap: 6, boxShadow: 'var(--shadow)', zIndex: 10,
                    }}>
                      {EMOJI_PICKER.map(emoji => (
                        <button key={emoji} onClick={() => handleReact(item.id, item.post_id, emoji)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: 4, borderRadius: 6 }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
