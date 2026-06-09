'use client';
import { useState } from 'react';
import type { Post } from '@/types';

interface Props { onPost?: (p: Post) => void; }

export default function CreatePost({ onPost }: Props) {
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [type, setType] = useState<'post' | 'tweet'>('post');

  const submit = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, post_type: type }),
      });
      const p = await res.json();
      onPost?.(p);
      setContent('');
    } catch (e) { console.error(e); }
    setPosting(false);
  };

  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://picsum.photos/seed/1114/40/40" alt="You" className="avatar" style={{ width: 40, height: 40 }} />
        <div style={{ flex: 1 }}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={type === 'tweet' ? "What's happening?" : 'Share something with your followers...'}
            rows={2}
            style={{
              width: '100%', border: 'none', outline: 'none', resize: 'none',
              fontSize: '0.95rem', color: 'var(--gray-700)', background: 'transparent',
              fontFamily: 'inherit', lineHeight: 1.5,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--blue-50)', paddingTop: 10, marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ emoji: '🖼️', label: 'Photo' }, { emoji: '🎬', label: 'Video' }, { emoji: '😊', label: 'Emoji' }, { emoji: '📍', label: 'Location' }].map(a => (
                <button key={a.label} className="btn btn-ghost btn-sm" style={{ fontSize: '1rem', padding: '4px 8px' }} title={a.label}>
                  {a.emoji}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
              <button onClick={() => setType(type === 'post' ? 'tweet' : 'post')}
                className="btn btn-outline btn-sm" style={{ fontSize: '0.8rem' }}>
                {type === 'post' ? '📝 Post' : '🐦 Tweet'}
              </button>
              <button onClick={submit} disabled={posting || !content.trim()} className="btn btn-primary btn-sm">
                {posting ? '...' : 'Share'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
