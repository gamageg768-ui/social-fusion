'use client';
import { useState, useEffect, useRef } from 'react';
import type { GifResult } from '@/types';

interface Props {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function GifPicker({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [noKey, setNoKey] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = async (q: string) => {
    setLoading(true);
    const data = await fetch(`/api/gifs?q=${encodeURIComponent(q || 'trending')}`).then(r => r.json()).catch(() => ({ results: [] }));
    setGifs(data.results || []);
    setNoKey(!!data.no_key);
    setLoading(false);
  };

  useEffect(() => { search(''); inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { search('trending'); return; }
    const t = setTimeout(() => search(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div style={{
      position: 'absolute', bottom: '100%', left: 0, zIndex: 300,
      background: 'white', borderRadius: 12, border: '1.5px solid var(--blue-100)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)', width: 320, maxHeight: 380,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--gray-100)', display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          style={{ flex: 1, padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.85rem' }}
        />
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '1.1rem' }}>✕</button>
      </div>

      {noKey && (
        <div style={{ padding: '8px 12px', background: '#fff8e1', fontSize: '0.75rem', color: '#92400e' }}>
          Add <code>TENOR_API_KEY</code> to .env for real GIF search
        </div>
      )}

      <div style={{ overflowY: 'auto', flex: 1, padding: 8 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 6 }} />)}
          </div>
        ) : gifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)', fontSize: '0.85rem' }}>
            No GIFs found
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {gifs.map(gif => (
              <div key={gif.id} onClick={() => { onSelect(gif.url); onClose(); }}
                style={{ cursor: 'pointer', borderRadius: 6, overflow: 'hidden', aspectRatio: '1', background: 'var(--gray-100)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gif.preview || gif.url} alt={gif.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s' }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.transform = 'scale(1.05)')}
                  onMouseLeave={e => ((e.target as HTMLElement).style.transform = 'scale(1)')}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
