'use client';
import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { Post } from '@/types';

const GifPicker = dynamic(() => import('@/components/Common/GifPicker'), { ssr: false });

interface Props { onPost?: (p: Post) => void; }
interface ThreadSlide { content: string; imageUrl: string; showImageInput: boolean; }
function emptySlide(): ThreadSlide { return { content: '', imageUrl: '', showImageInput: false }; }

const VISIBILITY_OPTIONS = [
  { value: 'everyone', label: '🌐 Everyone' },
  { value: 'followers', label: '👥 Followers only' },
  { value: 'mentioned', label: '@ Mentioned only' },
] as const;

const POLL_DURATIONS = [
  { hours: 24, label: '1 day' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '7 days' },
];

const DRAFT_KEY = 'create_post_draft';

export default function CreatePost({ onPost }: Props) {
  const [mode, setMode] = useState<'single' | 'thread'>('single');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [type, setType] = useState<'post' | 'tweet'>('post');
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [slides, setSlides] = useState<ThreadSlide[]>([emptySlide()]);
  const [visibility, setVisibility] = useState<'everyone' | 'followers' | 'mentioned'>('everyone');
  const [showVisibility, setShowVisibility] = useState(false);

  // Standard Poll
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState(24);

  // Drafts
  const [hasDraft, setHasDraft] = useState(false);

  // Feature 9 — Hot Take (anonymous post)
  const [isHotTake, setIsHotTake] = useState(false);

  // Feature 7 — Custom Reaction Poll
  const [showReactionPoll, setShowReactionPoll] = useState(false);
  const [reactionPollQuestion, setReactionPollQuestion] = useState('How does this make you feel?');
  const [reactionPollOptions, setReactionPollOptions] = useState([
    { label: 'Love it', emoji: '❤️' },
    { label: 'Interesting', emoji: '🤔' },
    { label: 'Not sure', emoji: '😐' },
  ]);

  const [isSensitive, setIsSensitive] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [expiresIn, setExpiresIn] = useState('');
  const [showExpiry, setShowExpiry] = useState(false);
  const [collabUsername, setCollabUsername] = useState('');
  const [showCollab, setShowCollab] = useState(false);

  // F4 — Capsule Post
  const [showCapsule, setShowCapsule] = useState(false);
  const [lockedUntil, setLockedUntil] = useState('');

  // F5 — Commitment Post
  const [showCommitment, setShowCommitment] = useState(false);
  const [commitmentDeadline, setCommitmentDeadline] = useState('');

  // F6 — Ambient Live Widget
  const [showLiveWidget, setShowLiveWidget] = useState(false);
  const [liveWidgetType, setLiveWidgetType] = useState<'countdown' | 'text'>('countdown');
  const [liveWidgetTarget, setLiveWidgetTarget] = useState('');
  const [liveWidgetMessage, setLiveWidgetMessage] = useState('');

  // F12 — Persona Layering
  const [persona, setPersona] = useState('');
  const [showPersona, setShowPersona] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const slideFileRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const d = JSON.parse(saved);
        if (d.content) { setContent(d.content); setHasDraft(true); }
      } catch {}
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (content.trim()) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ content }));
    } else {
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
    }
  }, [content]);

  const clearDraft = () => { setContent(''); localStorage.removeItem(DRAFT_KEY); setHasDraft(false); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImageUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    setShowImageInput(true);
  };

  const handleSlideFile = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => updateSlide(idx, { imageUrl: ev.target?.result as string, showImageInput: true });
    reader.readAsDataURL(file);
  };

  const updateSlide = (idx: number, patch: Partial<ThreadSlide>) =>
    setSlides(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

  const addSlide = () => setSlides(prev => [...prev, emptySlide()]);
  const removeSlide = (idx: number) => setSlides(prev => prev.filter((_, i) => i !== idx));

  const submitSingle = async () => {
    if (!content.trim() && !imageUrl) return;
    setPosting(true);
    try {
      const body: Record<string, unknown> = {
        content, image_url: imageUrl, alt_text: altText, post_type: type, visibility,
      };
      if (scheduledAt) body.scheduled_at = new Date(scheduledAt).toISOString();
      if (showPoll && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2) {
        body.poll = { question: pollQuestion.trim(), options: pollOptions.filter(o => o.trim()), duration_hours: pollDuration };
      }
      if (isSensitive) body.is_sensitive = true;
      if (isHotTake) body.is_anonymous = true;
      if (locationName.trim()) body.location_name = locationName.trim();
      if (collabUsername.trim()) body.collab_username = collabUsername.trim().replace('@', '');
      if (persona) body.persona = persona;
      if (lockedUntil) body.locked_until = new Date(lockedUntil).toISOString();
      if (commitmentDeadline) body.commitment_deadline = new Date(commitmentDeadline).toISOString();
      if (showLiveWidget) {
        const widget = liveWidgetType === 'countdown'
          ? { type: 'countdown', target_date: liveWidgetTarget }
          : { type: 'text', message: liveWidgetMessage };
        body.live_widget = JSON.stringify(widget);
      }
      if (showReactionPoll) {
        const validOpts = reactionPollOptions.filter(o => o.label.trim());
        if (validOpts.length >= 2) {
          body.reaction_poll = { question: reactionPollQuestion.trim() || 'How does this make you feel?', options: validOpts };
        }
      }
      if (expiresIn) {
        const ms: Record<string, number> = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 };
        body.expires_at = new Date(Date.now() + ms[expiresIn]).toISOString();
      }
      const res = await fetch('/api/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const p = await res.json();
      onPost?.(p);
      setContent(''); setImageUrl(''); setAltText(''); setShowImageInput(false); setScheduledAt(''); setShowSchedule(false);
      setShowGif(false); setShowPoll(false); setPollQuestion(''); setPollOptions(['', '']);
      setIsSensitive(false); setLocationName(''); setShowLocationInput(false);
      setExpiresIn(''); setShowExpiry(false); setCollabUsername(''); setShowCollab(false);
      setIsHotTake(false); setShowReactionPoll(false);
      setReactionPollQuestion('How does this make you feel?');
      setReactionPollOptions([{ label: 'Love it', emoji: '❤️' }, { label: 'Interesting', emoji: '🤔' }, { label: 'Not sure', emoji: '😐' }]);
      setPersona(''); setShowPersona(false);
      setShowCapsule(false); setLockedUntil('');
      setShowCommitment(false); setCommitmentDeadline('');
      setShowLiveWidget(false); setLiveWidgetTarget(''); setLiveWidgetMessage('');
      localStorage.removeItem(DRAFT_KEY); setHasDraft(false);
    } catch (e) { console.error(e); }
    setPosting(false);
  };

  const submitThread = async () => {
    const valid = slides.filter(s => s.content.trim() || s.imageUrl);
    if (valid.length === 0) return;
    setPosting(true);
    try {
      const res = await fetch('/api/threads', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: valid.map(s => ({ content: s.content, image_url: s.imageUrl })) }),
      });
      const data = await res.json();
      if (data.posts?.[0]) onPost?.(data.posts[0]);
      setSlides([emptySlide()]);
    } catch (e) { console.error(e); }
    setPosting(false);
  };

  const submit = mode === 'thread' ? submitThread : submitSingle;
  const canSubmit = mode === 'thread'
    ? slides.some(s => s.content.trim() || s.imageUrl)
    : !!(content.trim() || imageUrl);

  const visLabel = VISIBILITY_OPTIONS.find(v => v.value === visibility)?.label ?? '🌐 Everyone';

  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <button onClick={() => setMode('single')} className={`btn btn-sm ${mode === 'single' ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '0.8rem' }}>
          📝 Post
        </button>
        <button onClick={() => setMode('thread')} className={`btn btn-sm ${mode === 'thread' ? 'btn-primary' : 'btn-ghost'}`} style={{ fontSize: '0.8rem' }}>
          🧵 Thread
        </button>
        {/* Feature 9 — Draft restore badge */}
        {hasDraft && (
          <span style={{ fontSize: '0.72rem', color: 'var(--blue-500)', background: 'var(--blue-50)', padding: '2px 8px', borderRadius: 'var(--radius-full)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            📝 Draft saved
            <button onClick={clearDraft} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '0.75rem', padding: 0 }}>✕</button>
          </span>
        )}
      </div>

      {mode === 'single' ? (
        <div style={{ display: 'flex', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://picsum.photos/seed/1114/40/40" alt="You" className="avatar" style={{ width: 40, height: 40 }} />
          <div style={{ flex: 1 }}>
            {isHotTake && (
              <div style={{ marginBottom: 8, padding: '6px 10px', background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 8, fontSize: '0.78rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                🔥 <strong>Hot Take mode:</strong> your identity will be hidden. You can reveal it later.
              </div>
            )}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={isHotTake ? '🔥 Share your hot take anonymously...' : type === 'tweet' ? "What's happening?" : 'Share something with your followers...'}
              rows={2}
              style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: '0.95rem', color: 'var(--gray-700)', background: 'transparent', fontFamily: 'inherit', lineHeight: 1.5 }}
            />

            {showImageInput && (
              <div style={{ marginBottom: 8 }}>
                {imageUrl ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, display: 'block' }} />
                    <button onClick={() => { setImageUrl(''); setAltText(''); setShowImageInput(false); }}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✕
                    </button>
                    {/* Feature 11 — Alt text */}
                    <input value={altText} onChange={e => setAltText(e.target.value)} placeholder="Add alt text for accessibility..."
                      style={{ marginTop: 6, width: '100%', padding: '5px 10px', border: '1px solid var(--blue-100)', borderRadius: 6, fontSize: '0.78rem', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                ) : (
                  <input
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="Paste image URL..."
                    style={{ width: '100%', padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.85rem', background: 'var(--gray-50)' }}
                    autoFocus
                  />
                )}
              </div>
            )}

            {showSchedule && (
              <div style={{ marginBottom: 8 }}>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.85rem' }} />
                {scheduledAt && (
                  <button onClick={() => { setScheduledAt(''); setShowSchedule(false); }}
                    style={{ marginLeft: 6, background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', fontSize: '0.85rem' }}>
                    ✕ Clear
                  </button>
                )}
              </div>
            )}

            {/* Feature 2 — Poll creator */}
            {showPoll && (
              <div style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--blue-50)', borderRadius: 10, border: '1.5px solid var(--blue-100)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--gray-700)', marginBottom: 8 }}>🗳 Create Poll</div>
                <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Ask a question..."
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--blue-200)', borderRadius: 8, fontSize: '0.85rem', outline: 'none', marginBottom: 6, boxSizing: 'border-box', background: 'white' }} />
                {pollOptions.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                    <input value={opt} onChange={e => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o); }}
                      placeholder={`Option ${i + 1}`}
                      style={{ flex: 1, padding: '6px 10px', border: '1px solid var(--blue-200)', borderRadius: 8, fontSize: '0.82rem', outline: 'none', background: 'white' }} />
                    {pollOptions.length > 2 && (
                      <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 4 && (
                  <button onClick={() => setPollOptions([...pollOptions, ''])}
                    style={{ fontSize: '0.78rem', color: 'var(--blue-500)', background: 'none', border: '1px dashed var(--blue-300)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', marginBottom: 6 }}>
                    + Add option
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>Duration:</span>
                  {POLL_DURATIONS.map(d => (
                    <button key={d.hours} onClick={() => setPollDuration(d.hours)}
                      style={{ fontSize: '0.75rem', padding: '3px 8px', border: '1px solid var(--blue-200)', borderRadius: 'var(--radius-full)', background: pollDuration === d.hours ? 'var(--blue-500)' : 'white', color: pollDuration === d.hours ? 'white' : 'var(--gray-600)', cursor: 'pointer' }}>
                      {d.label}
                    </button>
                  ))}
                  <button onClick={() => setShowPoll(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '0.85rem' }}>Remove poll</button>
                </div>
              </div>
            )}

            {/* Feature 7 — Custom Reaction Poll builder */}
            {showReactionPoll && (
              <div style={{ marginBottom: 10, padding: '10px 12px', background: '#fff8f0', borderRadius: 10, border: '1.5px solid #f97316' }}>
                <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#ea580c', marginBottom: 8 }}>🎭 Feeling Poll — ask your audience how this makes them feel</div>
                <input value={reactionPollQuestion} onChange={e => setReactionPollQuestion(e.target.value)}
                  placeholder="How does this make you feel?"
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid #fed7aa', borderRadius: 8, fontSize: '0.85rem', outline: 'none', marginBottom: 6, boxSizing: 'border-box', background: 'white' }} />
                {reactionPollOptions.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 5 }}>
                    <input value={opt.emoji} onChange={e => {
                      const o = [...reactionPollOptions]; o[i] = { ...o[i], emoji: e.target.value }; setReactionPollOptions(o);
                    }} placeholder="😊" style={{ width: 44, padding: '6px 4px', border: '1px solid #fed7aa', borderRadius: 8, fontSize: '0.9rem', outline: 'none', background: 'white', textAlign: 'center' }} />
                    <input value={opt.label} onChange={e => {
                      const o = [...reactionPollOptions]; o[i] = { ...o[i], label: e.target.value }; setReactionPollOptions(o);
                    }} placeholder={`Option ${i + 1}`}
                      style={{ flex: 1, padding: '6px 10px', border: '1px solid #fed7aa', borderRadius: 8, fontSize: '0.82rem', outline: 'none', background: 'white' }} />
                    {reactionPollOptions.length > 2 && (
                      <button onClick={() => setReactionPollOptions(reactionPollOptions.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
                    )}
                  </div>
                ))}
                {reactionPollOptions.length < 5 && (
                  <button onClick={() => setReactionPollOptions([...reactionPollOptions, { label: '', emoji: '💬' }])}
                    style={{ fontSize: '0.78rem', color: '#ea580c', background: 'none', border: '1px dashed #f97316', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', marginBottom: 4 }}>
                    + Add option
                  </button>
                )}
                <div style={{ textAlign: 'right' }}>
                  <button onClick={() => setShowReactionPoll(false)} style={{ fontSize: '0.75rem', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                </div>
              </div>
            )}

            {showLocationInput && (
              <div style={{ marginBottom: 8 }}>
                <input value={locationName} onChange={e => setLocationName(e.target.value)}
                  placeholder="📍 Add location name..."
                  style={{ width: '100%', padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box' }} />
              </div>
            )}

            {showExpiry && (
              <div style={{ marginBottom: 8, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>⏰ Expires after:</span>
                {['1h','6h','24h','7d'].map(opt => (
                  <button key={opt} onClick={() => setExpiresIn(expiresIn === opt ? '' : opt)}
                    style={{ fontSize: '0.75rem', padding: '3px 8px', border: '1px solid var(--blue-200)', borderRadius: 'var(--radius-full)', background: expiresIn === opt ? 'var(--blue-500)' : 'white', color: expiresIn === opt ? 'white' : 'var(--gray-600)', cursor: 'pointer' }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {showCollab && (
              <div style={{ marginBottom: 8 }}>
                <input value={collabUsername} onChange={e => setCollabUsername(e.target.value)}
                  placeholder="🤝 Invite collaborator @username..."
                  style={{ width: '100%', padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.85rem', boxSizing: 'border-box' }} />
              </div>
            )}

            {/* F4 — Capsule Post */}
            {showCapsule && (
              <div style={{ marginBottom: 8, padding: '8px 12px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10 }}>
                <div style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 600, marginBottom: 6 }}>🔒 Capsule — content is hidden until unlock date</div>
                <input type="datetime-local" value={lockedUntil} onChange={e => setLockedUntil(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #86efac', outline: 'none', fontSize: '0.85rem' }} />
                {lockedUntil && <button onClick={() => { setLockedUntil(''); setShowCapsule(false); }} style={{ marginLeft: 6, background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', fontSize: '0.85rem' }}>✕ Clear</button>}
              </div>
            )}

            {/* F5 — Commitment Post */}
            {showCommitment && (
              <div style={{ marginBottom: 8, padding: '8px 12px', background: '#fefce8', border: '1.5px solid #fde047', borderRadius: 10 }}>
                <div style={{ fontSize: '0.78rem', color: '#ca8a04', fontWeight: 600, marginBottom: 6 }}>🎯 Commitment — your followers will hold you accountable</div>
                <input type="datetime-local" value={commitmentDeadline} onChange={e => setCommitmentDeadline(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #fde047', outline: 'none', fontSize: '0.85rem' }} />
                {commitmentDeadline && <button onClick={() => { setCommitmentDeadline(''); setShowCommitment(false); }} style={{ marginLeft: 6, background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', fontSize: '0.85rem' }}>✕ Clear</button>}
              </div>
            )}

            {/* F6 — Live Widget */}
            {showLiveWidget && (
              <div style={{ marginBottom: 8, padding: '8px 12px', background: '#eff6ff', border: '1.5px solid #93c5fd', borderRadius: 10 }}>
                <div style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 600, marginBottom: 6 }}>📡 Live Widget — dynamic element shown in your post</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  {(['countdown', 'text'] as const).map(t => (
                    <button key={t} onClick={() => setLiveWidgetType(t)}
                      style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 'var(--radius-full)', border: '1px solid #93c5fd', background: liveWidgetType === t ? '#3b82f6' : 'white', color: liveWidgetType === t ? 'white' : 'var(--gray-600)', cursor: 'pointer' }}>
                      {t === 'countdown' ? '⏱ Countdown' : '📜 Scrolling text'}
                    </button>
                  ))}
                </div>
                {liveWidgetType === 'countdown'
                  ? <input type="datetime-local" value={liveWidgetTarget} onChange={e => setLiveWidgetTarget(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #93c5fd', outline: 'none', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} />
                  : <input value={liveWidgetMessage} onChange={e => setLiveWidgetMessage(e.target.value)}
                      placeholder="Enter scrolling text..."
                      style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #93c5fd', outline: 'none', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }} />
                }
                <button onClick={() => setShowLiveWidget(false)} style={{ marginTop: 4, background: 'none', border: 'none', fontSize: '0.75rem', color: 'var(--gray-400)', cursor: 'pointer' }}>Remove</button>
              </div>
            )}

            {/* F12 — Persona Selector */}
            {showPersona && (
              <div style={{ marginBottom: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>👤 Persona:</span>
                {[{ v: '', l: 'None' }, { v: 'Professional', l: '💼 Professional' }, { v: 'Casual', l: '😎 Casual' }, { v: 'Creative', l: '🎨 Creative' }, { v: 'Venting', l: '😤 Venting' }].map(p => (
                  <button key={p.v} onClick={() => setPersona(p.v)}
                    style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--blue-200)', background: persona === p.v ? 'var(--blue-500)' : 'white', color: persona === p.v ? 'white' : 'var(--gray-600)', cursor: 'pointer' }}>
                    {p.l}
                  </button>
                ))}
              </div>
            )}

            <div style={{ position: 'relative' }}>
              {showGif && (
                <GifPicker onSelect={url => { setImageUrl(url); setShowImageInput(true); setShowGif(false); }} onClose={() => setShowGif(false)} />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--blue-50)', paddingTop: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => { setShowImageInput(v => !v); setImageUrl(''); setShowGif(false); }}
                  className="btn btn-ghost btn-sm" style={{ fontSize: '1rem', padding: '4px 8px', color: showImageInput ? 'var(--blue-500)' : undefined }} title="Add image">
                  🖼️
                </button>
                <button onClick={() => fileRef.current?.click()} className="btn btn-ghost btn-sm" style={{ fontSize: '1rem', padding: '4px 8px' }} title="Upload photo">
                  📷
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                <button onClick={() => { setShowGif(v => !v); setShowImageInput(false); }}
                  className="btn btn-ghost btn-sm" style={{ fontSize: '1rem', padding: '4px 8px', color: showGif ? 'var(--blue-500)' : undefined }} title="GIF">
                  GIF
                </button>
                <button onClick={() => setShowSchedule(v => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '4px 8px', color: scheduledAt ? 'var(--blue-500)' : undefined }} title="Schedule">
                  🕐
                </button>
                {/* Feature 2 — Poll button */}
                <button onClick={() => setShowPoll(v => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '4px 8px', color: showPoll ? 'var(--blue-500)' : undefined }} title="Create poll">
                  🗳️
                </button>
                <button onClick={() => setIsSensitive(v => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '4px 8px', color: isSensitive ? 'var(--red-500)' : undefined }} title="Mark sensitive">
                  🔞
                </button>
                <button onClick={() => setShowLocationInput(v => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '4px 8px', color: showLocationInput ? 'var(--blue-500)' : undefined }} title="Add location">
                  📍
                </button>
                <button onClick={() => setShowExpiry(v => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '4px 8px', color: expiresIn ? 'var(--blue-500)' : undefined }} title="Set expiry">
                  ⏰
                </button>
                <button onClick={() => setShowCollab(v => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '4px 8px', color: showCollab ? 'var(--blue-500)' : undefined }} title="Invite collaborator">
                  🤝
                </button>
                {/* Feature 7 — Custom Reaction Poll */}
                <button onClick={() => setShowReactionPoll(v => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '4px 8px', color: showReactionPoll ? '#ea580c' : undefined }} title="Feeling poll">
                  🎭
                </button>
                {/* Feature 9 — Hot Take */}
                <button onClick={() => setIsHotTake(v => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '4px 8px', color: isHotTake ? '#dc2626' : undefined }} title="Post anonymously as Hot Take">
                  🔥
                </button>
                {/* F4 — Capsule */}
                <button onClick={() => setShowCapsule(v => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '4px 8px', color: lockedUntil ? '#16a34a' : undefined }} title="Time-locked capsule post">
                  🔒
                </button>
                {/* F5 — Commitment */}
                <button onClick={() => setShowCommitment(v => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '4px 8px', color: commitmentDeadline ? '#ca8a04' : undefined }} title="Commitment post">
                  🎯
                </button>
                {/* F6 — Live Widget */}
                <button onClick={() => setShowLiveWidget(v => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '4px 8px', color: showLiveWidget ? '#1d4ed8' : undefined }} title="Ambient live widget">
                  📡
                </button>
                {/* F12 — Persona */}
                <button onClick={() => setShowPersona(v => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '4px 8px', color: persona ? 'var(--blue-500)' : undefined }} title="Set persona">
                  👤
                </button>
                {/* Feature 7 — Visibility */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowVisibility(v => !v)} className="btn btn-ghost btn-sm" style={{ fontSize: '0.72rem', padding: '4px 8px', color: visibility !== 'everyone' ? 'var(--blue-500)' : undefined }} title="Audience">
                    {visLabel}
                  </button>
                  {showVisibility && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, background: 'white', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '1px solid var(--blue-100)', zIndex: 100, minWidth: 170, overflow: 'hidden', marginTop: 4 }}>
                      {VISIBILITY_OPTIONS.map(opt => (
                        <button key={opt.value} onClick={() => { setVisibility(opt.value); setShowVisibility(false); }}
                          style={{ display: 'block', width: '100%', padding: '9px 12px', background: visibility === opt.value ? 'var(--blue-50)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.82rem', color: 'var(--gray-700)', fontWeight: visibility === opt.value ? 600 : 400 }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                <button onClick={() => setType(type === 'post' ? 'tweet' : 'post')} className="btn btn-outline btn-sm" style={{ fontSize: '0.8rem' }}>
                  {type === 'post' ? '📝 Post' : '🐦 Tweet'}
                </button>
                <button onClick={submit} disabled={posting || !canSubmit} className="btn btn-primary btn-sm">
                  {posting ? '...' : scheduledAt ? 'Schedule' : 'Share'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <img src="https://picsum.photos/seed/1114/40/40" alt="You" className="avatar" style={{ width: 36, height: 36 }} />
            {slides.length > 1 && <div style={{ width: 2, flex: 1, background: 'var(--blue-100)', margin: '4px 0' }} />}
          </div>
          <div style={{ flex: 1 }}>
            {slides.map((slide, idx) => (
              <div key={idx} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: idx < slides.length - 1 ? '1px dashed var(--blue-50)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <textarea value={slide.content} onChange={e => updateSlide(idx, { content: e.target.value })}
                    placeholder={idx === 0 ? 'Start your thread...' : `Continue your thread (${idx + 1})...`}
                    rows={2}
                    style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', fontSize: '0.9rem', color: 'var(--gray-700)', background: 'transparent', fontFamily: 'inherit', lineHeight: 1.5 }} />
                  {slides.length > 1 && (
                    <button onClick={() => removeSlide(idx)}
                      style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer', fontSize: '0.9rem', padding: '2px 4px', marginLeft: 4 }}>
                      ✕
                    </button>
                  )}
                </div>
                {slide.imageUrl && (
                  <div style={{ position: 'relative', display: 'inline-block', marginTop: 6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slide.imageUrl} alt="preview" style={{ maxHeight: 140, maxWidth: '100%', borderRadius: 8, display: 'block' }} />
                    <button onClick={() => updateSlide(idx, { imageUrl: '', showImageInput: false })}
                      style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✕
                    </button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                  <button onClick={() => updateSlide(idx, { showImageInput: !slide.showImageInput, imageUrl: '' })}
                    className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '2px 6px' }} title="Image">
                    🖼️
                  </button>
                  <input ref={el => { slideFileRefs.current[idx] = el; }} type="file" accept="image/*"
                    onChange={e => handleSlideFile(idx, e)} style={{ display: 'none' }} />
                  <button onClick={() => slideFileRefs.current[idx]?.click()}
                    className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', padding: '2px 6px' }} title="Upload">
                    📷
                  </button>
                  {slide.showImageInput && !slide.imageUrl && (
                    <input value={slide.imageUrl} onChange={e => updateSlide(idx, { imageUrl: e.target.value })}
                      placeholder="Paste image URL..." autoFocus
                      style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.8rem' }} />
                  )}
                </div>
              </div>
            ))}
            <button onClick={addSlide} className="btn btn-ghost btn-sm" style={{ fontSize: '0.85rem', color: 'var(--blue-500)', marginBottom: 8 }}>
              + Add to thread
            </button>
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--blue-50)', paddingTop: 10, marginTop: 4 }}>
              <button onClick={submit} disabled={posting || !canSubmit} className="btn btn-primary btn-sm">
                {posting ? '...' : `Post Thread (${slides.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
