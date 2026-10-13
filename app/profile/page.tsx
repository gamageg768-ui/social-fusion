'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { User, Post, ExpertiseClaim, PostAutopsy } from '@/types';
import type { Highlight, Achievement } from '@/types';
import PostCard from '@/components/Feed/PostCard';

function fmt(n: number) { return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<'posts' | 'photos' | 'liked' | 'autopsies'>('posts');
  const [pendingCount, setPendingCount] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState(5);
  const [tipMessage, setTipMessage] = useState('');
  const [tipSent, setTipSent] = useState(false);
  const [expertiseClaims, setExpertiseClaims] = useState<ExpertiseClaim[]>([]);
  const [newExpertiseTopic, setNewExpertiseTopic] = useState('');
  const [autopsies, setAutopsies] = useState<PostAutopsy[]>([]);

  useEffect(() => {
    fetch('/api/users/me').then(r => r.json()).then((u: User) => {
      setUser(u);
      if (u.is_private) {
        fetch('/api/users/me/follow-requests').then(r => r.json()).then(d => setPendingCount((d.requests || []).length));
      }
    });
    fetch('/api/posts?page=1').then(r => r.json()).then(d => setPosts(d.posts || [])).catch(console.error);
    fetch('/api/highlights').then(r => r.json()).then(d => setHighlights(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/achievements').then(r => r.json()).then(d => setAchievements(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/expertise').then(r => r.json()).then(d => setExpertiseClaims(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const handlePinChange = () => {
    fetch('/api/posts?page=1').then(r => r.json()).then(d => setPosts(d.posts || []));
  };

  const addExpertiseClaim = async () => {
    const topic = newExpertiseTopic.trim();
    if (!topic) return;
    const res = await fetch('/api/expertise', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic }),
    });
    if (res.ok) {
      const claim: ExpertiseClaim = await res.json();
      setExpertiseClaims(prev => [claim, ...prev]);
      setNewExpertiseTopic('');
    }
  };

  const voteExpertise = async (claimId: number) => {
    const res = await fetch(`/api/expertise/${claimId}/vote`, { method: 'POST' });
    if (res.ok) {
      const { vote_count, my_vote } = await res.json();
      setExpertiseClaims(prev => prev.map(c => c.id === claimId ? { ...c, vote_count, my_vote } : c));
    }
  };

  const loadAutopsies = async () => {
    const postsWithAutopsy = posts.filter(p => p.post_autopsy);
    setAutopsies(postsWithAutopsy.map(p => p.post_autopsy!));
  };

  const sendTip = async () => {
    if (!user) return;
    await fetch('/api/tips', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: user.id, amount: tipAmount, message: tipMessage }),
    }).catch(() => {});
    setTipSent(true);
  };

  if (!user) return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)', marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius)', marginBottom: 16 }} />
    </div>
  );

  const pinned = posts.find(p => p.is_pinned);
  const regular = posts.filter(p => !p.is_pinned);
  const displayPosts = pinned ? [pinned, ...regular] : regular;
  const photoPosts = posts.filter(p => p.image_url);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 60 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.cover} alt="" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
        <div style={{ position: 'absolute', bottom: -44, left: 24 }}>
          <div style={{ padding: 3, background: 'white', borderRadius: '50%', boxShadow: 'var(--shadow)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.avatar} alt={user.name} className="avatar" style={{ width: 88, height: 88 }} />
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: -44, right: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setShowTipModal(true)} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            💰 Tip
          </button>
          <Link href="/profile/edit" className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Profile
          </Link>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: 'var(--gray-900)' }}>{user.name}</h1>
            {user.is_verified && (
              <span style={{ width: 22, height: 22, background: 'var(--blue-500)', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </span>
            )}
            {user.is_private && (
              <span style={{ fontSize: '0.75rem', background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 12, color: 'var(--gray-500)', fontWeight: 600 }}>
                🔒 Private
              </span>
            )}
          </div>
          <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem', marginBottom: 10 }}>@{user.username}</div>
          {user.bio && <p style={{ color: 'var(--gray-700)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 10 }}>{user.bio}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: '0.8rem', color: 'var(--gray-500)' }}>
            {user.location && <span>📍 {user.location}</span>}
            {user.website && <a href={`https://${user.website}`} target="_blank" rel="noreferrer" style={{ color: 'var(--blue-500)', fontWeight: 500 }}>🔗 {user.website}</a>}
            <span>📅 Joined {new Date(user.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--blue-50)', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--gray-900)', fontFamily: 'Syne, sans-serif' }}>{fmt(user.posts_count)}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>Posts</div>
          </div>
          <Link href={`/profile/followers?id=${user.id}`} style={{ textAlign: 'center', textDecoration: 'none', cursor: 'pointer' }}>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--gray-900)', fontFamily: 'Syne, sans-serif' }}>{fmt(user.followers_count)}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>Followers</div>
          </Link>
          <Link href={`/profile/following?id=${user.id}`} style={{ textAlign: 'center', textDecoration: 'none', cursor: 'pointer' }}>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--gray-900)', fontFamily: 'Syne, sans-serif' }}>{fmt(user.following_count)}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>Following</div>
          </Link>

          {user.is_private && (
            <Link href="/profile/follow-requests" style={{ textAlign: 'center', textDecoration: 'none', cursor: 'pointer', position: 'relative' }}>
              <div style={{ fontWeight: 800, fontSize: '1.15rem', color: pendingCount > 0 ? 'var(--blue-500)' : 'var(--gray-900)', fontFamily: 'Syne, sans-serif' }}>{pendingCount}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>Requests</div>
            </Link>
          )}
        </div>
        {achievements.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--blue-50)' }}>
            {achievements.map(a => (
              <span key={a.id} style={{ fontSize: '0.72rem', padding: '3px 10px', background: 'linear-gradient(135deg, #fef9c3, #fde68a)', color: '#92400e', borderRadius: 'var(--radius-full)', fontWeight: 600, border: '1px solid #fcd34d' }}>
                {a.badge_type === 'first_post' ? '🌱 First Post' :
                 a.badge_type === 'popular' ? '🔥 Popular' :
                 a.badge_type === 'influencer' ? '⭐ Influencer' :
                 a.badge_type === 'social' ? '🤝 Social' :
                 a.badge_type === 'veteran' ? '🏆 Veteran' :
                 a.badge_type === 'prolific' ? '✍️ Prolific' :
                 a.badge_type === 'beloved' ? '❤️ Beloved' :
                 a.badge_type === 'megastar' ? '💫 Megastar' : a.badge_type}
              </span>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--blue-50)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>🎓 Expertise</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {expertiseClaims.map(c => (
              <button key={c.id} onClick={() => voteExpertise(c.id)}
                style={{ fontSize: '0.72rem', padding: '3px 10px', background: c.my_vote ? 'var(--blue-50)' : 'var(--gray-50)', color: c.my_vote ? 'var(--blue-600)' : 'var(--gray-600)', border: `1.5px solid ${c.my_vote ? 'var(--blue-200)' : 'var(--gray-200)'}`, borderRadius: 'var(--radius-full)', cursor: 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {c.vote_count >= 3 ? '✅' : '🔵'} {c.topic}
                <span style={{ opacity: 0.65 }}>·{c.vote_count}</span>
              </button>
            ))}
            {expertiseClaims.length === 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>No expertise claimed yet</span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={newExpertiseTopic} onChange={e => setNewExpertiseTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addExpertiseClaim()}
              placeholder="Add expertise topic..."
              style={{ flex: 1, padding: '5px 10px', borderRadius: 8, border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.8rem' }} />
            <button onClick={addExpertiseClaim} className="btn btn-primary btn-sm" style={{ padding: '5px 12px' }}>Add</button>
          </div>
        </div>
      </div>

      {highlights.length > 0 && (
        <div style={{ marginBottom: 16, overflowX: 'auto', display: 'flex', gap: 16, padding: '4px 0' }}>
          {highlights.map(h => (
            <div key={h.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', minWidth: 60 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2.5px solid var(--blue-400)', padding: 2, boxSizing: 'border-box' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.cover_url || 'https://picsum.photos/seed/hl/56/56'} alt={h.name}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--gray-600)', textAlign: 'center', maxWidth: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.name}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'posts' as const, label: '📝 Posts' },
          { key: 'photos' as const, label: '📸 Photos' },
          { key: 'liked' as const, label: '❤️ Liked' },
          { key: 'autopsies' as const, label: '🔬 Autopsies', onClick: loadAutopsies },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); t.onClick?.(); }}
            className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-outline'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'photos' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {photoPosts.map(p => (
            <div key={p.id} style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: 6, cursor: 'pointer' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                onMouseEnter={e => ((e.target as HTMLElement).style.transform = 'scale(1.05)')}
                onMouseLeave={e => ((e.target as HTMLElement).style.transform = 'scale(1)')} />
            </div>
          ))}
        </div>
      ) : tab === 'autopsies' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {autopsies.length === 0 ? (
            <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--gray-400)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔬</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No autopsies yet</div>
              <div style={{ fontSize: '0.82rem' }}>Open a post menu and tap "Post Autopsy" to archive its performance snapshot.</div>
            </div>
          ) : autopsies.map(a => {
            const post = posts.find(p => p.id === a.post_id);
            const topReactions = Array.isArray(a.top_reactions) ? a.top_reactions : [];
            return (
              <div key={a.id} className="card" style={{ padding: 16 }}>
                {post && <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: 10, borderBottom: '1px solid var(--blue-50)', paddingBottom: 8 }}>{post.content?.slice(0, 80)}{(post.content?.length ?? 0) > 80 ? '…' : ''}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
                  {[
                    { label: '❤️ Peak Likes', value: a.peak_likes },
                    { label: '💬 Peak Comments', value: a.peak_comments },
                    { label: '🔁 Peak Shares', value: a.peak_shares },
                    { label: '👁️ Total Views', value: a.total_views },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--gray-900)', fontFamily: 'Syne, sans-serif' }}>{stat.value}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)', marginTop: 2 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.78rem', color: 'var(--gray-500)' }}>
                  <span>⏱️ Avg dwell: {a.avg_dwell_secs.toFixed(1)}s</span>
                  {topReactions.length > 0 && (
                    <span style={{ display: 'flex', gap: 4 }}>
                      Top reactions: {topReactions.slice(0, 3).map(r => `${r.emoji}×${r.count}`).join(' ')}
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto' }}>Archived {new Date(a.archived_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {displayPosts.map(p => (
            <PostCard key={p.id} post={p} isOwn onPinChange={handlePinChange} />
          ))}
        </div>
      )}

      {showTipModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowTipModal(false); setTipSent(false); setTipMessage(''); }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, minWidth: 300, maxWidth: 380, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, marginBottom: 4, fontFamily: 'Syne, sans-serif' }}>💰 Send a Tip</h3>
            {tipSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
                <div style={{ fontWeight: 700 }}>Tip sent!</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginTop: 4 }}>Thank you for your support.</div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', marginBottom: 16 }}>Support {user?.name} with a tip</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {[1, 3, 5, 10].map(amt => (
                    <button key={amt} onClick={() => setTipAmount(amt)}
                      style={{ flex: 1, padding: '8px 0', border: tipAmount === amt ? '2px solid var(--blue-500)' : '1.5px solid var(--blue-100)', borderRadius: 8, background: tipAmount === amt ? 'var(--blue-50)' : 'white', cursor: 'pointer', fontWeight: 700, color: tipAmount === amt ? 'var(--blue-600)' : 'var(--gray-700)' }}>
                      ${amt}
                    </button>
                  ))}
                </div>
                <input value={tipMessage} onChange={e => setTipMessage(e.target.value)} placeholder="Add a message (optional)..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box', marginBottom: 14 }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowTipModal(false)} className="btn btn-ghost btn-sm">Cancel</button>
                  <button onClick={sendTip} className="btn btn-primary btn-sm">Send ${tipAmount}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
