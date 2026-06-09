'use client';
import { useEffect, useState } from 'react';
import type { Story } from '@/types';

export default function Stories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [active, setActive] = useState<Story | null>(null);

  useEffect(() => {
    fetch('/api/stories').then(r => r.json()).then(setStories).catch(console.error);
  }, []);

  const viewStory = (s: Story) => {
    setActive(s);
    fetch(`/api/stories/${s.id}/view`, { method: 'POST' }).catch(() => {});
    setTimeout(() => setActive(null), 3000);
  };

  return (
    <>
      <div style={{
        background: 'var(--white)', borderRadius: 'var(--radius)',
        border: '1px solid var(--blue-100)', padding: 16, marginBottom: 16,
      }}>
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://picsum.photos/seed/1114/56/56" alt="You" className="avatar" style={{ width: 56, height: 56 }} />
              <div style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 20, height: 20, borderRadius: '50%',
                background: 'var(--blue-500)', border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 13, fontWeight: 700, lineHeight: 1,
              }}>+</div>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--gray-600)', fontWeight: 500, textAlign: 'center', maxWidth: 56 }}>Your Story</span>
          </div>

          {stories.map(story => (
            <div key={story.id} onClick={() => viewStory(story)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
              <div style={{
                padding: 2.5, borderRadius: '50%',
                background: story.viewed ? 'var(--gray-200)' : 'linear-gradient(135deg, var(--blue-400), #a855f7)',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={story.user.avatar} alt={story.user.name} className="avatar"
                  style={{ width: 52, height: 52, border: '2px solid white' }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--gray-600)', fontWeight: 500, textAlign: 'center', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {story.user.name.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {active && (
        <div onClick={() => setActive(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'relative', width: 340, maxHeight: '85vh', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.3)' }}>
              <div style={{ height: '100%', background: 'white', animation: 'progress 3s linear forwards' }} />
            </div>
            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 8, zIndex: 1 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={active.user.avatar} alt="" className="avatar" style={{ width: 34, height: 34, border: '2px solid white' }} />
              <span style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>{active.user.name}</span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.image_url} alt="" style={{ width: '100%', height: '85vh', objectFit: 'cover' }} />
          </div>
        </div>
      )}
    </>
  );
}
