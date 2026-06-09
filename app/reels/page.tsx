'use client';
import { useEffect, useState } from 'react';
import type { Reel } from '@/types';

function fmtViews(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return String(n);
}

export default function Reels() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [likes, setLikes] = useState<Record<number, number>>({});

  useEffect(() => {
    fetch('/api/reels').then(r => r.json()).then((data: Reel[]) => {
      setReels(data);
      const l: Record<number, number> = {};
      data.forEach(r => { l[r.id] = r.likes_count; });
      setLikes(l);
    }).catch(console.error);
  }, []);

  const handleLike = async (reel: Reel) => {
    if (!liked.has(reel.id)) {
      setLiked(prev => new Set([...prev, reel.id]));
      setLikes(prev => ({ ...prev, [reel.id]: prev[reel.id] + 1 }));
      fetch(`/api/reels/${reel.id}/like`, { method: 'POST' }).catch(() => {});
    } else {
      setLiked(prev => { const n = new Set(prev); n.delete(reel.id); return n; });
      setLikes(prev => ({ ...prev, [reel.id]: prev[reel.id] - 1 }));
    }
  };

  if (!reels.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 8 }}>🎬</div>
        <div>Loading Reels...</div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 420, margin: '0 auto', position: 'relative' }}>
      <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', marginBottom: 16, color: 'var(--gray-800)' }}>
        🎬 Reels
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {reels.map(reel => (
          <div key={reel.id} style={{
            position: 'relative', borderRadius: 'var(--radius-lg)',
            overflow: 'hidden', aspectRatio: '9/16', maxHeight: 580,
            background: '#000', boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--blue-100)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={reel.thumbnail_url} alt={reel.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />

            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.3) 100%)' }} />

            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={reel.user.avatar} alt="" className="avatar" style={{ width: 38, height: 38, border: '2px solid white' }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>{reel.user.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem' }}>@{reel.user.username}</div>
              </div>
              <button style={{ color: 'white', background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                Follow
              </button>
            </div>

            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            </div>

            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 60, padding: '14px 16px' }}>
              <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem', marginBottom: 4 }}>{reel.title}</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>🎵</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reel.audio}</span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 16, color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>
                <span>👁 {fmtViews(reel.views_count)}</span>
                <span>💬 {fmtViews(reel.comments_count)}</span>
              </div>
            </div>

            <div style={{ position: 'absolute', bottom: 16, right: 12, display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
              <button onClick={() => handleLike(reel)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', color: liked.has(reel.id) ? '#ff4d6d' : 'white' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill={liked.has(reel.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span style={{ color: 'white', fontSize: '0.72rem', fontWeight: 600 }}>{fmtViews(likes[reel.id] ?? reel.likes_count)}</span>
              </button>
              <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{fmtViews(reel.comments_count)}</span>
              </button>
              <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', color: 'white' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
                <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>Share</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
