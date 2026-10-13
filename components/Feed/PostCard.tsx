'use client';
import { useState, Fragment, useEffect, useRef, useCallback } from 'react';
import type { Post, Comment, PostPollVote, PostAnnotation, PostReactionVoteItem } from '@/types';
import { UserMention } from '@/components/Common/UserHoverCard';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function timeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
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

export function renderContent(text: string) {
  const parts = text.split(/(#\w+|@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      const tag = part.slice(1);
      return (
        <a key={i} href={`/hashtag/${encodeURIComponent(tag)}`}
          style={{ color: 'var(--blue-500)', fontWeight: 600, textDecoration: 'none' }}>
          {part}
        </a>
      );
    }
    if (part.startsWith('@')) {
      return <UserMention key={i} username={part.slice(1)} />;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

const REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👏'] as const;
const REACTION_LABELS: Record<string, string> = { '❤️': 'Love', '😂': 'Haha', '😮': 'Wow', '😢': 'Sad', '😡': 'Angry', '👏': 'Applause' };

function QuotedPost({ post }: { post: Post }) {
  return (
    <div style={{ border: '1.5px solid var(--blue-100)', borderRadius: 10, padding: '10px 12px', margin: '8px 0', background: 'var(--gray-50)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.user.avatar} alt={post.user.name} className="avatar" style={{ width: 20, height: 20 }} />
        <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--gray-800)' }}>{post.user.name}</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>@{post.user.username} · {timeAgo(post.created_at)}</span>
      </div>
      {post.content && <p style={{ fontSize: '0.85rem', color: 'var(--gray-700)', lineHeight: 1.5, margin: 0 }}>{renderContent(post.content)}</p>}
      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.image_url} alt={post.alt_text || ''} style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 6, marginTop: 6 }} />
      )}
    </div>
  );
}

interface Props {
  post: Post;
  onBookmarkChange?: (bookmarked: boolean, postId: number) => void;
  onNotInterested?: (postId: number) => void;
  isOwn?: boolean;
  onPinChange?: (postId: number, pinned: boolean) => void;
  threadMode?: boolean;
  collections?: { id: number; name: string }[];
}

const REPORT_REASONS = ['Spam', 'Hate speech', 'Misinformation', 'Nudity', 'Harassment', 'Other'];
const VISIBILITY_LABELS: Record<string, string> = { everyone: '🌐 Everyone', followers: '👥 Followers', mentioned: '@ Mentioned only' };

export default function PostCard({ post, onBookmarkChange, onNotInterested, isOwn, onPinChange, threadMode, collections = [] }: Props) {
  const [liked, setLiked] = useState(post.liked ?? false);
  const [likes, setLikes] = useState(post.likes_count);
  const [bookmarked, setBookmarked] = useState(post.bookmarked ?? false);
  const [shares, setShares] = useState(post.shares_count);
  const [pinned, setPinned] = useState(post.is_pinned);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [quoteContent, setQuoteContent] = useState('');
  const [showQuoteInput, setShowQuoteInput] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reported, setReported] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Feature 1 — Reactions
  const [myReaction, setMyReaction] = useState<string | null>(post.my_reaction ?? null);
  const [reactions, setReactions] = useState<{ emoji: string; count: number }[]>(() => {
    const grouped: Record<string, number> = {};
    for (const r of post.reactions ?? []) { grouped[r.emoji] = (grouped[r.emoji] || 0) + 1; }
    return Object.entries(grouped).map(([emoji, count]) => ({ emoji, count }));
  });
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Feature 4 — Analytics
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<{ view_count: number; likes_count: number; comments_count: number; shares_count: number; reaction_count: number; engagement_rate: string } | null>(null);

  // Feature 6 — Translate
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  // Feature 8 — Liked-by / Reposted-by
  const [showLikedBy, setShowLikedBy] = useState(false);
  const [likedByUsers, setLikedByUsers] = useState<{ id: number; name: string; username: string; avatar: string }[]>([]);
  const [showRepostedBy, setShowRepostedBy] = useState(false);
  const [repostedByUsers, setRepostedByUsers] = useState<{ id: number; name: string; username: string; avatar: string; post_type: string }[]>([]);

  // Feature 2 — Post Poll
  const [pollVotes, setPollVotes] = useState<PostPollVote[]>(post.post_poll?.votes ?? []);
  const [myPollVote, setMyPollVote] = useState<number | null>(null);

  // Feature 12 — Save to Collection
  const [showCollectionMenu, setShowCollectionMenu] = useState(false);

  // Multi-image carousel
  const [carouselIdx, setCarouselIdx] = useState(0);

  // Sensitive content blur
  const [showSensitive, setShowSensitive] = useState(false);

  // Feature 9 — Dwell time tracking
  const cardRef = useRef<HTMLDivElement>(null);
  const dwellStart = useRef<number | null>(null);
  const dwellFired = useRef(false);
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          dwellStart.current = Date.now();
        } else if (!entry.isIntersecting && dwellStart.current !== null && !dwellFired.current) {
          const seconds = (Date.now() - dwellStart.current) / 1000;
          if (seconds >= 3) {
            dwellFired.current = true;
            fetch('/api/posts/dwell', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ post_id: post.id, seconds: Math.round(seconds) }),
            }).catch(() => {});
          }
          dwellStart.current = null;
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [post.id]);

  // Feature 7 — show/hide reason tooltip
  const [showReason, setShowReason] = useState(false);

  const [following, setFollowing] = useState(false);

  // Feature 7 — Custom Reaction Poll
  const [reactionPollVotes, setReactionPollVotes] = useState<PostReactionVoteItem[]>(post.reaction_poll_votes ?? []);
  const [myReactionPollVote, setMyReactionPollVote] = useState<number | null>(post.my_reaction_poll_vote ?? null);

  // Feature 8 — Private Annotations
  const contentRef = useRef<HTMLDivElement>(null);
  const [textSelection, setTextSelection] = useState<{ text: string; startOffset: number; endOffset: number; x: number; y: number } | null>(null);
  const [showAnnotationInput, setShowAnnotationInput] = useState(false);
  const [annotationNote, setAnnotationNote] = useState('');
  const [annotations, setAnnotations] = useState<PostAnnotation[]>([]);
  const [showAnnotations, setShowAnnotations] = useState(false);

  // Feature 9 — Hot Take
  const [isAnonymous, setIsAnonymous] = useState(post.is_anonymous ?? false);
  const isOwnAnonymous = post.is_own_anonymous ?? false;

  // Feature 9 — Hot Take continued
  const isRepost = post.post_type === 'repost';
  const isQuote = post.post_type === 'quote';
  const displayPost = isRepost && post.ref_post ? post.ref_post : post;
  const isThread = !!post.thread_id;
  const effectiveAnonymous = isAnonymous && !isOwnAnonymous;

  // F4 — Capsule: check if still locked
  const [capsuleUnlocked, setCapsuleUnlocked] = useState(() =>
    !displayPost.locked_until || new Date(displayPost.locked_until) <= new Date()
  );
  useEffect(() => {
    if (capsuleUnlocked || !displayPost.locked_until) return;
    const id = setInterval(() => {
      if (new Date(displayPost.locked_until!) <= new Date()) {
        setCapsuleUnlocked(true); clearInterval(id);
      }
    }, 10000);
    return () => clearInterval(id);
  }, [displayPost.locked_until, capsuleUnlocked]);

  // F5 — Commitment: accountability votes
  const [accountability, setAccountability] = useState<{ kept: number; missed: number; my_vote: boolean | null } | null>(null);
  const isPastDeadline = displayPost.commitment_deadline ? new Date(displayPost.commitment_deadline) <= new Date() : false;
  useEffect(() => {
    if (!displayPost.commitment_deadline || !isPastDeadline) return;
    fetch(`/api/posts/${post.id}/accountability`).then(r => r.json()).then(setAccountability).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const voteAccountability = async (kept: boolean) => {
    const res = await fetch(`/api/posts/${post.id}/accountability`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kept }),
    }).then(r => r.json()).catch(() => null);
    if (res) setAccountability(res);
  };

  // F6 — Live Widget countdown
  const [liveCountdown, setLiveCountdown] = useState('');
  const liveWidget = (() => { try { return displayPost.live_widget ? JSON.parse(displayPost.live_widget) : null; } catch { return null; } })();
  useEffect(() => {
    if (!liveWidget || liveWidget.type !== 'countdown' || !liveWidget.target_date) return;
    const tick = () => {
      const diff = new Date(liveWidget.target_date).getTime() - Date.now();
      if (diff <= 0) { setLiveCountdown('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLiveCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayPost.live_widget]);

  // F8 — Stance for comments
  const [commentStance, setCommentStance] = useState<'' | 'agree' | 'disagree'>('');
  const [activeCommentTab, setActiveCommentTab] = useState<'all' | 'agree' | 'disagree'>('all');

  // F9 — Stale banner local dismiss
  const [isStaleLocal, setIsStaleLocal] = useState(displayPost.is_stale ?? false);
  const dismissStale = async () => {
    setIsStaleLocal(false);
    fetch(`/api/posts/${post.id}/stale`, { method: 'DELETE' }).catch(() => {});
  };

  // F11 — Post Autopsy
  const [showAutopsyModal, setShowAutopsyModal] = useState(false);
  const [autopsyData, setAutopsyData] = useState<import('@/types').PostAutopsy | null>(post.post_autopsy ?? null);
  const openAutopsy = async () => {
    let data = autopsyData;
    if (!data) {
      const created = await fetch(`/api/posts/${post.id}/autopsy`, { method: 'POST' }).then(r => r.json()).catch(() => null);
      if (created?.id) { data = created; setAutopsyData(created); }
    }
    setShowAutopsyModal(true); setShowMenu(false);
  };

  if (hidden) return null;

  const handleLike = async () => {
    const next = !liked;
    setLiked(next); setLikes(l => next ? l + 1 : l - 1);
    const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res) { setLiked(res.liked); setLikes(res.likes_count); }
  };

  const handleReact = async (emoji: string) => {
    setShowReactionPicker(false);
    const res = await fetch(`/api/posts/${post.id}/react`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }),
    }).then(r => r.json()).catch(() => null);
    if (res) {
      setMyReaction(res.my_reaction);
      setReactions(prev => {
        const copy = prev.filter(r => r.emoji !== emoji);
        if (res.my_reaction === emoji) return [...copy, { emoji, count: (prev.find(r => r.emoji === emoji)?.count ?? 0) + 1 }];
        const removed = prev.find(r => r.emoji === emoji);
        return removed && removed.count > 1 ? [...copy, { emoji, count: removed.count - 1 }] : copy;
      });
    }
  };

  const handleBookmark = async () => {
    const next = !bookmarked; setBookmarked(next);
    const res = await fetch(`/api/posts/${post.id}/bookmark`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res !== null) { setBookmarked(res.bookmarked); onBookmarkChange?.(res.bookmarked, post.id); }
  };

  const handlePin = async () => {
    const res = await fetch(`/api/posts/${post.id}/pin`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res) { setPinned(res.is_pinned); onPinChange?.(post.id, res.is_pinned); }
    setShowMenu(false);
  };

  const handleNotInterested = async () => {
    await fetch(`/api/posts/${post.id}/not-interested`, { method: 'POST' }).catch(() => {});
    setHidden(true); setShowMenu(false); onNotInterested?.(post.id);
  };

  const handleTranslate = async () => {
    if (translated) { setTranslated(null); return; }
    setTranslating(true);
    const res = await fetch(`/api/posts/${post.id}/translate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: displayPost.content, target_lang: 'en' }),
    }).then(r => r.json()).catch(() => null);
    setTranslated(res?.translated ?? null);
    setTranslating(false);
  };

  const loadAnalytics = async () => {
    const res = await fetch(`/api/posts/${post.id}/analytics`).then(r => r.json()).catch(() => null);
    if (res) setAnalytics(res);
    setShowAnalytics(true);
  };

  const loadLikedBy = async () => {
    const res = await fetch(`/api/posts/${post.id}/liked-by`).then(r => r.json()).catch(() => []);
    setLikedByUsers(res); setShowLikedBy(true);
  };

  const loadRepostedBy = async () => {
    const res = await fetch(`/api/posts/${post.id}/reposted-by`).then(r => r.json()).catch(() => []);
    setRepostedByUsers(res); setShowRepostedBy(true);
  };

  const votePoll = async (optionIdx: number) => {
    const res = await fetch(`/api/posts/${post.id}/poll/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ option_idx: optionIdx }),
    }).then(r => r.json()).catch(() => null);
    if (res) { setPollVotes(res.votes); setMyPollVote(res.my_vote); }
  };

  const addToCollection = async (colId: number) => {
    await fetch(`/api/collections/${colId}/posts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: post.id }),
    }).catch(() => {});
    setShowCollectionMenu(false); setShowMenu(false);
  };

  const loadComments = async () => {
    if (!showComments) {
      const data = await fetch(`/api/posts/${post.id}/comments`).then(r => r.json()).catch(() => []);
      setComments(data);
    }
    setShowComments(v => !v);
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: comment, parent_id: replyTo?.id, stance: replyTo ? '' : commentStance }),
    }).then(r => r.json()).catch(() => null);
    if (res) {
      if (replyTo) {
        setComments(prev => prev.map(c => c.id === replyTo.id ? { ...c, replies: [...(c.replies || []), res] } : c));
      } else {
        setComments(prev => [{ ...res, replies: [] }, ...prev]);
      }
    }
    setComment(''); setReplyTo(null); setCommentStance('');
  };

  const handleRepost = async () => {
    await fetch(`/api/posts/${post.id}/repost`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quote_content: '' }) }).catch(() => {});
    setShares(s => s + 1); setShowRepostModal(false);
  };

  const handleQuote = async () => {
    if (!quoteContent.trim()) return;
    await fetch(`/api/posts/${post.id}/repost`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quote_content: quoteContent }) }).catch(() => {});
    setShares(s => s + 1); setShowRepostModal(false); setShowQuoteInput(false); setQuoteContent('');
  };

  const handleReport = async () => {
    if (!reportReason) return;
    await fetch(`/api/posts/${post.id}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: reportReason }) }).catch(() => {});
    setReported(true); setShowReportModal(false);
  };

  // Feature 7 — Custom Reaction Poll vote
  const voteReactionPoll = async (optionIdx: number) => {
    const res = await fetch(`/api/posts/${post.id}/reaction-poll/vote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ option_idx: optionIdx }),
    }).then(r => r.json()).catch(() => null);
    if (res) { setReactionPollVotes(res.votes); setMyReactionPollVote(res.my_vote); }
  };

  // Feature 8 — Annotations
  const handleTextSelect = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !contentRef.current?.contains(sel.anchorNode)) {
      setTextSelection(null); return;
    }
    const text = sel.toString().trim();
    if (text.length < 2) { setTextSelection(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setTextSelection({ text, startOffset: range.startOffset, endOffset: range.endOffset, x: rect.left + rect.width / 2, y: rect.top });
  }, []);

  const saveAnnotation = async () => {
    if (!textSelection || !annotationNote.trim()) return;
    const res = await fetch(`/api/posts/${post.id}/annotations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_text: textSelection.text, start_offset: textSelection.startOffset, end_offset: textSelection.endOffset, note: annotationNote, visibility: 'private' }),
    }).then(r => r.json()).catch(() => null);
    if (res?.id) {
      setAnnotations(prev => [res, ...prev]);
      setAnnotationNote(''); setTextSelection(null); setShowAnnotationInput(false); setShowAnnotations(true);
    }
  };

  const loadAnnotations = async () => {
    const data = await fetch(`/api/posts/${post.id}/annotations`).then(r => r.json()).catch(() => []);
    setAnnotations(data); setShowAnnotations(v => !v);
  };

  const deleteAnnotation = async (annotId: number) => {
    await fetch(`/api/posts/${post.id}/annotations`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ annotation_id: annotId }) }).catch(() => {});
    setAnnotations(prev => prev.filter(a => a.id !== annotId));
  };

  // Feature 9 — Deanonymize
  const handleDeanonymize = async () => {
    const res = await fetch(`/api/posts/${post.id}/deanonymize`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res) setIsAnonymous(false);
  };

  // Poll rendering
  const poll = post.post_poll;
  const pollOptions: string[] = poll ? (() => { try { return JSON.parse(poll.options); } catch { return []; } })() : [];
  const pollTotal = pollVotes.length;
  const pollEnded = poll ? new Date(poll.ends_at) < new Date() : false;
  const canVote = poll && !pollEnded && myPollVote === null;

  const totalReactions = reactions.reduce((s, r) => s + r.count, 0);

  return (
    <>
      <article ref={cardRef} className="card fade-in" style={{ marginBottom: threadMode ? 0 : 16, overflow: 'hidden', borderRadius: threadMode ? 0 : undefined, borderBottom: threadMode ? '1px solid var(--blue-50)' : undefined }}>
        {pinned && (
          <div style={{ padding: '6px 16px 0', fontSize: '0.75rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 2.5L21.5 6.5L14.5 13.5L17.5 20.5L14.5 17.5L7.5 16.5L2.5 21.5L3.5 16.5L0.5 13.5L7.5 10.5L8.5 3.5L14.5 7.5L17.5 2.5Z"/></svg>
            Pinned Post
          </div>
        )}
        {isRepost && (
          <div style={{ padding: '8px 16px 0', fontSize: '0.78rem', color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            {post.user.name} reposted
          </div>
        )}
        {isThread && !threadMode && (
          <a href={`/thread/${post.thread_id}`} style={{ display: 'block', padding: '6px 16px 0', fontSize: '0.75rem', color: 'var(--blue-500)', fontWeight: 600, textDecoration: 'none' }}>
            🧵 View thread
          </a>
        )}

        {/* Feature 9 — Hot Take banner */}
        {isAnonymous && (
          <div style={{ padding: '6px 16px 0', fontSize: '0.75rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
            🔥 <strong>Hot Take</strong>
            {isOwnAnonymous && (
              <button onClick={handleDeanonymize} style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--blue-500)', background: 'none', border: '1px solid var(--blue-200)', borderRadius: 'var(--radius-full)', padding: '1px 8px', cursor: 'pointer' }}>
                Reveal my identity
              </button>
            )}
          </div>
        )}

        <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
            {effectiveAnonymous ? (
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#dc2626,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>🔥</div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayPost.user.avatar} alt={displayPost.user.name} className="avatar" style={{ width: 42, height: 42 }} />
            )}
            {!effectiveAnonymous && displayPost.user.is_verified && (
              <span style={{ position: 'absolute', bottom: -1, right: -1, width: 16, height: 16, background: 'var(--blue-500)', borderRadius: '50%', border: '1.5px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </span>
            )}
            {displayPost.collab_user && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayPost.collab_user.avatar} alt={displayPost.collab_user.name} className="avatar"
                style={{ width: 28, height: 28, marginLeft: -10, border: '2px solid white', borderRadius: '50%' }} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem', color: effectiveAnonymous ? '#dc2626' : 'var(--gray-800)' }}>
                {effectiveAnonymous ? '🔥 Anonymous' : (isOwnAnonymous ? `🔥 You (hidden)` : displayPost.user.name)}
              </span>
              {displayPost.collab_user && (
                <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>& @{displayPost.collab_user.username}</span>
              )}
              {displayPost.user.is_private && <span style={{ fontSize: '0.7rem', padding: '1px 6px', background: 'var(--gray-100)', color: 'var(--gray-500)', borderRadius: 'var(--radius-full)' }}>🔒 Private</span>}
              {displayPost.post_type === 'tweet' && <span style={{ fontSize: '0.7rem', padding: '1px 7px', background: 'var(--blue-50)', color: 'var(--blue-500)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>Tweet</span>}
              {/* Feature 7 — Audience badge */}
              {displayPost.visibility && displayPost.visibility !== 'everyone' && (
                <span style={{ fontSize: '0.68rem', padding: '1px 6px', background: 'var(--gray-100)', color: 'var(--gray-500)', borderRadius: 'var(--radius-full)' }}>
                  {VISIBILITY_LABELS[displayPost.visibility] ?? displayPost.visibility}
                </span>
              )}
              {/* F12 — Persona chip */}
              {displayPost.persona && (() => {
                const p = displayPost.persona;
                const map: Record<string, { bg: string; color: string; icon: string }> = {
                  Professional: { bg: '#f1f5f9', color: '#334155', icon: '💼' },
                  Casual: { bg: '#fefce8', color: '#ca8a04', icon: '😎' },
                  Creative: { bg: '#faf5ff', color: '#7c3aed', icon: '🎨' },
                  Venting: { bg: '#fef2f2', color: '#dc2626', icon: '😤' },
                };
                const style = map[p] ?? { bg: '#f1f5f9', color: '#475569', icon: '👤' };
                return <span style={{ fontSize: '0.68rem', padding: '1px 7px', background: style.bg, color: style.color, borderRadius: 'var(--radius-full)', fontWeight: 600 }}>{style.icon} {p}</span>;
              })()}
              {/* F5 — Commitment deadline badge */}
              {displayPost.commitment_deadline && (
                <span style={{ fontSize: '0.68rem', padding: '1px 7px', background: isPastDeadline ? '#fef2f2' : '#fefce8', color: isPastDeadline ? '#dc2626' : '#ca8a04', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                  🎯 {isPastDeadline ? 'Past due' : `Due in ${timeUntil(displayPost.commitment_deadline)}`}
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span>{effectiveAnonymous ? '@anonymous' : `@${displayPost.user.username}`}</span><span>·</span><span>{timeAgo(displayPost.created_at)}</span>
              {displayPost.scheduled_at && <><span>·</span><span style={{ color: 'var(--blue-400)' }}>🕐 Scheduled</span></>}
              {displayPost.expires_at && new Date(displayPost.expires_at) > new Date() && (() => {
                const ms = new Date(displayPost.expires_at).getTime() - Date.now();
                const mins = Math.floor(ms / 60000);
                const hrs = Math.floor(mins / 60);
                return <><span>·</span><span style={{ color: 'var(--gray-500)' }}>⏳ {hrs > 0 ? `${hrs}h` : `${mins}m`} left</span></>;
              })()}
              {/* Feature 7 — feed reason tooltip */}
              {post.feed_reason && (
                <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                  <button
                    onClick={() => setShowReason(v => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--gray-400)', fontSize: '0.75rem', lineHeight: 1, display: 'flex', alignItems: 'center' }}
                    title={post.feed_reason}
                  >ℹ️</button>
                  {showReason && (
                    <span style={{
                      position: 'absolute', left: 0, top: '100%', marginTop: 4, zIndex: 50,
                      background: 'var(--gray-800)', color: 'white', fontSize: '0.72rem',
                      padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none',
                    }}>
                      {post.feed_reason}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, position: 'relative' }}>
            {isOwn ? (
              <>
                <button onClick={() => setShowMenu(v => !v)} className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-400)', padding: '4px 6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
                {showMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', background: 'white', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid var(--blue-100)', zIndex: 200, minWidth: 180, overflow: 'hidden' }}>
                    <button onClick={handlePin} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--gray-700)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      {pinned ? '📌 Unpin post' : '📌 Pin to profile'}
                    </button>
                    <button onClick={loadAnalytics} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--gray-700)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      📊 Analytics
                    </button>
                    <button onClick={openAutopsy} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--gray-700)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      🔬 Post Autopsy
                    </button>
                    <button onClick={() => { setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--red-500)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      🗑️ Delete post
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={async () => {
                    const res = await fetch(`/api/users/${displayPost.user.id}/follow`, { method: 'POST' }).then(r => r.json()).catch(() => null);
                    if (res) setFollowing(res.following);
                  }}
                  className={`btn btn-sm ${following ? 'btn-ghost' : 'btn-outline'}`}
                >
                  {following ? 'Following' : 'Follow'}
                </button>
                <button onClick={() => setShowMenu(v => !v)} className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-400)', padding: '4px 6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                </button>
                {showMenu && (
                  <div style={{ position: 'absolute', right: 0, top: '100%', background: 'white', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid var(--blue-100)', zIndex: 200, minWidth: 180, overflow: 'hidden' }}>
                    {/* Feature 7 — Not interested */}
                    <button onClick={handleNotInterested} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--gray-700)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      ⛔ Not interested
                    </button>
                    <button onClick={() => { setShowReportModal(true); setShowMenu(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--gray-700)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      🚩 Report
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* F9 — Stale Claim banner */}
        {isStaleLocal && (
          <div style={{ margin: '0 16px 8px', padding: '7px 12px', background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem', color: '#92400e' }}>
            <span style={{ flex: 1 }}>⚠️ This claim may be outdated (posted over 30 days ago)</span>
            <button onClick={dismissStale} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: '0.72rem', fontWeight: 600 }}>Dismiss</button>
          </div>
        )}

        {/* F4 — Capsule lock overlay */}
        {displayPost.locked_until && !capsuleUnlocked ? (
          <div style={{ margin: '0 16px 12px', padding: '24px 16px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔒</div>
            <div style={{ fontWeight: 700, color: '#15803d', fontSize: '0.95rem' }}>Capsule Post</div>
            <div style={{ fontSize: '0.8rem', color: '#16a34a', marginTop: 4 }}>Unlocks in {timeUntil(displayPost.locked_until)}</div>
          </div>
        ) : displayPost.content && (
          <div ref={contentRef} onMouseUp={handleTextSelect} style={{ padding: '0 16px 12px', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--gray-700)', userSelect: 'text' }}>
            {renderContent(displayPost.content)}
            {/* Feature 6 — Translate */}
            <div style={{ marginTop: 4 }}>
              <button onClick={handleTranslate} style={{ fontSize: '0.72rem', color: 'var(--blue-500)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {translating ? '🌐 Translating…' : translated ? '🌐 Show original' : '🌐 Translate'}
              </button>
            </div>
            {translated && (
              <div style={{ marginTop: 6, padding: '8px 10px', background: 'var(--blue-50)', borderRadius: 8, fontSize: '0.87rem', color: 'var(--gray-700)', fontStyle: 'italic', lineHeight: 1.5 }}>
                {translated}
              </div>
            )}
          </div>
        )}

        {/* F6 — Live Widget */}
        {liveWidget && (
          <div style={{ margin: '0 16px 10px', padding: '10px 14px', background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1.5px solid #93c5fd', borderRadius: 10, textAlign: 'center' }}>
            {liveWidget.type === 'countdown' ? (
              <>
                <div style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 600, marginBottom: 4 }}>📡 Live Countdown</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e40af', fontFamily: 'monospace', letterSpacing: 2 }}>{liveCountdown || '...'}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 600, marginBottom: 4 }}>📡 Live</div>
                <div style={{ fontSize: '0.9rem', color: '#1e40af', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {liveWidget.message}
                </div>
              </>
            )}
          </div>
        )}

        {/* F7 — Conversation Depth Badge */}
        {(displayPost.conversation_depth ?? 0) >= 5 && (
          <div style={{ padding: '0 16px 6px' }}>
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#f0fdfa', color: '#0d9488', border: '1px solid #99f6e4', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
              💬 Depth {Math.round((displayPost.conversation_depth ?? 0) * 10) / 10}/10
            </span>
          </div>
        )}

        {/* F5 — Accountability votes (after deadline) */}
        {isPastDeadline && displayPost.commitment_deadline && (
          <div style={{ margin: '0 16px 10px', padding: '10px 12px', background: '#fefce8', border: '1.5px solid #fde047', borderRadius: 10 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#92400e', marginBottom: 8 }}>🎯 Did they keep their commitment?</div>
            {accountability ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => voteAccountability(true)} disabled={accountability.my_vote === true}
                  style={{ flex: 1, padding: '6px', background: accountability.my_vote === true ? '#dcfce7' : 'white', border: '1.5px solid #86efac', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#15803d' }}>
                  ✅ Yes ({accountability.kept})
                </button>
                <button onClick={() => voteAccountability(false)} disabled={accountability.my_vote === false}
                  style={{ flex: 1, padding: '6px', background: accountability.my_vote === false ? '#fee2e2' : 'white', border: '1.5px solid #fca5a5', borderRadius: 8, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#dc2626' }}>
                  ❌ No ({accountability.missed})
                </button>
              </div>
            ) : <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>Loading votes…</div>}
          </div>
        )}

        {/* Location badge + collab info row */}
        {(displayPost.location_name || displayPost.collab_user) && (
          <div style={{ padding: '0 16px 8px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {displayPost.location_name && (
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', background: 'var(--gray-100)', color: 'var(--gray-600)', borderRadius: 'var(--radius-full)' }}>
                📍 {displayPost.location_name}
              </span>
            )}
          </div>
        )}

        {isQuote && post.ref_post && <div style={{ padding: '0 16px 8px' }}><QuotedPost post={post.ref_post} /></div>}

        {/* Feature A — Multi-image carousel / Feature B — Sensitive blur / Feature 11 — Alt text */}
        {displayPost.image_urls && displayPost.image_urls.length > 1 ? (
          <div style={{ overflow: 'hidden', maxHeight: 380, position: 'relative' }}>
            <div style={{ filter: displayPost.is_sensitive && !showSensitive ? 'blur(12px)' : undefined, transition: 'filter 0.2s' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayPost.image_urls[carouselIdx]} alt={displayPost.alt_text || ''}
                style={{ width: '100%', maxHeight: 380, objectFit: 'cover' }} />
            </div>
            {displayPost.is_sensitive && !showSensitive && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={() => setShowSensitive(true)}
                  style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  👁 Show content
                </button>
              </div>
            )}
            {(showSensitive || !displayPost.is_sensitive) && (
              <>
                <button onClick={() => setCarouselIdx(i => Math.max(0, i - 1))}
                  style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: carouselIdx === 0 ? 0.3 : 1 }}>
                  ‹
                </button>
                <button onClick={() => setCarouselIdx(i => Math.min(displayPost.image_urls!.length - 1, i + 1))}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: carouselIdx === displayPost.image_urls!.length - 1 ? 0.3 : 1 }}>
                  ›
                </button>
              </>
            )}
            <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
              {displayPost.image_urls.map((_, i) => (
                <button key={i} onClick={() => setCarouselIdx(i)}
                  style={{ width: 7, height: 7, borderRadius: '50%', border: 'none', background: i === carouselIdx ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0 }} />
              ))}
            </div>
            {displayPost.alt_text && (
              <span style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>ALT</span>
            )}
          </div>
        ) : displayPost.image_url ? (
          <div style={{ overflow: 'hidden', maxHeight: 380, position: 'relative' }}>
            <div style={{ filter: displayPost.is_sensitive && !showSensitive ? 'blur(12px)' : undefined, transition: 'filter 0.2s' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayPost.image_url} alt={displayPost.alt_text || ''} aria-label={displayPost.alt_text || undefined}
                style={{ width: '100%', maxHeight: 380, objectFit: 'cover' }} />
            </div>
            {displayPost.is_sensitive && !showSensitive && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button onClick={() => setShowSensitive(true)}
                  style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  👁 Show content
                </button>
              </div>
            )}
            {displayPost.alt_text && (
              <span style={{ position: 'absolute', bottom: 6, left: 6, background: 'rgba(0,0,0,0.55)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>ALT</span>
            )}
          </div>
        ) : null}

        {/* Feature 2 — Post Poll */}
        {poll && pollOptions.length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--gray-700)', marginBottom: 8 }}>🗳 {poll.question}</div>
            {pollOptions.map((opt, idx) => {
              const count = pollVotes.filter(v => v.option_idx === idx).length;
              const pct = pollTotal > 0 ? Math.round((count / pollTotal) * 100) : 0;
              const voted = myPollVote === idx || (!canVote && pollVotes.some(v => v.option_idx === idx));
              return (
                <button key={idx} onClick={() => canVote && votePoll(idx)} disabled={!canVote}
                  style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6, padding: '8px 12px',
                    background: 'var(--gray-50)', border: voted ? '2px solid var(--blue-400)' : '1.5px solid var(--blue-100)',
                    borderRadius: 8, cursor: canVote ? 'pointer' : 'default', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'var(--blue-100)', transition: 'width 0.4s' }} />
                  <span style={{ position: 'relative', fontSize: '0.85rem', fontWeight: 500 }}>{opt}</span>
                  <span style={{ position: 'relative', float: 'right', fontSize: '0.8rem', color: 'var(--gray-500)', fontWeight: 600 }}>{pct}%</span>
                </button>
              );
            })}
            <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4 }}>
              {pollTotal} vote{pollTotal !== 1 ? 's' : ''} · {pollEnded ? 'Poll ended' : `Ends in ${timeUntil(poll.ends_at)}`}
            </div>
          </div>
        )}

        {/* Feature 7 — Custom Reaction Poll */}
        {post.reaction_poll && post.reaction_poll.options.length >= 2 && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#ea580c', marginBottom: 8 }}>
              🎭 {post.reaction_poll.question}
            </div>
            {post.reaction_poll.options.map((opt, idx) => {
              const count = reactionPollVotes.filter(v => v.option_idx === idx).length;
              const total = reactionPollVotes.length;
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const voted = myReactionPollVote === idx;
              return (
                <button key={idx} onClick={() => voteReactionPoll(idx)}
                  style={{ display: 'flex', width: '100%', textAlign: 'left', marginBottom: 6, padding: '7px 12px', background: 'var(--gray-50)', border: voted ? '2px solid #f97316' : '1.5px solid #fed7aa', borderRadius: 8, cursor: 'pointer', position: 'relative', overflow: 'hidden', alignItems: 'center', gap: 8 }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: '#fff7ed', transition: 'width 0.4s' }} />
                  <span style={{ position: 'relative', fontSize: '1rem' }}>{opt.emoji}</span>
                  <span style={{ position: 'relative', fontSize: '0.83rem', fontWeight: 500, flex: 1 }}>{opt.label}</span>
                  {total > 0 && <span style={{ position: 'relative', fontSize: '0.75rem', color: '#ea580c', fontWeight: 600 }}>{pct}%</span>}
                </button>
              );
            })}
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 2 }}>
              {reactionPollVotes.length} response{reactionPollVotes.length !== 1 ? 's' : ''}
              {myReactionPollVote !== null && <span style={{ marginLeft: 6, color: '#ea580c' }}>· You voted</span>}
            </div>
          </div>
        )}

        {/* Feature 1 — Reaction row */}
        {totalReactions > 0 && (
          <div style={{ padding: '0 16px 6px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {reactions.filter(r => r.count > 0).map(r => (
              <button key={r.emoji} onClick={() => handleReact(r.emoji)}
                title={`${r.count} ${REACTION_LABELS[r.emoji] || ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', border: myReaction === r.emoji ? '1.5px solid var(--blue-400)' : '1.5px solid var(--blue-100)', borderRadius: 'var(--radius-full)', background: myReaction === r.emoji ? 'var(--blue-50)' : 'white', cursor: 'pointer', fontSize: '0.8rem' }}>
                {r.emoji} <span style={{ fontSize: '0.72rem', color: 'var(--gray-600)' }}>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 4, borderTop: '1px solid var(--gray-100)', position: 'relative' }}>
          {/* Feature 1 — Like + Reaction picker */}
          <div style={{ position: 'relative' }}>
            <button onClick={handleLike}
              onMouseEnter={() => setShowReactionPicker(true)}
              onMouseLeave={() => setTimeout(() => setShowReactionPicker(false), 200)}
              className="btn btn-ghost btn-sm" style={{ color: (liked || myReaction) ? 'var(--red-500)' : 'var(--gray-500)', gap: 5 }}>
              {myReaction ? <span style={{ fontSize: '1.1rem' }}>{myReaction}</span> : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              )}
              <span className="count-badge">{fmt(likes)}</span>
            </button>
            {showReactionPicker && (
              <div onMouseEnter={() => setShowReactionPicker(true)} onMouseLeave={() => setShowReactionPicker(false)}
                style={{ position: 'absolute', bottom: '100%', left: 0, background: 'white', borderRadius: 'var(--radius-full)', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', border: '1px solid var(--blue-100)', padding: '6px 8px', display: 'flex', gap: 4, zIndex: 100, marginBottom: 4 }}>
                {REACTIONS.map(e => (
                  <button key={e} onClick={() => handleReact(e)} title={REACTION_LABELS[e]}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', borderRadius: '50%', padding: '2px 4px', transition: 'transform 0.15s' }}
                    onMouseEnter={ev => (ev.currentTarget.style.transform = 'scale(1.3)')}
                    onMouseLeave={ev => (ev.currentTarget.style.transform = 'scale(1)')}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={loadComments} className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-500)', gap: 5 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="count-badge">{fmt(post.comments_count)}</span>
          </button>
          <button onClick={() => setShowRepostModal(true)} className="btn btn-ghost btn-sm" style={{ color: shares > post.shares_count ? 'var(--blue-500)' : 'var(--gray-500)', gap: 5 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            <span className="count-badge">{fmt(shares)}</span>
          </button>

          {/* Feature 4 — Analytics */}
          <button onClick={loadAnalytics} className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-500)', gap: 5 }} title="View analytics">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          </button>

          {/* Feature 8 — Liked-by */}
          <button onClick={loadLikedBy} className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-500)', fontSize: '0.72rem' }} title="See who liked">
            👍
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
            {/* Feature 12 — Save to Collection */}
            {collections.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowCollectionMenu(v => !v)} className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }} title="Save to collection">
                  🗂️
                </button>
                {showCollectionMenu && (
                  <div style={{ position: 'absolute', right: 0, bottom: '100%', background: 'white', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid var(--blue-100)', zIndex: 200, minWidth: 160, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)', borderBottom: '1px solid var(--blue-50)' }}>Save to collection</div>
                    {collections.map(col => (
                      <button key={col.id} onClick={() => addToCollection(col.id)}
                        style={{ display: 'block', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.83rem', color: 'var(--gray-700)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                        📁 {col.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button onClick={handleBookmark} className="btn btn-ghost btn-sm" style={{ color: bookmarked ? 'var(--blue-500)' : 'var(--gray-500)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
            </button>
            {/* Feature 8 — Annotations */}
            <button onClick={loadAnnotations} className="btn btn-ghost btn-sm" style={{ color: annotations.length > 0 ? '#a855f7' : 'var(--gray-500)', fontSize: '0.85rem' }} title="My annotations">
              📝{annotations.length > 0 && <span style={{ fontSize: '0.65rem', marginLeft: 2 }}>{annotations.length}</span>}
            </button>
          </div>
        </div>

        {showComments && (
          <div style={{ borderTop: '1px solid var(--gray-100)', padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://picsum.photos/seed/1114/32/32" alt="You" className="avatar" style={{ width: 30, height: 30 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {replyTo && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--blue-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>Replying to @{replyTo.user.username}</span>
                    <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
                  </div>
                )}
                {/* F8 — Stance buttons */}
                {!replyTo && (
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {([['', 'Neutral', '#64748b'], ['agree', '🟢 Agree', '#16a34a'], ['disagree', '🔴 Disagree', '#dc2626']] as const).map(([v, l, c]) => (
                      <button key={v} onClick={() => setCommentStance(v as '' | 'agree' | 'disagree')}
                        style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', border: `1.5px solid ${commentStance === v ? c : 'var(--blue-100)'}`, background: commentStance === v ? `${c}15` : 'white', color: commentStance === v ? c : 'var(--gray-500)', cursor: 'pointer', fontWeight: commentStance === v ? 600 : 400 }}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitComment()}
                    placeholder={replyTo ? `Reply to ${replyTo.user.name}...` : 'Write a comment...'}
                    style={{ flex: 1, padding: '7px 12px', borderRadius: 'var(--radius-full)', border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.85rem', background: 'var(--gray-50)' }} />
                  <button onClick={submitComment} className="btn btn-primary btn-sm">Post</button>
                </div>
              </div>
            </div>
            {/* F8 — Stance tabs */}
            {comments.some(c => c.stance) && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {(['all', 'agree', 'disagree'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveCommentTab(tab)}
                    style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 'var(--radius-full)', border: '1.5px solid var(--blue-100)', background: activeCommentTab === tab ? 'var(--blue-500)' : 'white', color: activeCommentTab === tab ? 'white' : 'var(--gray-600)', cursor: 'pointer', fontWeight: activeCommentTab === tab ? 600 : 400 }}>
                    {tab === 'all' ? '🗨 All' : tab === 'agree' ? '🟢 Agree' : '🔴 Disagree'}
                  </button>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {comments.filter(c => activeCommentTab === 'all' || !c.stance || c.stance === '' || c.stance === activeCommentTab).map(c => (
                <div key={c.id}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.user.avatar} alt="" className="avatar" style={{ width: 28, height: 28 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ background: c.stance === 'agree' ? '#f0fdf4' : c.stance === 'disagree' ? '#fef2f2' : 'var(--gray-50)', padding: '8px 12px', borderRadius: 10, border: c.stance === 'agree' ? '1px solid #bbf7d0' : c.stance === 'disagree' ? '1px solid #fecaca' : 'none' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{c.user.name} </span>
                        {c.stance === 'agree' && <span style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 700, marginRight: 4 }}>🟢</span>}
                        {c.stance === 'disagree' && <span style={{ fontSize: '0.65rem', color: '#dc2626', fontWeight: 700, marginRight: 4 }}>🔴</span>}
                        <span style={{ fontSize: '0.85rem', color: 'var(--gray-600)' }}>{renderContent(c.content)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, paddingLeft: 4 }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--gray-400)' }}>{timeAgo(c.created_at)}</span>
                        <button onClick={() => setReplyTo(c)} style={{ fontSize: '0.72rem', color: 'var(--blue-500)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Reply</button>
                      </div>
                    </div>
                  </div>
                  {c.replies && c.replies.length > 0 && (
                    <div style={{ marginLeft: 36, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {c.replies.map(r => (
                        <div key={r.id} style={{ display: 'flex', gap: 8 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.user.avatar} alt="" className="avatar" style={{ width: 24, height: 24 }} />
                          <div style={{ background: 'var(--gray-50)', padding: '6px 10px', borderRadius: 8, flex: 1 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.78rem' }}>{r.user.name} </span>
                            <span style={{ fontSize: '0.82rem', color: 'var(--gray-600)' }}>{renderContent(r.content)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Repost Modal */}
      {showRepostModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowRepostModal(false); setShowQuoteInput(false); setQuoteContent(''); }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, minWidth: 320, maxWidth: 480, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, marginBottom: 16, fontFamily: 'Syne, sans-serif' }}>Share this post</h3>
            {!showQuoteInput ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={handleRepost} className="btn btn-outline" style={{ justifyContent: 'flex-start', gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                  Repost
                </button>
                <button onClick={() => { loadLikedBy(); setShowRepostModal(false); }} className="btn btn-outline" style={{ justifyContent: 'flex-start', gap: 10 }}>
                  👍 {likes} Likes
                </button>
                <button onClick={() => { loadRepostedBy(); setShowRepostModal(false); }} className="btn btn-outline" style={{ justifyContent: 'flex-start', gap: 10 }}>
                  🔁 {shares} Reposts
                </button>
                <button onClick={() => setShowQuoteInput(true)} className="btn btn-outline" style={{ justifyContent: 'flex-start', gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
                  Quote Post
                </button>
              </div>
            ) : (
              <div>
                <QuotedPost post={displayPost} />
                <textarea value={quoteContent} onChange={e => setQuoteContent(e.target.value)}
                  placeholder="Add your thoughts..." rows={3} autoFocus
                  style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid var(--blue-100)', outline: 'none', fontSize: '0.9rem', resize: 'none', marginTop: 12 }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowQuoteInput(false)} className="btn btn-ghost btn-sm">Back</button>
                  <button onClick={handleQuote} disabled={!quoteContent.trim()} className="btn btn-primary btn-sm">Quote</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowReportModal(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, minWidth: 300, maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontWeight: 700, marginBottom: 4, fontFamily: 'Syne, sans-serif' }}>Report Post</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', marginBottom: 16 }}>Why are you reporting this post?</p>
            {reported ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 600 }}>Thanks for reporting</div>
                <div style={{ fontSize: '0.82rem', marginTop: 4, color: 'var(--gray-500)' }}>We&apos;ll review this post shortly.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {REPORT_REASONS.map(r => (
                    <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', background: reportReason === r ? 'var(--blue-50)' : 'transparent' }}>
                      <input type="radio" name="reason" value={r} checked={reportReason === r} onChange={() => setReportReason(r)} />
                      <span style={{ fontSize: '0.875rem' }}>{r}</span>
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button onClick={() => setShowReportModal(false)} className="btn btn-ghost btn-sm">Cancel</button>
                  <button onClick={handleReport} disabled={!reportReason} className="btn btn-primary btn-sm" style={{ background: 'var(--red-500)' }}>Report</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Feature 4 — Analytics Modal */}
      {showAnalytics && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAnalytics(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, minWidth: 320, maxWidth: 420, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', margin: 0 }}>📊 Post Analytics</h3>
              <button onClick={() => setShowAnalytics(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '1.1rem' }}>✕</button>
            </div>
            {analytics ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Views', value: analytics.view_count, icon: '👁️' },
                  { label: 'Likes', value: analytics.likes_count, icon: '❤️' },
                  { label: 'Comments', value: analytics.comments_count, icon: '💬' },
                  { label: 'Reposts', value: analytics.shares_count, icon: '🔁' },
                  { label: 'Reactions', value: analytics.reaction_count, icon: '😊' },
                  { label: 'Eng. Rate', value: `${analytics.engagement_rate}%`, icon: '📈' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--blue-50)', borderRadius: 10, padding: '12px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>{s.icon}</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--blue-600)' }}>{typeof s.value === 'number' ? fmt(s.value) : s.value}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--gray-500)', marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '20px 0' }}>Loading…</div>
            )}
          </div>
        </div>
      )}

      {/* Feature 8 — Liked By Modal */}
      {showLikedBy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowLikedBy(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 0, minWidth: 300, maxWidth: 380, width: '90%', maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--blue-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>❤️ Liked by</span>
              <button onClick={() => setShowLikedBy(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {likedByUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--gray-400)', fontSize: '0.85rem' }}>No likes yet</div>
              ) : likedByUsers.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderBottom: '1px solid var(--blue-50)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{u.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>@{u.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Feature 8 — Text selection annotation tooltip */}
      {textSelection && !showAnnotationInput && (
        <div style={{ position: 'fixed', left: textSelection.x, top: textSelection.y - 44, transform: 'translateX(-50%)', zIndex: 1000, background: 'white', borderRadius: 8, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', border: '1px solid #e9d5ff', padding: '5px 10px', display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
          <button onClick={() => setShowAnnotationInput(true)} style={{ fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', color: '#9333ea', fontWeight: 600 }}>
            📝 Annotate
          </button>
          <button onClick={() => setTextSelection(null)} style={{ fontSize: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
        </div>
      )}

      {/* Feature 8 — Annotation note input */}
      {showAnnotationInput && textSelection && (
        <div style={{ position: 'fixed', left: Math.min(textSelection.x, (typeof window !== 'undefined' ? window.innerWidth : 600) - 310), top: textSelection.y + 8, zIndex: 1001, background: 'white', borderRadius: 12, boxShadow: '0 4px 24px rgba(0,0,0,0.15)', border: '1.5px solid #e9d5ff', padding: 14, width: 290 }}>
          <div style={{ fontSize: '0.72rem', color: '#9333ea', marginBottom: 8, fontStyle: 'italic', background: '#faf5ff', padding: '4px 8px', borderRadius: 6 }}>
            &ldquo;{textSelection.text.length > 80 ? textSelection.text.slice(0, 80) + '…' : textSelection.text}&rdquo;
          </div>
          <textarea value={annotationNote} onChange={e => setAnnotationNote(e.target.value)}
            placeholder="Add your private note..." rows={3} autoFocus
            style={{ width: '100%', padding: '6px 8px', borderRadius: 8, border: '1.5px solid #e9d5ff', outline: 'none', fontSize: '0.82rem', resize: 'none', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', gap: 6, marginTop: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setShowAnnotationInput(false); setTextSelection(null); setAnnotationNote(''); }}
              style={{ fontSize: '0.78rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>Cancel</button>
            <button onClick={saveAnnotation} disabled={!annotationNote.trim()}
              style={{ fontSize: '0.78rem', padding: '4px 14px', background: '#9333ea', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', opacity: annotationNote.trim() ? 1 : 0.5 }}>
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Feature 8 — Annotations panel */}
      {showAnnotations && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAnnotations(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 0, minWidth: 320, maxWidth: 440, width: '92%', maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3e8ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#9333ea' }}>📝 My Annotations ({annotations.length})</span>
              <button onClick={() => setShowAnnotations(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
              {annotations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                  No annotations yet.<br />
                  <span style={{ fontSize: '0.78rem' }}>Select text in the post to annotate it.</span>
                </div>
              ) : annotations.map(a => (
                <div key={a.id} style={{ padding: '10px 18px', borderBottom: '1px solid #f9f0ff' }}>
                  <div style={{ fontSize: '0.72rem', color: '#9333ea', fontStyle: 'italic', marginBottom: 4, background: '#faf5ff', padding: '3px 6px', borderRadius: 4 }}>
                    &ldquo;{a.selected_text.length > 60 ? a.selected_text.slice(0, 60) + '…' : a.selected_text}&rdquo;
                  </div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--gray-700)', lineHeight: 1.5 }}>{a.note}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--gray-400)' }}>{timeAgo(a.created_at)} ago · {a.visibility}</span>
                    <button onClick={() => deleteAnnotation(a.id)} style={{ fontSize: '0.72rem', color: 'var(--gray-400)', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* F11 — Post Autopsy Modal */}
      {showAutopsyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAutopsyModal(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, minWidth: 320, maxWidth: 440, width: '90%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontWeight: 700, fontFamily: 'Syne, sans-serif', margin: 0 }}>🔬 Post Autopsy</h3>
              <button onClick={() => setShowAutopsyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '1.1rem' }}>✕</button>
            </div>
            {autopsyData ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Peak Likes', value: autopsyData.peak_likes, icon: '❤️' },
                    { label: 'Peak Comments', value: autopsyData.peak_comments, icon: '💬' },
                    { label: 'Peak Shares', value: autopsyData.peak_shares, icon: '🔁' },
                    { label: 'Total Views', value: autopsyData.total_views, icon: '👁️' },
                    { label: 'Avg Dwell', value: `${Math.round(autopsyData.avg_dwell_secs)}s`, icon: '⏱️' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.1rem', marginBottom: 2 }}>{s.icon}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--blue-600)' }}>{typeof s.value === 'number' ? fmt(s.value) : s.value}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--gray-500)', marginTop: 1 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {autopsyData.top_reactions.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }}>Top reactions:</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {autopsyData.top_reactions.map((r, i) => (
                        <span key={i} style={{ fontSize: '0.82rem', padding: '3px 10px', background: 'var(--blue-50)', borderRadius: 'var(--radius-full)' }}>
                          {r.emoji} {r.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 12, fontSize: '0.72rem', color: 'var(--gray-400)' }}>
                  Archived {timeAgo(autopsyData.archived_at)} ago
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--gray-400)' }}>Creating autopsy snapshot…</div>
            )}
          </div>
        </div>
      )}

      {/* Feature 8 — Reposted By Modal */}
      {showRepostedBy && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowRepostedBy(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 0, minWidth: 300, maxWidth: 380, width: '90%', maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--blue-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>🔁 Reposted by</span>
              <button onClick={() => setShowRepostedBy(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {repostedByUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--gray-400)', fontSize: '0.85rem' }}>No reposts yet</div>
              ) : repostedByUsers.map((u, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderBottom: '1px solid var(--blue-50)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{u.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>@{u.username}</div>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--blue-400)', padding: '2px 8px', background: 'var(--blue-50)', borderRadius: 'var(--radius-full)' }}>
                    {u.post_type === 'quote' ? 'Quote' : 'Repost'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
