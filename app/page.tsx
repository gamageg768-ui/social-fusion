'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import Stories from '@/components/Feed/Stories';
import PostCard from '@/components/Feed/PostCard';
import CreatePost from '@/components/Feed/CreatePost';
import type { Post, Collection } from '@/types';

type FeedFilter = 'all' | 'post' | 'tweet' | 'foryou';
type FeedMix = 'friends' | 'balanced' | 'discover';

const MOOD_MAP: Record<string, number> = { '❤️': 1, '😂': 1, '👏': 1, '😮': 0, '😢': -1, '😡': -1 };
const PERSONAS = ['', 'Professional', 'Casual', 'Creative', 'Venting'] as const;

const TOPIC_TABS = [
  { key: '', label: '✨ All' },
  { key: 'tech',    label: '💻 Tech' },
  { key: 'art',     label: '🎨 Art' },
  { key: 'health',  label: '💪 Health' },
  { key: 'travel',  label: '✈️ Travel' },
  { key: 'music',   label: '🎵 Music' },
  { key: 'startup', label: '🚀 Startup' },
];

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [topic, setTopic] = useState('');
  const [feedMix, setFeedMix] = useState<FeedMix>('balanced');
  const [mutedWords, setMutedWords] = useState<string[]>([]);
  const [notInterestedIds, setNotInterestedIds] = useState<Set<number>>(new Set());
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showMutedSettings, setShowMutedSettings] = useState(false);
  const [newMutedWord, setNewMutedWord] = useState('');

  // F1 — Echo Chamber Detector
  const [echoScore, setEchoScore] = useState<{ score: number; unique_authors: number; total: number } | null>(null);
  const [dismissedEcho, setDismissedEcho] = useState(false);

  // F2 — Mood-Aware Feed Modulation
  const [showMoodBreak, setShowMoodBreak] = useState(false);
  const moodBreakTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // F3 — Social Proof Redaction
  const [socialProofHidden, setSocialProofHidden] = useState(false);

  // F12 — Persona Filter
  const [personaFilter, setPersonaFilter] = useState('');

  useEffect(() => {
    fetch('/api/users/me/muted-words').then(r => r.json()).then(setMutedWords).catch(() => {});
    fetch('/api/collections').then(r => r.json()).then(setCollections).catch(() => {});
    fetch('/api/users/me').then(r => r.json()).then((u) => { if (u?.feed_mix) setFeedMix(u.feed_mix as FeedMix); }).catch(() => {});
    // F1 — Echo Chamber score
    fetch('/api/posts/echo-score').then(r => r.json()).then(setEchoScore).catch(() => {});
    // F3 — Social Proof Redaction: restore from localStorage
    const hidden = typeof window !== 'undefined' && localStorage.getItem('social_proof_hidden') === 'true';
    if (hidden) { setSocialProofHidden(true); document.body.classList.add('hide-counts'); }
  }, []);

  const load = useCallback(async (p: number, f: FeedFilter, t: string, persona?: string) => {
    setLoading(true);
    try {
      let url = `/api/posts?page=${p}`;
      if (f === 'foryou') { url += '&feed=foryou'; if (t) url += `&topic=${t}`; }
      else if (f !== 'all') url += `&type=${f}`;
      if (persona) url += `&persona=${encodeURIComponent(persona)}`;
      const data = await fetch(url).then(r => r.json());
      if (p === 1) setPosts(data.posts);
      else setPosts(prev => [...prev, ...data.posts]);
      setHasNext(data.has_next);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    setPage(1);
    load(1, filter, topic, personaFilter);
  }, [filter, topic, personaFilter, load]);

  const setFeedMixAndSave = async (mix: FeedMix) => {
    setFeedMix(mix);
    await fetch('/api/users/me/feed-mix', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mix }),
    }).catch(() => {});
    setPage(1);
    load(1, filter, topic, personaFilter);
  };

  // F3 — Social Proof toggle
  const toggleSocialProof = () => {
    const next = !socialProofHidden;
    setSocialProofHidden(next);
    localStorage.setItem('social_proof_hidden', String(next));
    if (next) document.body.classList.add('hide-counts');
    else document.body.classList.remove('hide-counts');
  };

  // F2 — Mood score from visible posts reactions
  const moodScore = posts.slice(0, 20).reduce((sum, p) => sum + (MOOD_MAP[p.my_reaction ?? ''] ?? 0), 0);

  // F2 — show mood break banner when mood is low
  useEffect(() => {
    if (moodScore <= -5 && !showMoodBreak) setShowMoodBreak(true);
  }, [moodScore, showMoodBreak]);

  const startMoodBreak = () => {
    if (moodBreakTimer.current) clearTimeout(moodBreakTimer.current);
    setShowMoodBreak(false);
    // Hide feed for 30s
    moodBreakTimer.current = setTimeout(() => { moodBreakTimer.current = null; }, 30000);
  };

  const visiblePosts = posts.filter(p => {
    if (notInterestedIds.has(p.id)) return false;
    if (mutedWords.length > 0) {
      const lower = (p.content ?? '').toLowerCase();
      if (mutedWords.some(w => lower.includes(w))) return false;
    }
    return true;
  });

  const addMutedWord = async () => {
    if (!newMutedWord.trim()) return;
    const res = await fetch('/api/users/me/muted-words', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word: newMutedWord.trim() }),
    }).then(r => r.json()).catch(() => null);
    if (res) setMutedWords(res);
    setNewMutedWord('');
  };

  const removeMutedWord = async (word: string) => {
    const res = await fetch('/api/users/me/muted-words', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word }),
    }).then(r => r.json()).catch(() => null);
    if (res) setMutedWords(res);
  };

  const filterBtns: { key: FeedFilter; label: string }[] = [
    { key: 'all', label: '✨ All' },
    { key: 'foryou', label: '⚡ For You' },
    { key: 'post', label: '📝 Posts' },
    { key: 'tweet', label: '🐦 Tweets' },
  ];

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <Stories />
      <CreatePost onPost={p => setPosts(prev => [p, ...prev])} />

      {/* F1 — Echo Chamber Detector */}
      {echoScore && echoScore.score < 40 && !dismissedEcho && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: '#92400e' }}>
          <span style={{ fontSize: '1.2rem' }}>🫙</span>
          <div style={{ flex: 1 }}>
            <strong>Echo Chamber Alert</strong> — {Math.round(echoScore.score)}% of your recent likes are from just {echoScore.unique_authors} of {echoScore.total} authors.{' '}
            <a href="/explore" style={{ color: 'var(--blue-500)', fontWeight: 600, textDecoration: 'none' }}>Explore more voices →</a>
          </div>
          <button onClick={() => setDismissedEcho(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: '1rem' }}>✕</button>
        </div>
      )}

      {/* F2 — Mood Break banner */}
      {showMoodBreak && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.82rem', color: '#1e40af' }}>
          <span style={{ fontSize: '1.2rem' }}>🌿</span>
          <span style={{ flex: 1 }}>Your recent feed looks emotionally heavy. Take a breather?</span>
          <button onClick={startMoodBreak} style={{ background: 'var(--blue-500)', color: 'white', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
            Take 30s break
          </button>
          <button onClick={() => setShowMoodBreak(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e40af' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {filterBtns.map(b => (
          <button key={b.key} onClick={() => setFilter(b.key)}
            className={`btn btn-sm ${filter === b.key ? 'btn-primary' : 'btn-outline'}`}>
            {b.label}
          </button>
        ))}
        {/* F3 — Social Proof Redaction toggle */}
        <button onClick={toggleSocialProof} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem', color: socialProofHidden ? 'var(--blue-500)' : 'var(--gray-400)' }} title="Hide engagement counts">
          {socialProofHidden ? '👁 Counts hidden' : '👁 Hide counts'}
        </button>
        {/* Feature 6 — Muted Words settings */}
        <button onClick={() => setShowMutedSettings(v => !v)} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--gray-400)' }} title="Muted words">
          🔇 {mutedWords.length > 0 ? `${mutedWords.length} muted` : 'Mute words'}
        </button>
      </div>

      {/* F12 — Persona filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)', flexShrink: 0 }}>👤 Persona:</span>
        {PERSONAS.map(p => (
          <button key={p} onClick={() => setPersonaFilter(p)}
            style={{ fontSize: '0.72rem', padding: '2px 10px', borderRadius: 'var(--radius-full)', border: '1.5px solid var(--blue-100)', background: personaFilter === p ? 'var(--blue-500)' : 'white', color: personaFilter === p ? 'white' : 'var(--gray-600)', cursor: 'pointer' }}>
            {p === '' ? 'All' : p === 'Professional' ? '💼 Professional' : p === 'Casual' ? '😎 Casual' : p === 'Creative' ? '🎨 Creative' : '😤 Venting'}
          </button>
        ))}
      </div>

      {/* Feature 12 — Topic cluster tabs (only in foryou) */}
      {filter === 'foryou' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {TOPIC_TABS.map(t => (
            <button key={t.key} onClick={() => setTopic(t.key)}
              className={`btn btn-sm ${topic === t.key ? 'btn-primary' : 'btn-ghost'}`}
              style={{ flexShrink: 0, fontSize: '0.78rem', padding: '5px 12px' }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Feature 11 — Feed mix controls (only in foryou) */}
      {filter === 'foryou' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', flexShrink: 0 }}>Mix:</span>
          {(['friends', 'balanced', 'discover'] as FeedMix[]).map(m => (
            <button key={m} onClick={() => setFeedMixAndSave(m)}
              className={`btn btn-sm ${feedMix === m ? 'btn-outline' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '4px 10px', color: feedMix === m ? 'var(--blue-600)' : 'var(--gray-400)', textTransform: 'capitalize' }}>
              {m === 'friends' ? '👥 Friends' : m === 'discover' ? '🔭 Discover' : '⚖️ Balanced'}
            </button>
          ))}
        </div>
      )}

      {/* Feature 6 — Muted words panel */}
      {showMutedSettings && (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 10, color: 'var(--gray-700)' }}>🔇 Muted Words</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <input value={newMutedWord} onChange={e => setNewMutedWord(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addMutedWord()}
              placeholder="Add word to mute..."
              style={{ flex: 1, padding: '7px 12px', border: '1.5px solid var(--blue-100)', borderRadius: 8, fontSize: '0.85rem', outline: 'none' }} />
            <button onClick={addMutedWord} className="btn btn-primary btn-sm">Add</button>
          </div>
          {mutedWords.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', textAlign: 'center', padding: '8px 0' }}>No muted words yet</div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {mutedWords.map(w => (
                <span key={w} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: 'var(--gray-100)', borderRadius: 'var(--radius-full)', fontSize: '0.82rem', color: 'var(--gray-600)' }}>
                  {w}
                  <button onClick={() => removeMutedWord(w)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '0.8rem', padding: 0 }}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {visiblePosts.map(p => (
        <PostCard key={p.id} post={p}
          onNotInterested={id => setNotInterestedIds(prev => new Set([...prev, id]))}
          collections={collections.map(c => ({ id: c.id, name: c.name }))}
        />
      ))}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2].map(i => (
            <div key={i} className="card" style={{ padding: 16, gap: 12, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="skeleton" style={{ height: 14, width: '60%' }} />
                  <div className="skeleton" style={{ height: 12, width: '40%' }} />
                </div>
              </div>
              <div className="skeleton" style={{ height: 200, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      )}

      {hasNext && !loading && (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <button className="btn btn-outline" onClick={() => { const next = page + 1; setPage(next); load(next, filter, topic, personaFilter); }}>
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
