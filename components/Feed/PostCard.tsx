'use client';
import { useState } from 'react';
import type { Post } from '@/types';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function fmt(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

interface Props { post: Post; }

export default function PostCard({ post }: Props) {
  const [liked, setLiked] = useState(post.liked ?? false);
  const [likes, setLikes] = useState(post.likes_count);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<{ id: number; content: string; user: { name: string; avatar: string } }[]>([]);
  const [saved, setSaved] = useState(false);

  const handleLike = async () => {
    if (!liked) {
      setLiked(true);
      setLikes(l => l + 1);
      fetch(`/api/posts/${post.id}/like`, { method: 'POST' }).catch(() => {});
    } else {
      setLiked(false);
      setLikes(l => l - 1);
    }
  };

  const loadComments = async () => {
    if (!showComments) {
      const data = await fetch(`/api/posts/${post.id}/comments`).then(r => r.json()).catch(() => []);
      setComments(data.slice(0, 5));
    }
    setShowComments(v => !v);
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    await fetch(`/api/posts/${post.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment }),
    }).catch(() => {});
    setComments(prev => [{ id: Date.now(), content: comment, user: { name: 'You', avatar: 'https://picsum.photos/seed/1114/40/40' } }, ...prev]);
    setComment('');
  };

  return (
    <article className="card fade-in" style={{ marginBottom: 16, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.user.avatar} alt={post.user.name} className="avatar" style={{ width: 42, height: 42 }} />
          {post.user.is_verified && (
            <span style={{ position: 'absolute', bottom: -1, right: -1, width: 16, height: 16, background: 'var(--blue-500)', borderRadius: '50%', border: '1.5px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            </span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--gray-800)' }}>{post.user.name}</span>
            {post.post_type === 'tweet' && (
              <span style={{ fontSize: '0.7rem', padding: '1px 7px', background: 'var(--blue-50)', color: 'var(--blue-500)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>Tweet</span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', display: 'flex', gap: 6 }}>
            <span>@{post.user.username}</span>
            <span>·</span>
            <span>{timeAgo(post.created_at)}</span>
            {post.user.location && <><span>·</span><span>📍{post.user.location}</span></>}
          </div>
        </div>
        <button className="btn btn-outline btn-sm" style={{ marginLeft: 'auto' }}>Follow</button>
      </div>

      {post.content && (
        <div style={{ padding: '0 16px 12px', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--gray-700)' }}>
          {post.content}
        </div>
      )}

      {post.image_url && (
        <div style={{ overflow: 'hidden', maxHeight: 380 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image_url} alt="" style={{ width: '100%', maxHeight: 380, objectFit: 'cover' }} />
        </div>
      )}

      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 4, borderTop: '1px solid var(--gray-100)' }}>
        <button onClick={handleLike} className="btn btn-ghost btn-sm" style={{ color: liked ? 'var(--red-500)' : 'var(--gray-500)', gap: 5 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          {fmt(likes)}
        </button>
        <button onClick={loadComments} className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-500)', gap: 5 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          {fmt(post.comments_count)}
        </button>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-500)', gap: 5 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m4 12 8-8 8 8"/><path d="M12 4v16"/><path d="M3 20h18"/>
          </svg>
          {fmt(post.shares_count)}
        </button>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-500)', gap: 5 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
          </svg>
        </button>
        <button onClick={() => setSaved(v => !v)} className="btn btn-ghost btn-sm" style={{ color: saved ? 'var(--blue-500)' : 'var(--gray-500)', marginLeft: 'auto' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
          </svg>
        </button>
      </div>

      {showComments && (
        <div style={{ borderTop: '1px solid var(--gray-100)', padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://picsum.photos/seed/1114/32/32" alt="You" className="avatar" style={{ width: 30, height: 30 }} />
            <div style={{ flex: 1, display: 'flex', gap: 6 }}>
              <input value={comment} onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                placeholder="Write a comment..." style={{
                  flex: 1, padding: '7px 12px', borderRadius: 'var(--radius-full)',
                  border: '1.5px solid var(--blue-100)', outline: 'none',
                  fontSize: '0.85rem', background: 'var(--gray-50)',
                }} />
              <button onClick={submitComment} className="btn btn-primary btn-sm">Post</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.user.avatar} alt="" className="avatar" style={{ width: 28, height: 28 }} />
                <div style={{ background: 'var(--gray-50)', padding: '8px 12px', borderRadius: 10, flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{c.user.name} </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>{c.content}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
