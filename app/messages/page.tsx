'use client';
import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Message, Conversation, User, Poll, PollVote } from '@/types';

const GifPicker = dynamic(() => import('@/components/Common/GifPicker'), { ssr: false });

// ─── Theme ───────────────────────────────────────────────────────────────────
const CHAT_THEMES = {
  Classic: { bg: 'var(--gray-50)',                               myBubble: 'var(--blue-500)', myText: 'white',  theirBubble: 'var(--blue-50)',             theirText: 'var(--gray-800)' },
  Dark:    { bg: '#1a1a2e',                                      myBubble: '#0f3460',         myText: 'white',  theirBubble: '#16213e',                    theirText: '#e0e0e0' },
  Ocean:   { bg: 'linear-gradient(135deg,#1a6b8a,#0d4d6e)',     myBubble: '#00b4d8',         myText: 'white',  theirBubble: 'rgba(255,255,255,0.15)',     theirText: 'white' },
  Sunset:  { bg: 'linear-gradient(135deg,#ff9a9e,#fad0c4)',     myBubble: '#ff6b6b',         myText: 'white',  theirBubble: 'rgba(255,255,255,0.7)',      theirText: '#333' },
  Forest:  { bg: 'linear-gradient(135deg,#134e5e,#71b280)',     myBubble: '#2d8653',         myText: 'white',  theirBubble: 'rgba(255,255,255,0.18)',     theirText: 'white' },
} as const;
type ThemeName = keyof typeof CHAT_THEMES;

// ─── Emoji Categories ─────────────────────────────────────────────────────────
const EMOJI_CATS = [
  { label: '😀', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','😎','🤩','🥳','😏','😒','😞','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😲','🥱','😴','😵','🤒','🤕'] },
  { label: '👋', emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','🤝','🙏','💪','✍️','💅','🤳'] },
  { label: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💯','🔥','✨','⭐','🌟','💫','🎉','🎊','🎈','🎁','🏆','🥇','💢','💥'] },
  { label: '🐶', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🦆','🦅','🦉','🦇','🐺','🦄','🐝','🦋','🐌','🐞','🐢','🐍','🦎','🐙','🦑','🦀','🐡','🐠','🐬','🐳','🦈'] },
  { label: '🍎', emojis: ['🍎','🍊','🍋','🍇','🍓','🍒','🍑','🥭','🍍','🥝','🍅','🍕','🍔','🌮','🌯','🥙','🍣','🍱','🍜','🍝','🍛','🍦','🍩','🍪','🎂','🍰','🍫','🍬','🍭','☕','🍵','🍺','🍷','🥂'] },
  { label: '✈️', emojis: ['🚗','🚕','🚙','🏎️','🚓','🚑','🚒','🛻','🚲','✈️','🚀','🛸','🚁','⛵','🚤','🚢','⚓','🏠','🏡','🏢','🗼','🗽','⛰️','🏔️','🌋','🏝️','🏖️','🌅','🌇','🌆','🌃','🌉'] },
];

// ─── Presence options ────────────────────────────────────────────────────────
const PRESENCE_OPTIONS = [
  { value: 'online',    label: '🟢 Online',    color: '#22c55e' },
  { value: 'away',      label: '🌙 Away',      color: '#f59e0b' },
  { value: 'busy',      label: '🔴 Busy',      color: '#ef4444' },
  { value: 'invisible', label: '⚫ Invisible', color: '#6b7280' },
] as const;

const TARGET_LANGS = [
  { code: 'es', label: '🇪🇸 ES' }, { code: 'fr', label: '🇫🇷 FR' },
  { code: 'de', label: '🇩🇪 DE' }, { code: 'zh', label: '🇨🇳 ZH' },
  { code: 'ja', label: '🇯🇵 JA' }, { code: 'ar', label: '🇸🇦 AR' },
  { code: 'pt', label: '🇧🇷 PT' }, { code: 'ru', label: '🇷🇺 RU' },
  { code: 'ko', label: '🇰🇷 KO' }, { code: 'hi', label: '🇮🇳 HI' },
];

const SLASH_COMMANDS = [
  { cmd: '/shrug', desc: 'Append ¯\\_(ツ)_/¯' },
  { cmd: '/flip',  desc: 'Append (╯°□°）╯︵ ┻━┻' },
  { cmd: '/wave',  desc: 'Append 👋' },
  { cmd: '/quote', desc: 'Wrap in "quotes"' },
  { cmd: '/help',  desc: 'List commands' },
  { cmd: '/clear', desc: 'Clear input' },
];

// ─── Rich text renderer ──────────────────────────────────────────────────────
function escapeHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function renderRichText(text: string): string {
  const safe = escapeHtml(text);
  return safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(?!\*)(.+?)(?<!\*)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.12);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:0.85em">$1</code>')
    .replace(/~(.+?)~/g, '<s>$1</s>');
}

// ─── Sticker packs & Labels ───────────────────────────────────────────────────
const STICKER_PACKS = {
  Kawaii: ['(◕‿◕)','(づ｡◕‿◕｡)づ','(ﾉ◕ヮ◕)ﾉ','(´• ω •`)','(≧◡≦)','(｀・ω・´)','(^◡^)','(●´ω｀●)','＼(^o^)／','(っ˘ω˘ς)'],
  Sports: ['⚽🏆','🏀💪','🎾🔥','🏊‍♂️💦','🚴‍♀️⚡','🥊👊','🎯✨','🏋️‍♂️💯','⛷️❄️','🤸‍♀️🌟'],
  Memes:  ['( ͡° ͜ʖ ͡°)','¯\\_(ツ)_/¯','(╯°□°）╯','ʕ•ᴥ•ʔ','(ง ͠° ͟ل͜ ͡°)ง','👁️👄👁️','🤌🤌','gg ez','rip 💀','(ʘᗩʘ)'],
  Work:   ['📊✅','💼🚀','☕📝','🎯📈','💡🔥','🖥️⚡','📅✔️','🤝💪','📧🏃','🧠💭'],
} as const;
type PackName = keyof typeof STICKER_PACKS;

const LABEL_META: Record<string, { color: string; emoji: string }> = {
  Work:    { color: '#3b82f6', emoji: '💼' },
  Friends: { color: '#22c55e', emoji: '👫' },
  Family:  { color: '#ef4444', emoji: '🏠' },
  VIP:     { color: '#f59e0b', emoji: '⭐' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '10px 14px', alignItems: 'center' }}>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}.td{animation:bounce 1.4s infinite ease-in-out}.td:nth-child(2){animation-delay:.16s}.td:nth-child(3){animation-delay:.32s}`}</style>
      {[0,1,2].map(i => <div key={i} className="td" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gray-400)' }} />)}
    </div>
  );
}

function EmojiPickerPanel({ onSelect }: { onSelect: (e: string) => void }) {
  const [tab, setTab] = useState(0);
  return (
    <div style={{ background: 'white', border: '1px solid var(--blue-100)', borderRadius: 12, boxShadow: 'var(--shadow)', width: 280, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--blue-100)', overflowX: 'auto' }}>
        {EMOJI_CATS.map((c, i) => (
          <button key={i} onClick={() => setTab(i)}
            style={{ flex: '0 0 auto', padding: '6px 10px', background: tab === i ? 'var(--blue-50)' : 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', borderBottom: tab === i ? '2px solid var(--blue-500)' : '2px solid transparent' }}>
            {c.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 2, maxHeight: 180, overflowY: 'auto', padding: 6 }}>
        {EMOJI_CATS[tab].emojis.map(e => (
          <button key={e} onClick={() => onSelect(e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', padding: 3, borderRadius: 4, lineHeight: 1 }}>
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<{ title: string; description: string; image: string; url: string } | null>(null);
  useEffect(() => {
    fetch(`/api/messages/link-preview?url=${encodeURIComponent(url)}`).then(r => r.json()).then(setData).catch(() => {});
  }, [url]);
  if (!data?.title) return null;
  return (
    <a href={data.url} target="_blank" rel="noreferrer"
      style={{ display: 'block', marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)', textDecoration: 'none', background: 'rgba(0,0,0,0.1)' }}>
      {data.image && <img src={data.image} alt="" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', display: 'block' }} />}
      <div style={{ padding: '6px 8px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: 2 }}>{data.title}</div>
        {data.description && <div style={{ fontSize: '0.68rem', opacity: 0.8, lineHeight: 1.3 }}>{data.description.slice(0, 100)}</div>}
      </div>
    </a>
  );
}

function VoicePlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 140 }}>
      <audio ref={audioRef} src={src} onTimeUpdate={() => {
        if (audioRef.current) setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
      }} onEnded={() => setPlaying(false)} />
      <button onClick={toggle} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {playing ? '⏸' : '▶'}
      </button>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'white', transition: 'width 0.1s' }} />
      </div>
    </div>
  );
}

function ReplyBubble({ msg, isMe }: { msg: Message; isMe: boolean }) {
  return (
    <div style={{ borderLeft: `3px solid ${isMe ? 'rgba(255,255,255,0.5)' : 'var(--blue-300)'}`, paddingLeft: 8, marginBottom: 4, opacity: 0.85 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, marginBottom: 1 }}>{msg.sender?.name}</div>
      <div style={{ fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
        {msg.message_type === 'image' ? '📷 Image' : msg.message_type === 'audio' ? '🎤 Voice' : msg.content?.slice(0, 60)}
      </div>
    </div>
  );
}

// ─── Utils ────────────────────────────────────────────────────────────────────
const URL_RE = /https?:\/\/[^\s]+/g;
function isEmojiOnly(text: string) {
  return text.trim().length > 0 && text.trim().replace(/[\p{Emoji}\s]/gu, '').length === 0;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso: string) {
  const d = new Date(iso), now = new Date();
  const diff = new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime();
  if (diff === 0) return 'Today';
  if (diff === 86400000) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
}
function getPresence(lastSeen?: string, presence?: string) {
  if (presence === 'invisible') return 'Offline';
  if (presence === 'busy') return '🔴 Busy';
  if (presence === 'away') return '🌙 Away';
  if (!lastSeen) return 'Offline';
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 120000) return '🟢 Online';
  if (diff < 3600000) return `Last seen ${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `Last seen ${Math.floor(diff / 3600000)}h ago`;
  return `Last seen ${Math.floor(diff / 86400000)}d ago`;
}

function presenceDotColor(presence?: string, lastSeen?: string) {
  if (presence === 'busy') return '#ef4444';
  if (presence === 'away') return '#f59e0b';
  if (presence === 'invisible') return undefined;
  if (!lastSeen) return undefined;
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 120000) return '#22c55e';
  return undefined;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Messages() {
  // Core
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [meId, setMeId] = useState(-1);

  // Real-time
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [listTyping, setListTyping] = useState<Record<number, boolean>>({});

  // Search
  const [convSearch, setConvSearch] = useState('');
  const [msgSearch, setMsgSearch] = useState('');
  const [showMsgSearch, setShowMsgSearch] = useState(false);

  // Modals
  const [showNewChat, setShowNewChat] = useState(false);
  const [showPinned, setShowPinned] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Feature 8 — Contact info
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [contactMedia, setContactMedia] = useState<Message[]>([]);
  const [contactLinks, setContactLinks] = useState<string[]>([]);

  // Message actions
  const [hoveredMsg, setHoveredMsg] = useState<number | null>(null);
  const [menuMsg, setMenuMsg] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Feature 3 — Full emoji picker
  const [emojiPickerFor, setEmojiPickerFor] = useState<number | null>(null);

  // Feature 1 — Edit
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');

  // Feature 2 — Disappear
  const [disappearMode, setDisappearMode] = useState<string>('off');

  // Feature 4 — Pagination
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [oldestMsgId, setOldestMsgId] = useState<number | null>(null);

  // Feature 7 — Jump button
  const [newMsgCount, setNewMsgCount] = useState(0);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const msgContainerRef = useRef<HTMLDivElement>(null);

  // Feature 11 — Theme
  const [chatTheme, setChatTheme] = useState<ThemeName>('Classic');

  // Feature 12 — Receipt tooltip
  const [receiptTooltip, setReceiptTooltip] = useState<number | null>(null);

  // Feature R1 — Scheduled Messages
  const [scheduledAt, setScheduledAt] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledMsgs, setScheduledMsgs] = useState<Message[]>([]);
  const [showScheduledList, setShowScheduledList] = useState(false);

  // Feature R2 — Quick Reply Templates
  const [templates, setTemplates] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // Feature R3 — Reaction Details
  const [reactionDetail, setReactionDetail] = useState<{ msgId: number; data: { emoji: string; users: { id: number; name: string; username: string; avatar: string }[] }[] } | null>(null);

  // Feature R4 — Chat Lock
  const [lockedConvs, setLockedConvs] = useState<Set<number>>(new Set());
  const [pinPrompt, setPinPrompt] = useState<Conversation | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [unlockedConvs, setUnlockedConvs] = useState<Set<number>>(new Set());
  const [settingPin, setSettingPin] = useState(false);

  // Feature R5 — Location
  const [sendingLocation, setSendingLocation] = useState(false);

  // Feature R6 — Custom Status
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusEmoji, setStatusEmoji] = useState('');
  const [statusText, setStatusText] = useState('');
  const [myStatus, setMyStatus] = useState<{ emoji: string; text: string } | null>(null);

  // Feature R8 — Unsend Timer
  const [recentSends, setRecentSends] = useState<Map<number, number>>(new Map());
  const [, forceUpdate] = useState(0);

  // Feature R9 — Chat Stats
  const [showStats, setShowStats] = useState(false);

  // Feature R10 — Stickers
  const [showStickers, setShowStickers] = useState(false);
  const [stickerPack, setStickerPack] = useState<PackName>('Kawaii');

  // Feature R11 — Conversation Labels
  const [convLabels, setConvLabels] = useState<Record<number, string>>({});
  const [labelFilter, setLabelFilter] = useState<string | null>(null);
  const [showLabelMenu, setShowLabelMenu] = useState<number | null>(null);

  // Feature R12 — Smart Replies
  const [smartReplies, setSmartReplies] = useState<string[]>([]);

  // Round 4 — Feature 1: Rich text (always on)
  // Feature 2 — Global Search
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalResults, setGlobalResults] = useState<(Message & { partner: User })[]>([]);
  const [globalSearching, setGlobalSearching] = useState(false);
  // Feature 3 — Pinned Conversations
  const [pinnedConvIds, setPinnedConvIds] = useState<number[]>([]);
  // Feature 4 — Polls
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  // Feature 7 — Presence Granularity
  const [myPresence, setMyPresence] = useState('online');
  const [showPresencePicker, setShowPresencePicker] = useState(false);
  // Feature 9 — Slash Commands
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  // Feature 10 — Translation
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState<number | null>(null);
  const [translateLang, setTranslateLang] = useState('es');
  // Feature 6 — Video (uses send() with message_type 'video', no extra state)
  const [showVideoInput, setShowVideoInput] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  // Media / voice
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [msgType, setMsgType] = useState<'text' | 'image' | 'audio' | 'gif'>('text');
  const [recording, setRecording] = useState(false);
  const [recordingSecs, setRecordingSecs] = useState(0);

  // Panels
  const [pinnedMsgs, setPinnedMsgs] = useState<Message[]>([]);
  const [starredMsgs, setStarredMsgs] = useState<Message[]>([]);
  const [mediaItems, setMediaItems] = useState<Message[]>([]);

  // New chat
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<User[]>([]);

  // Refs
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const convSearchRef = useRef<HTMLInputElement>(null);
  const msgInputRef = useRef<HTMLInputElement>(null);

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/users/me').then(r => r.json()).then(u => {
      setMeId(u?.id ?? -1);
      if (u) {
        setMyStatus({ emoji: u.status_emoji || '', text: u.status_text || '' });
        setMyPresence(u.presence || 'online');
      }
    }).catch(() => {});
    fetch('/api/messages/conversations').then(r => r.json()).then(setConversations).catch(() => {});
    fetch('/api/users/me/heartbeat', { method: 'POST' }).catch(() => {});
    const hb = setInterval(() => fetch('/api/users/me/heartbeat', { method: 'POST' }).catch(() => {}), 30000);
    // Feature 6 — Notification permission
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    // Feature R2/R4/R11 — Load localStorage state
    try {
      setTemplates(JSON.parse(localStorage.getItem('msg_templates') ?? '[]'));
      setConvLabels(JSON.parse(localStorage.getItem('conv_labels') ?? '{}'));
      setLockedConvs(new Set(JSON.parse(localStorage.getItem('locked_convs') ?? '[]')));
      setPinnedConvIds(JSON.parse(localStorage.getItem('pinned_convs') ?? '[]'));
    } catch {}
    return () => clearInterval(hb);
  }, []);

  // ─── List typing poll ──────────────────────────────────────────────────────
  useEffect(() => {
    const poll = () => fetch('/api/messages/typing-status').then(r => r.json()).then(setListTyping).catch(() => {});
    poll();
    const t = setInterval(poll, 1500);
    return () => clearInterval(t);
  }, []);

  // ─── Feature 10 — Keyboard shortcuts ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.key === 'Escape') {
        setShowNewChat(false); setShowPinned(false); setShowStarred(false);
        setShowMedia(false); setShowGif(false); setForwardMsg(null);
        setEditingMsg(null); setShowContactInfo(false); setEmojiPickerFor(null);
        setReceiptTooltip(null);
        setShowStickers(false); setShowTemplates(false); setShowStats(false);
        setPinPrompt(null); setReactionDetail(null); setShowScheduledList(false);
        setShowStatusModal(false); setShowLabelMenu(null); setSmartReplies([]);
        setShowGlobalSearch(false); setShowPollModal(false); setShowPresencePicker(false);
        setShowSlashMenu(false); setShowVideoInput(false);
        if (showMsgSearch) { setShowMsgSearch(false); setMsgSearch(''); }
      }
      if (e.ctrlKey && e.key === 'k') { e.preventDefault(); convSearchRef.current?.focus(); }
      if (e.ctrlKey && e.key === 'f' && active) { e.preventDefault(); setShowMsgSearch(v => !v); }
      if (e.ctrlKey && e.shiftKey && e.key === 'F') { e.preventDefault(); setShowGlobalSearch(v => !v); }
      if (e.key === '/' && active && !isInput) { e.preventDefault(); msgInputRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [active, showMsgSearch]);

  // ─── SSE per active conversation ───────────────────────────────────────────
  useEffect(() => {
    if (!active) return;
    sseRef.current?.close();
    setMessages([]);
    setHasMoreMessages(false);
    setOldestMsgId(null);
    setNewMsgCount(0);
    setIsScrolledUp(false);
    setPartnerTyping(false);
    setReceiptTooltip(null);

    // Feature 11 — Restore theme
    const savedTheme = localStorage.getItem(`theme_${active.user.id}`) as ThemeName | null;
    setChatTheme(savedTheme && CHAT_THEMES[savedTheme] ? savedTheme : 'Classic');

    // Restore draft
    setText(localStorage.getItem(`draft_${active.user.id}`) ?? '');

    // Feature 2 — Fetch meta
    fetch(`/api/messages/conversation/${active.user.id}/meta`).then(r => r.json())
      .then(meta => { if (meta) setDisappearMode(meta.disappear_after || 'off'); })
      .catch(() => {});

    const src = new EventSource(`/api/messages/stream?partner_id=${active.user.id}`);
    sseRef.current = src;

    src.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'init') {
        setMessages(data.messages);
        setHasMoreMessages(data.has_more ?? false);
        setOldestMsgId(data.messages[0]?.id ?? null);
      }

      if (data.type === 'new') {
        setMessages(prev => [...prev, data.message]);
        if (data.message.sender_id !== meId) {
          // Feature R12 — Smart reply suggestions
          if (data.message.message_type === 'text') {
            fetch('/api/messages/suggest-reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ last_message: data.message.content }) })
              .then(r => r.json()).then(d => setSmartReplies(d.suggestions ?? [])).catch(() => {});
          }
          // Feature 6 — Desktop + sound notification
          if (document.hidden) {
            playBeep();
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(data.message.sender?.name ?? 'New message', {
                body: data.message.message_type !== 'text'
                  ? `Sent a ${data.message.message_type}`
                  : String(data.message.content).slice(0, 80),
                tag: `msg-${data.message.sender_id}`,
              });
            }
          }
          // Feature 7 — Jump button count
          setIsScrolledUp(prev => { if (prev) setNewMsgCount(n => n + 1); return prev; });
        }
      }

      // Feature 1 — Edit event
      if (data.type === 'edited') {
        setMessages(prev => prev.map(m => m.id === data.message.id ? { ...m, ...data.message } : m));
      }

      // Feature 2 — Expired event
      if (data.type === 'expired') {
        setMessages(prev => prev.map(m =>
          (data.ids as number[]).includes(m.id) ? { ...m, message_type: 'deleted' as const, content: '' } : m
        ));
      }

      if (data.type === 'typing') setPartnerTyping(data.typing);
      if (data.type === 'read') setMessages(prev => prev.map(m => m.sender_id === meId ? { ...m, is_read: true } : m));
    };

    fetch(`/api/messages/${active.user.id}/read`, { method: 'PATCH' }).catch(() => {});
    return () => src.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.user.id]);

  // ─── Feature R1 — Load scheduled messages on conversation change ──────────
  useEffect(() => {
    if (!active) return;
    fetch('/api/messages/scheduled').then(r => r.json())
      .then(data => setScheduledMsgs(Array.isArray(data) ? data.filter((m: Message) => m.receiver_id === active.user.id) : []))
      .catch(() => {});
  }, [active?.user.id]);

  // ─── Feature 8 — Tab title unread badge ───────────────────────────────────
  useEffect(() => {
    const count = conversations.filter(c => !c.is_archived && !c.is_muted).reduce((s, c) => s + (c.unread_count || 0), 0);
    document.title = count > 0 ? `(${count}) Social Fusion` : 'Social Fusion';
  }, [conversations]);

  // ─── Feature 12 — Unsent draft beforeunload warning ───────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const draft = active ? (localStorage.getItem(`draft_${active.user.id}`) ?? '').trim() : '';
      if (draft) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active?.user.id]);

  // ─── Feature 2 — Global search debounce ──────────────────────────────────
  useEffect(() => {
    if (!globalQuery.trim()) { setGlobalResults([]); return; }
    const t = setTimeout(async () => {
      setGlobalSearching(true);
      const data = await fetch(`/api/messages/search?q=${encodeURIComponent(globalQuery)}`).then(r => r.json()).catch(() => []);
      setGlobalResults(Array.isArray(data) ? data : []);
      setGlobalSearching(false);
    }, 350);
    return () => clearTimeout(t);
  }, [globalQuery]);

  // ─── Feature R8 — Force-update timer for unsend countdown ─────────────────
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ─── Auto-scroll (Feature 7 — only when not scrolled up) ──────────────────
  useEffect(() => {
    if (!isScrolledUp) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  // ─── Draft save ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (active) localStorage.setItem(`draft_${active.user.id}`, text);
  }, [text, active?.user.id]);

  // ─── Feature 6 — Sound ────────────────────────────────────────────────────
  const playBeep = () => {
    try {
      const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  // ─── Feature 4 — Load more ────────────────────────────────────────────────
  const loadMoreMessages = async () => {
    if (!active || !oldestMsgId || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/messages/conversation/${active.user.id}?before_id=${oldestMsgId}&limit=50`).then(r => r.json());
      const older: Message[] = res.messages ?? [];
      setMessages(prev => [...older, ...prev]);
      setOldestMsgId(older[0]?.id ?? oldestMsgId);
      setHasMoreMessages(res.has_more ?? false);
    } catch {}
    setLoadingMore(false);
  };

  // ─── Feature 7 — Scroll handler ───────────────────────────────────────────
  const handleMsgScroll = () => {
    const el = msgContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setIsScrolledUp(distFromBottom > 120);
    if (distFromBottom < 50) setNewMsgCount(0);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setNewMsgCount(0);
    setIsScrolledUp(false);
  };

  // ─── Feature 8 — Contact info ─────────────────────────────────────────────
  const loadContactInfo = async () => {
    if (!active) return;
    const media = await fetch(`/api/messages/conversation/${active.user.id}/media`).then(r => r.json()).catch(() => []);
    setContactMedia((media as Message[]).filter(m => m.message_type === 'image' || m.message_type === 'gif').slice(0, 9));
    const links: string[] = [];
    messages.forEach(m => { if (m.message_type === 'text') { const found = m.content.match(URL_RE) || []; links.push(...found); } });
    setContactLinks([...new Set(links)].slice(0, 20));
    setShowContactInfo(true);
  };

  // ─── Feature 9 — Export ───────────────────────────────────────────────────
  const exportChat = () => {
    if (!active) return;
    const lines = messages
      .filter(m => m.message_type !== 'deleted')
      .map(m => {
        const time = new Date(m.created_at).toLocaleString();
        const sender = m.sender_id === meId ? 'You' : active.user.name;
        const content = m.message_type === 'text' ? m.content : `[${m.message_type}]`;
        return `[${time}] ${sender}: ${content}`;
      });
    const blob = new Blob([`Chat with ${active.user.name}\nExported on ${new Date().toLocaleString()}\n${'─'.repeat(40)}\n\n${lines.join('\n')}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `chat-${active.user.username}-${Date.now()}.txt` });
    a.click(); URL.revokeObjectURL(url);
  };

  // ─── Typing handler ────────────────────────────────────────────────────────
  const handleTextChange = (val: string) => {
    setText(val);
    if (!active) return;
    fetch('/api/messages/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partner_id: active.user.id, typing: true }) });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      fetch('/api/messages/typing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partner_id: active.user.id, typing: false }) });
    }, 2000);
  };

  // ─── Send ─────────────────────────────────────────────────────────────────
  const send = async (overrideType?: string, overrideContent?: string) => {
    const content = overrideContent ?? text;
    const type = overrideType ?? (msgType !== 'text' ? msgType : 'text');
    if ((!content.trim() && !imageUrl) || !active) return;
    const body = {
      receiver_id: active.user.id, content, message_type: type,
      image_url: imageUrl, reply_to_id: replyTo?.id ?? null, is_forwarded: false,
      ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
    };
    const msg = await fetch('/api/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()).catch(() => null);
    if (msg) {
      if (scheduledAt) {
        setScheduledMsgs(prev => [...prev, msg]);
      } else {
        setMessages(prev => [...prev, msg]);
        // Feature R8 — Track recent sends for unsend timer
        setRecentSends(prev => { const m = new Map(prev); m.set(msg.id, Date.now()); return m; });
      }
    }
    setText(''); setImageUrl(''); setImagePreview(''); setMsgType('text'); setReplyTo(null);
    setShowGif(false); setShowImageInput(false); setScheduledAt(''); setShowSchedule(false);
    setSmartReplies([]);
  };

  const sendSticker = (s: string) => send('sticker', s);

  // ─── Feature 1 — Save edit ────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editingMsg || !editText.trim()) return;
    const res = await fetch(`/api/messages/${editingMsg.id}/edit`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: editText.trim() }) }).then(r => r.json()).catch(() => null);
    if (res) setMessages(prev => prev.map(m => m.id === editingMsg.id ? { ...m, content: editText.trim(), is_edited: true } : m));
    setEditingMsg(null); setEditText('');
  };

  // ─── File upload ───────────────────────────────────────────────────────────
  const handleFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = e => { setImageUrl(e.target?.result as string); setImagePreview(e.target?.result as string); setMsgType('image'); };
    reader.readAsDataURL(f);
  };

  // ─── Voice ────────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRecRef.current = rec;
      const chunks: Blob[] = [];
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = e => { setImageUrl(e.target?.result as string); setMsgType('audio'); };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      rec.start();
      setRecording(true); setRecordingSecs(0);
      recTimerRef.current = setInterval(() => setRecordingSecs(s => s + 1), 1000);
    } catch {}
  };

  const stopRecording = () => {
    mediaRecRef.current?.stop();
    clearInterval(recTimerRef.current!);
    setRecording(false);
  };

  // ─── Reactions ────────────────────────────────────────────────────────────
  const reactTo = async (msgId: number, emoji: string) => {
    const res = await fetch(`/api/messages/${msgId}/react`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ emoji }) }).then(r => r.json()).catch(() => null);
    if (res) setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: res.reactions } : m));
    setEmojiPickerFor(null);
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const deleteMsg = async (id: number) => {
    await fetch(`/api/messages/${id}/delete`, { method: 'DELETE' }).catch(() => {});
    setMessages(prev => prev.map(m => m.id === id ? { ...m, message_type: 'deleted' as const, content: '' } : m));
    setMenuMsg(null);
  };

  const bulkDelete = async () => {
    for (const id of selected) await deleteMsg(id);
    setSelected(new Set()); setSelectMode(false);
  };

  // ─── Star / Pin ───────────────────────────────────────────────────────────
  const toggleStar = async (id: number) => {
    const res = await fetch(`/api/messages/${id}/star`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res) setMessages(prev => prev.map(m => m.id === id ? { ...m, is_starred: res.is_starred } : m));
    setMenuMsg(null);
  };

  const togglePin = async (id: number) => {
    const res = await fetch(`/api/messages/${id}/pin`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res) setMessages(prev => prev.map(m => m.id === id ? { ...m, is_pinned: res.is_pinned } : m));
    setMenuMsg(null);
  };

  // ─── Load panels ──────────────────────────────────────────────────────────
  const loadPinned = async () => {
    if (!active) return;
    const data = await fetch(`/api/messages/pinned/${active.user.id}`).then(r => r.json()).catch(() => []);
    setPinnedMsgs(data); setShowPinned(true);
  };

  const loadStarred = () => { setStarredMsgs(messages.filter(m => m.is_starred)); setShowStarred(true); };

  const loadMedia = async () => {
    if (!active) return;
    const data = await fetch(`/api/messages/conversation/${active.user.id}/media`).then(r => r.json()).catch(() => []);
    setMediaItems(data); setShowMedia(true);
  };

  // ─── Archive / Mute ───────────────────────────────────────────────────────
  const archiveConv = async (partnerId: number) => {
    const res = await fetch(`/api/messages/archive/${partnerId}`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res) setConversations(prev => prev.map(c => c.user.id === partnerId ? { ...c, is_archived: res.is_archived } : c));
  };

  const muteConv = async (partnerId: number) => {
    const res = await fetch(`/api/messages/mute/${partnerId}`, { method: 'POST' }).then(r => r.json()).catch(() => null);
    if (res) setConversations(prev => prev.map(c => c.user.id === partnerId ? { ...c, is_muted: res.is_muted } : c));
  };

  // ─── Forward ──────────────────────────────────────────────────────────────
  const forwardTo = async (conv: Conversation) => {
    if (!forwardMsg) return;
    await fetch('/api/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiver_id: conv.user.id, content: forwardMsg.content, message_type: forwardMsg.message_type, image_url: forwardMsg.image_url, is_forwarded: true }) });
    setForwardMsg(null);
  };

  // ─── Feature R3 — Reaction details ────────────────────────────────────────
  const loadReactionDetail = async (msgId: number) => {
    const data = await fetch(`/api/messages/${msgId}/reactions`).then(r => r.json()).catch(() => []);
    setReactionDetail({ msgId, data });
  };

  // ─── Feature R4 — Chat lock ────────────────────────────────────────────────
  const tryUnlockConv = (conv: Conversation) => {
    const storedPin = localStorage.getItem(`pin_${conv.user.id}`);
    if (!storedPin) { setActive(conv); setPinPrompt(null); setPinInput(''); return; }
    if (pinInput === storedPin) { setUnlockedConvs(prev => new Set([...prev, conv.user.id])); setActive(conv); setPinPrompt(null); setPinInput(''); }
    else { setPinInput(''); }
  };

  const toggleLockConv = (conv: Conversation) => {
    const pid = conv.user.id;
    if (lockedConvs.has(pid)) {
      localStorage.removeItem(`pin_${pid}`);
      setLockedConvs(prev => { const s = new Set(prev); s.delete(pid); return s; });
      localStorage.setItem('locked_convs', JSON.stringify([...lockedConvs].filter(x => x !== pid)));
    } else {
      const newPin = prompt('Set a 4-digit PIN for this conversation:');
      if (!newPin || !/^\d{4}$/.test(newPin)) return;
      localStorage.setItem(`pin_${pid}`, newPin);
      const newSet = new Set([...lockedConvs, pid]);
      setLockedConvs(newSet);
      localStorage.setItem('locked_convs', JSON.stringify([...newSet]));
      setUnlockedConvs(prev => new Set([...prev, pid]));
    }
    setMenuMsg(null);
  };

  // ─── Feature R5 — Location ─────────────────────────────────────────────────
  const sendLocation = () => {
    if (!active) return;
    setSendingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const body = { receiver_id: active.user.id, content: JSON.stringify({ lat, lng }), message_type: 'location', image_url: '', reply_to_id: null, is_forwarded: false };
        const msg = await fetch('/api/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()).catch(() => null);
        if (msg) { setMessages(prev => [...prev, msg]); setRecentSends(prev => { const m = new Map(prev); m.set(msg.id, Date.now()); return m; }); }
        setSendingLocation(false);
      },
      () => { alert('Could not get location. Please allow location access.'); setSendingLocation(false); }
    );
  };

  // ─── Feature R6 — Custom status ───────────────────────────────────────────
  const saveStatus = async () => {
    const res = await fetch('/api/users/me/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status_emoji: statusEmoji, status_text: statusText }) }).then(r => r.json()).catch(() => null);
    if (res) setMyStatus({ emoji: res.status_emoji, text: res.status_text });
    setShowStatusModal(false);
  };

  const clearStatus = async () => {
    await fetch('/api/users/me/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status_emoji: '', status_text: '' }) }).catch(() => {});
    setMyStatus({ emoji: '', text: '' }); setShowStatusModal(false);
  };

  // ─── Feature R2 — Templates ────────────────────────────────────────────────
  const addTemplate = (t: string) => {
    if (!t.trim() || templates.includes(t.trim())) return;
    const next = [...templates, t.trim()];
    setTemplates(next); localStorage.setItem('msg_templates', JSON.stringify(next));
  };

  const removeTemplate = (i: number) => {
    const next = templates.filter((_, j) => j !== i);
    setTemplates(next); localStorage.setItem('msg_templates', JSON.stringify(next));
  };

  // ─── Feature R11 — Labels ──────────────────────────────────────────────────
  const toggleLabel = (partnerId: number, label: string) => {
    const next = { ...convLabels };
    if (next[partnerId] === label) delete next[partnerId]; else next[partnerId] = label;
    setConvLabels(next); localStorage.setItem('conv_labels', JSON.stringify(next));
    setShowLabelMenu(null);
  };

  // ─── Feature 3 — Pin conversation ─────────────────────────────────────────
  const pinConv = (id: number) => {
    const next = pinnedConvIds.includes(id) ? pinnedConvIds.filter(x => x !== id) : [id, ...pinnedConvIds].slice(0, 3);
    setPinnedConvIds(next); localStorage.setItem('pinned_convs', JSON.stringify(next));
    setMenuMsg(null);
  };

  // ─── Feature 4 — Send poll ─────────────────────────────────────────────────
  const sendPoll = async () => {
    if (!active || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) return;
    const msg = await fetch('/api/messages/poll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiver_id: active.user.id, question: pollQuestion.trim(), options: pollOptions.filter(o => o.trim()) }) }).then(r => r.json()).catch(() => null);
    if (msg) { setMessages(prev => [...prev, msg]); }
    setPollQuestion(''); setPollOptions(['', '']); setShowPollModal(false);
  };

  const votePoll = async (pollId: number, optionIdx: number, msgId: number) => {
    const res = await fetch(`/api/messages/poll/${pollId}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ option_idx: optionIdx }) }).then(r => r.json()).catch(() => null);
    if (res?.votes) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, poll: m.poll ? { ...m.poll, votes: res.votes } : m.poll } : m));
    }
  };

  // ─── Feature 5 — Read aloud ────────────────────────────────────────────────
  const readAloud = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(text), { rate: 1, pitch: 1 }));
  };

  // ─── Feature 7 — Set presence ──────────────────────────────────────────────
  const changePresence = async (value: string) => {
    setMyPresence(value); setShowPresencePicker(false);
    await fetch('/api/users/me/presence', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presence: value }) }).catch(() => {});
  };

  // ─── Feature 9 — Slash commands ───────────────────────────────────────────
  const applySlashCommand = (cmd: string) => {
    if (cmd === '/shrug') setText(t => t.replace(/^\/shrug\s*/, '') + ' ¯\\_(ツ)_/¯');
    else if (cmd === '/flip') setText(t => t.replace(/^\/flip\s*/, '') + ' (╯°□°）╯︵ ┻━┻');
    else if (cmd === '/wave') setText(t => t.replace(/^\/wave\s*/, '') + ' 👋');
    else if (cmd === '/quote') setText(t => `"${t.replace(/^\/quote\s*/, '')}"`);
    else if (cmd === '/help') setText(SLASH_COMMANDS.map(c => `${c.cmd} — ${c.desc}`).join('\n'));
    else if (cmd === '/clear') setText('');
    setShowSlashMenu(false); msgInputRef.current?.focus();
  };

  // ─── Feature 10 — Translate ────────────────────────────────────────────────
  const translateMsg = async (msgId: number, text: string) => {
    setTranslating(msgId);
    const res = await fetch('/api/messages/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, target_lang: translateLang }) }).then(r => r.json()).catch(() => null);
    if (res?.translated) setTranslations(prev => ({ ...prev, [msgId]: res.translated }));
    setTranslating(null);
  };

  // ─── Feature 11 — Print chat ───────────────────────────────────────────────
  const printChat = () => window.print();

  // ─── Feature 6 — Send video ────────────────────────────────────────────────
  const sendVideo = async () => {
    if (!videoUrl.trim() || !active) return;
    const body = { receiver_id: active.user.id, content: videoUrl.trim(), message_type: 'video', image_url: videoUrl.trim(), is_forwarded: false };
    const msg = await fetch('/api/messages/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()).catch(() => null);
    if (msg) { setMessages(prev => [...prev, msg]); setRecentSends(prev => { const m = new Map(prev); m.set(msg.id, Date.now()); return m; }); }
    setVideoUrl(''); setShowVideoInput(false);
  };

  // ─── Search users ──────────────────────────────────────────────────────────
  const searchUsers = async (q: string) => {
    setUserSearch(q);
    if (!q.trim()) { setUserResults([]); return; }
    const data = await fetch(`/api/users?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => []);
    setUserResults(Array.isArray(data) ? data.slice(0, 8) : []);
  };

  const startChat = (user: User) => {
    const existing = conversations.find(c => c.user.id === user.id);
    if (existing) { setActive(existing); } else {
      const fake: Conversation = { user, last_message: '', last_time: new Date().toISOString(), unread: false, unread_count: 0 };
      setConversations(prev => [fake, ...prev]); setActive(fake);
    }
    setShowNewChat(false); setUserSearch(''); setUserResults([]);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  // ─── Derived values ────────────────────────────────────────────────────────
  const theme = CHAT_THEMES[chatTheme];
  const filteredConvs = conversations.filter(c => {
    const matchSearch = !convSearch || c.user.name.toLowerCase().includes(convSearch.toLowerCase()) || c.user.username.toLowerCase().includes(convSearch.toLowerCase());
    const matchArchived = showArchived ? c.is_archived : !c.is_archived;
    const matchLabel = !labelFilter || convLabels[c.user.id] === labelFilter;
    return matchSearch && matchArchived && matchLabel;
  }).sort((a, b) => {
    const aPinned = pinnedConvIds.indexOf(a.user.id);
    const bPinned = pinnedConvIds.indexOf(b.user.id);
    if (aPinned !== -1 && bPinned === -1) return -1;
    if (bPinned !== -1 && aPinned === -1) return 1;
    if (aPinned !== -1 && bPinned !== -1) return aPinned - bPinned;
    return 0;
  });

  const displayMessages = msgSearch
    ? messages.filter(m => m.content?.toLowerCase().includes(msgSearch.toLowerCase()))
    : messages;

  const totalUnread = conversations.filter(c => !c.is_archived && !c.is_muted).reduce((s, c) => s + (c.unread_count || 0), 0);
  const archivedCount = conversations.filter(c => c.is_archived).length;

  // Date separators
  type MsgItem = Message | { _sep: true; label: string; key: string };
  const msgsWithSeps: MsgItem[] = [];
  let lastDate = '';
  for (const m of displayMessages) {
    const d = new Date(m.created_at).toDateString();
    if (d !== lastDate) { msgsWithSeps.push({ _sep: true, label: fmtDate(m.created_at), key: `sep-${m.id}` }); lastDate = d; }
    msgsWithSeps.push(m);
  }

  const REACTIONS_QUICK = ['👍', '❤️', '😂', '😮', '😢'];

  // Feature R9 — Computed stats
  const chatStats = (() => {
    const valid = messages.filter(m => m.message_type !== 'deleted');
    const sent = valid.filter(m => m.sender_id === meId);
    const recv = valid.filter(m => m.sender_id !== meId);
    const media = valid.filter(m => ['image','audio','gif','sticker','location'].includes(m.message_type));
    const hourCounts: Record<number, number> = {};
    valid.forEach(m => { const h = new Date(m.created_at).getHours(); hourCounts[h] = (hourCounts[h] || 0) + 1; });
    const peakHour = Object.entries(hourCounts).sort((a,b) => b[1]-a[1])[0];
    const allText = valid.map(m => m.content ?? '').join(' ');
    const emojiRe = /\p{Emoji_Presentation}/gu;
    const emojiMatches = allText.match(emojiRe) ?? [];
    const emojiFreq: Record<string,number> = {};
    emojiMatches.forEach(e => { emojiFreq[e] = (emojiFreq[e]||0)+1; });
    const topEmojis = Object.entries(emojiFreq).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([e])=>e);
    const firstMsg = valid[0];
    const ageDays = firstMsg ? Math.floor((Date.now() - new Date(firstMsg.created_at).getTime()) / 86400000) : 0;
    return { total: valid.length, sent: sent.length, recv: recv.length, media: media.length, peakHour, topEmojis, firstMsg, ageDays };
  })();

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={`msg-outer${active ? ' has-active' : ''}`} style={{ display: 'flex', gap: 16, maxWidth: 1100, margin: '0 auto' }}
      onClick={() => { setMenuMsg(null); setHoveredMsg(null); setReceiptTooltip(null); setEmojiPickerFor(null); setShowLabelMenu(null); }}>

      {/* ── Conversation list ── */}
      <div className="card msg-conv" style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--blue-100)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            {/* Feature R6 + Feature 7 — Own avatar + status + presence */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ position: 'relative' }}>
                <div onClick={() => { setStatusEmoji(myStatus?.emoji ?? ''); setStatusText(myStatus?.text ?? ''); setShowStatusModal(true); }} style={{ cursor: 'pointer' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                    Messages {totalUnread > 0 && <span style={{ background: 'var(--blue-500)', color: 'white', borderRadius: 'var(--radius-full)', padding: '1px 7px', fontSize: '0.7rem', marginLeft: 4 }}>{totalUnread}</span>}
                  </span>
                  {myStatus?.emoji && <span title={myStatus.text} style={{ fontSize: '1rem', marginLeft: 4 }}>{myStatus.emoji}</span>}
                </div>
                {/* Feature 7 — Presence indicator */}
                <button onClick={() => setShowPresencePicker(v => !v)} title="Set your presence"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', padding: '2px 4px', borderRadius: 4, marginLeft: 2 }}>
                  {PRESENCE_OPTIONS.find(p => p.value === myPresence)?.label.split(' ')[0] ?? '🟢'}
                </button>
                {showPresencePicker && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid var(--blue-100)', borderRadius: 10, boxShadow: 'var(--shadow)', zIndex: 30, minWidth: 140, marginTop: 2 }}
                    onClick={e => e.stopPropagation()}>
                    {PRESENCE_OPTIONS.map(p => (
                      <button key={p.value} onClick={() => changePresence(p.value)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '7px 12px', background: myPresence === p.value ? 'var(--blue-50)' : 'none', border: 'none', cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left', fontWeight: myPresence === p.value ? 700 : 400 }}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Feature 2 — Global search button */}
              <button onClick={() => setShowGlobalSearch(v => !v)} title="Global search (Ctrl+Shift+F)"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: showGlobalSearch ? 'var(--blue-500)' : 'var(--gray-400)' }}>🔭</button>
            </div>
            <button onClick={() => setShowNewChat(true)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.8rem' }}>+ New</button>
          </div>
          <input ref={convSearchRef} value={convSearch} onChange={e => setConvSearch(e.target.value)}
            placeholder="Search conversations... (Ctrl+K)"
            style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Archive tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--blue-100)' }}>
          {(['Chats', 'Archived'] as const).map((label, i) => {
            const isArch = i === 1;
            return (
              <button key={label} onClick={() => setShowArchived(isArch)}
                style={{ flex: 1, padding: '7px 0', background: 'none', border: 'none', borderBottom: showArchived === isArch ? '2px solid var(--blue-500)' : '2px solid transparent', fontWeight: showArchived === isArch ? 700 : 400, fontSize: '0.82rem', cursor: 'pointer', color: 'var(--gray-600)' }}>
                {label}{isArch && archivedCount > 0 ? ` (${archivedCount})` : ''}
              </button>
            );
          })}
        </div>

        {/* Feature R11 — Label filter bar */}
        <div style={{ display: 'flex', gap: 4, padding: '6px 10px', borderBottom: '1px solid var(--blue-50)', overflowX: 'auto', flexShrink: 0 }}>
          <button onClick={() => setLabelFilter(null)}
            style={{ flexShrink: 0, padding: '3px 8px', borderRadius: 'var(--radius-full)', border: '1px solid var(--blue-100)', background: !labelFilter ? 'var(--blue-500)' : 'none', color: !labelFilter ? 'white' : 'var(--gray-500)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: !labelFilter ? 700 : 400 }}>
            All
          </button>
          {Object.entries(LABEL_META).map(([label, meta]) => (
            <button key={label} onClick={() => setLabelFilter(labelFilter === label ? null : label)}
              style={{ flexShrink: 0, padding: '3px 8px', borderRadius: 'var(--radius-full)', border: `1px solid ${meta.color}`, background: labelFilter === label ? meta.color : 'none', color: labelFilter === label ? 'white' : meta.color, fontSize: '0.7rem', cursor: 'pointer', fontWeight: labelFilter === label ? 700 : 400 }}>
              {meta.emoji} {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <style>{`.conv-row:hover{background:var(--blue-50)!important}.conv-row:hover .conv-btns{opacity:1!important}`}</style>
          {filteredConvs.map(conv => {
            const isActive = active?.user.id === conv.user.id;
            const convLabel = convLabels[conv.user.id];
            const draft = typeof window !== 'undefined' ? localStorage.getItem(`draft_${conv.user.id}`) ?? '' : '';
            const isLocked = lockedConvs.has(conv.user.id) && !unlockedConvs.has(conv.user.id);
            const handleConvClick = () => {
              setSelectMode(false); setSelected(new Set());
              if (isLocked && conv.user.id !== active?.user.id) { setPinPrompt(conv); setPinInput(''); }
              else setActive(conv);
            };
            return (
              <div key={conv.user.id} className="conv-row" onClick={handleConvClick}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: isActive ? 'var(--blue-50)' : 'transparent', borderBottom: '1px solid var(--blue-50)', position: 'relative', borderLeft: convLabel ? `3px solid ${LABEL_META[convLabel]?.color}` : '3px solid transparent' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={conv.user.avatar} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                  {presenceDotColor(conv.user.presence, conv.user.last_seen) && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: presenceDotColor(conv.user.presence, conv.user.last_seen)!, border: '2px solid white' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: conv.unread_count > 0 ? 700 : 500, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                      {pinnedConvIds.includes(conv.user.id) && <span style={{ fontSize: '0.65rem', marginRight: 3 }}>📌</span>}
                      {conv.user.name}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--gray-400)', flexShrink: 0 }}>
                      {conv.last_time ? new Date(conv.last_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: draft && !isActive ? 'var(--blue-500)' : 'var(--gray-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {conv.is_muted && <span style={{ fontSize: '0.7rem' }}>🔇</span>}
                    {isLocked && <span style={{ fontSize: '0.7rem' }}>🔒</span>}
                    {listTyping[conv.user.id] ? <em>typing...</em> : draft && !isActive ? `📝 ${draft.slice(0, 30)}` : conv.last_message}
                  </div>
                </div>
                {conv.unread_count > 0 && (
                  <span style={{ background: 'var(--blue-500)', color: 'white', borderRadius: 'var(--radius-full)', padding: '1px 6px', fontSize: '0.68rem', fontWeight: 700, flexShrink: 0 }}>
                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                  </span>
                )}
                <div className="conv-btns" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.15s' }}>
                  {/* Feature 3 — Pin conversation */}
                  <button onClick={ev => { ev.stopPropagation(); pinConv(conv.user.id); }} title={pinnedConvIds.includes(conv.user.id) ? 'Unpin' : 'Pin to top'}
                    style={{ background: 'var(--blue-100)', border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {pinnedConvIds.includes(conv.user.id) ? '📌' : '📍'}
                  </button>
                  {/* Feature R11 — Label picker */}
                  <div style={{ position: 'relative' }}>
                    <button onClick={ev => { ev.stopPropagation(); setShowLabelMenu(showLabelMenu === conv.user.id ? null : conv.user.id); }}
                      style={{ background: 'var(--blue-100)', border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      🏷️
                    </button>
                    {showLabelMenu === conv.user.id && (
                      <div style={{ position: 'absolute', right: 0, bottom: '100%', marginBottom: 2, background: 'white', border: '1px solid var(--blue-100)', borderRadius: 8, boxShadow: 'var(--shadow)', zIndex: 30, padding: 4 }}
                        onClick={e => e.stopPropagation()}>
                        {Object.entries(LABEL_META).map(([label, meta]) => (
                          <button key={label} onClick={() => toggleLabel(conv.user.id, label)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', padding: '4px 8px', background: convLabels[conv.user.id] === label ? meta.color : 'none', color: convLabels[conv.user.id] === label ? 'white' : meta.color, border: 'none', cursor: 'pointer', borderRadius: 4, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                            {meta.emoji} {label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={ev => { ev.stopPropagation(); muteConv(conv.user.id); }} title={conv.is_muted ? 'Unmute' : 'Mute'}
                    style={{ background: 'var(--blue-100)', border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {conv.is_muted ? '🔔' : '🔇'}
                  </button>
                  <button onClick={ev => { ev.stopPropagation(); archiveConv(conv.user.id); }} title={conv.is_archived ? 'Unarchive' : 'Archive'}
                    style={{ background: 'var(--blue-100)', border: 'none', borderRadius: 6, width: 24, height: 24, cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {conv.is_archived ? '📂' : '📁'}
                  </button>
                </div>
              </div>
            );
          })}
          {filteredConvs.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem' }}>No conversations</div>}
        </div>
      </div>

      {/* ── Chat panel ── */}
      {active ? (
        <div className="card msg-chat-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
          {/* Header */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--blue-100)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button className="msg-back" onClick={() => setActive(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--blue-500)', fontSize: '1.1rem', padding: '0 4px 0 0', alignItems: 'center', flexShrink: 0 }}>
              ←
            </button>
            {/* Clickable user info (Feature 8) */}
            <div onClick={loadContactInfo} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={active.user.avatar} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} />
                {presenceDotColor(active.user.presence, active.user.last_seen) && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: presenceDotColor(active.user.presence, active.user.last_seen)!, border: '2px solid white' }} />}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{active.user.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>
                  {partnerTyping ? '✎ typing...' : getPresence(active.user.last_seen, active.user.presence)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {/* Feature 2 — Disappear select */}
              <select value={disappearMode} onChange={async e => {
                const mode = e.target.value; setDisappearMode(mode);
                await fetch(`/api/messages/conversation/${active.user.id}/disappear`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) });
              }} style={{ fontSize: '0.72rem', border: '1px solid var(--blue-100)', borderRadius: 6, padding: '3px 5px', color: 'var(--gray-500)', background: 'white', cursor: 'pointer' }}>
                <option value="off">⏱ Off</option>
                <option value="1h">1 hour</option>
                <option value="8h">8 hours</option>
                <option value="24h">24 hours</option>
                <option value="7d">7 days</option>
              </select>

              {/* Feature 11 — Theme select */}
              <select value={chatTheme} onChange={e => {
                const t = e.target.value as ThemeName; setChatTheme(t);
                localStorage.setItem(`theme_${active.user.id}`, t);
              }} style={{ fontSize: '0.72rem', border: '1px solid var(--blue-100)', borderRadius: 6, padding: '3px 5px', color: 'var(--gray-500)', background: 'white', cursor: 'pointer' }}>
                {(Object.keys(CHAT_THEMES) as ThemeName[]).map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {!selectMode ? (
                <>
                  <button onClick={() => { setShowMsgSearch(v => !v); setMsgSearch(''); }} title="Search messages (Ctrl+F)" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--gray-400)' }}>🔍</button>
                  <button onClick={loadPinned} title="Pinned messages" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--gray-400)' }}>📌</button>
                  <button onClick={loadStarred} title="Starred messages" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--gray-400)' }}>⭐</button>
                  <button onClick={loadMedia} title="Shared media" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--gray-400)' }}>🖼️</button>
                  <button onClick={exportChat} title="Export chat" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--gray-400)' }}>⬇️</button>
                  {/* Feature R9 — Stats */}
                  <button onClick={() => setShowStats(true)} title="Chat statistics" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--gray-400)' }}>📊</button>
                  {/* Feature 11 — Print */}
                  <button onClick={printChat} title="Print / Save as PDF" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--gray-400)' }}>🖨️</button>
                  {/* Feature R4 — Lock */}
                  <button onClick={() => toggleLockConv(active)} title={lockedConvs.has(active.user.id) ? 'Unlock conversation' : 'Lock conversation'} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: lockedConvs.has(active.user.id) ? 'var(--blue-500)' : 'var(--gray-400)' }}>
                    {lockedConvs.has(active.user.id) ? '🔒' : '🔓'}
                  </button>
                  {/* Feature R1 — Scheduled badge */}
                  {scheduledMsgs.length > 0 && (
                    <button onClick={() => setShowScheduledList(true)} style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', padding: '2px 8px', fontSize: '0.7rem', color: 'var(--blue-600)', cursor: 'pointer' }}>
                      📅 {scheduledMsgs.length} scheduled
                    </button>
                  )}
                  <button onClick={() => setSelectMode(true)} title="Select messages" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: 'var(--gray-400)' }}>☑️</button>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{selected.size} selected</span>
                  {selected.size > 0 && <button onClick={bulkDelete} style={{ padding: '4px 10px', fontSize: '0.78rem', background: 'var(--error)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Delete</button>}
                  <button onClick={() => { setSelectMode(false); setSelected(new Set()); }} style={{ padding: '4px 10px', fontSize: '0.78rem', background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                </>
              )}
            </div>
          </div>

          {/* In-message search */}
          {showMsgSearch && (
            <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--blue-100)', display: 'flex', gap: 8 }}>
              <input value={msgSearch} onChange={e => setMsgSearch(e.target.value)} placeholder="Search in conversation..." autoFocus
                style={{ flex: 1, padding: '5px 10px', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', fontSize: '0.82rem', outline: 'none' }} />
              <button onClick={() => { setShowMsgSearch(false); setMsgSearch(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
          )}

          {/* Messages */}
          <div ref={msgContainerRef} onScroll={handleMsgScroll}
            style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 4px', display: 'flex', flexDirection: 'column', gap: 2, background: theme.bg }}>

            {/* Feature 4 — Load more */}
            {hasMoreMessages && (
              <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                <button onClick={loadMoreMessages} disabled={loadingMore}
                  style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', padding: '5px 16px', fontSize: '0.78rem', color: 'var(--blue-600)', cursor: 'pointer' }}>
                  {loadingMore ? '...' : '↑ Load older messages'}
                </button>
              </div>
            )}

            {msgsWithSeps.map(item => {
              if ('_sep' in item) {
                return (
                  <div key={item.key} style={{ textAlign: 'center', margin: '10px 0 4px' }}>
                    <span style={{ background: 'rgba(0,0,0,0.08)', backdropFilter: 'blur(4px)', borderRadius: 'var(--radius-full)', padding: '3px 12px', fontSize: '0.7rem', color: 'var(--gray-500)', fontWeight: 600 }}>{item.label}</span>
                  </div>
                );
              }

              const msg = item as Message;
              const isMe = msg.sender_id === meId;
              const isDeleted = msg.message_type === 'deleted';
              const isHovered = hoveredMsg === msg.id;
              const hasMenu = menuMsg === msg.id;
              const isSelected = selected.has(msg.id);
              const firstUrl = msg.message_type === 'text' ? (msg.content?.match(URL_RE) ?? [])[0] : undefined;
              const emojiLarge = msg.message_type === 'text' && isEmojiOnly(msg.content ?? '');
              const bubbleBg = isDeleted ? 'var(--gray-100)' : isMe ? theme.myBubble : theme.theirBubble;
              const bubbleColor = isDeleted ? 'var(--gray-400)' : isMe ? theme.myText : theme.theirText;

              const highlightContent = (content: string) => {
                if (!msgSearch || !content) return content;
                const idx = content.toLowerCase().indexOf(msgSearch.toLowerCase());
                if (idx === -1) return content;
                return <>{content.slice(0, idx)}<mark style={{ background: '#fef08a', borderRadius: 2 }}>{content.slice(idx, idx + msgSearch.length)}</mark>{content.slice(idx + msgSearch.length)}</>;
              };

              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 2, position: 'relative' }}
                  onMouseEnter={() => setHoveredMsg(msg.id)}
                  onMouseLeave={() => { if (!hasMenu && emojiPickerFor !== msg.id) setHoveredMsg(null); }}>

                  {selectMode && (
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(msg.id)}
                      style={{ position: 'absolute', left: isMe ? undefined : -18, right: isMe ? -18 : undefined, top: 12 }} />
                  )}

                  {/* Hover toolbar */}
                  {isHovered && !isDeleted && !selectMode && (
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4, zIndex: 10, flexDirection: isMe ? 'row-reverse' : 'row', position: 'relative' }}>
                      {REACTIONS_QUICK.map(e => (
                        <button key={e} onClick={ev => { ev.stopPropagation(); reactTo(msg.id, e); }}
                          style={{ background: 'white', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', padding: '2px 5px', cursor: 'pointer', fontSize: '0.85rem', boxShadow: 'var(--shadow)' }}>
                          {e}
                        </button>
                      ))}
                      {/* Feature 3 — Full emoji picker */}
                      <div style={{ position: 'relative' }}>
                        <button onClick={ev => { ev.stopPropagation(); setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id); }}
                          style={{ background: 'white', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', padding: '2px 7px', cursor: 'pointer', fontSize: '0.85rem', boxShadow: 'var(--shadow)', fontWeight: 700 }}>
                          +
                        </button>
                        {emojiPickerFor === msg.id && (
                          <div style={{ position: 'absolute', bottom: '100%', [isMe ? 'right' : 'left']: 0, marginBottom: 4, zIndex: 30 }} onClick={e => e.stopPropagation()}>
                            <EmojiPickerPanel onSelect={e => reactTo(msg.id, e)} />
                          </div>
                        )}
                      </div>
                      <button onClick={ev => { ev.stopPropagation(); setReplyTo(msg); }} title="Reply"
                        style={{ background: 'white', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', padding: '2px 6px', cursor: 'pointer', fontSize: '0.85rem', boxShadow: 'var(--shadow)' }}>↩</button>
                      <button onClick={ev => { ev.stopPropagation(); setForwardMsg(msg); }} title="Forward"
                        style={{ background: 'white', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', padding: '2px 6px', cursor: 'pointer', fontSize: '0.85rem', boxShadow: 'var(--shadow)' }}>↪</button>
                      {/* More menu */}
                      <div style={{ position: 'relative' }}>
                        <button onClick={ev => { ev.stopPropagation(); setMenuMsg(hasMenu ? null : msg.id); }}
                          style={{ background: 'white', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', padding: '2px 6px', cursor: 'pointer', fontSize: '0.85rem', boxShadow: 'var(--shadow)' }}>⋯</button>
                        {hasMenu && (
                          <div style={{ position: 'absolute', bottom: '100%', [isMe ? 'right' : 'left']: 0, marginBottom: 4, background: 'white', border: '1px solid var(--blue-100)', borderRadius: 10, boxShadow: 'var(--shadow)', zIndex: 20, minWidth: 150 }}
                            onClick={e => e.stopPropagation()}>
                            {(() => {
                              const sendTs = recentSends.get(msg.id);
                              const secsLeft = sendTs ? Math.max(0, 60 - Math.floor((Date.now() - sendTs) / 1000)) : 0;
                              return [
                                { label: msg.is_starred ? '☆ Unstar' : '⭐ Star', action: () => toggleStar(msg.id) },
                                { label: msg.is_pinned ? '📌 Unpin' : '📌 Pin', action: () => togglePin(msg.id) },
                                { label: '📋 Copy text', action: () => { navigator.clipboard.writeText(msg.content ?? ''); setMenuMsg(null); } },
                                ...(!isDeleted && msg.message_type === 'text'
                                  ? [{ label: '🔊 Read aloud', action: () => { readAloud(msg.content ?? ''); setMenuMsg(null); } }]
                                  : []),
                                ...(!isDeleted && msg.message_type === 'text'
                                  ? [{ label: '🌐 Translate', action: () => { translateMsg(msg.id, msg.content ?? ''); setMenuMsg(null); } }]
                                  : []),
                                ...(isMe && msg.message_type === 'text' && !isDeleted
                                  ? [{ label: '✏️ Edit', action: () => { setEditingMsg(msg); setEditText(msg.content ?? ''); setMenuMsg(null); } }]
                                  : []),
                                ...(isMe && !isDeleted && secsLeft > 0
                                  ? [{ label: `↩ Unsend (${secsLeft}s left)`, action: () => deleteMsg(msg.id), danger: true }]
                                  : []),
                                ...(isMe && !isDeleted
                                  ? [{ label: '🗑 Delete', action: () => deleteMsg(msg.id), danger: true }]
                                  : []),
                                { label: lockedConvs.has(active.user.id) ? '🔓 Unlock conv' : '🔒 Lock conv', action: () => toggleLockConv(active) },
                              ];
                            })().map(item => (
                              <button key={item.label} onClick={item.action}
                                style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '0.82rem', color: (item as any).danger ? 'var(--error)' : 'var(--gray-700)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                {item.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {msg.is_forwarded && <div style={{ fontSize: '0.65rem', color: 'var(--gray-400)', marginBottom: 2, textAlign: isMe ? 'right' : 'left' }}>↪ Forwarded</div>}

                  {/* Bubble */}
                  <div style={{ maxWidth: '72%', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: emojiLarge ? '4px 8px' : '8px 12px', background: bubbleBg, color: bubbleColor, boxShadow: isMe ? 'var(--shadow-blue)' : 'var(--shadow)', fontSize: emojiLarge ? '2.4rem' : '0.88rem', lineHeight: 1.45, border: isSelected ? '2px solid var(--blue-400)' : 'none' }}>
                    {msg.reply_to && <ReplyBubble msg={msg.reply_to} isMe={isMe} />}

                    {isDeleted ? (
                      <em style={{ opacity: 0.6, fontSize: '0.82rem' }}>This message was deleted</em>
                    ) : msg.message_type === 'image' || msg.message_type === 'gif' ? (
                      <img src={msg.image_url} alt="" style={{ maxWidth: 200, borderRadius: 8, display: 'block' }} />
                    ) : msg.message_type === 'audio' ? (
                      <VoicePlayer src={msg.image_url} />
                    ) : msg.message_type === 'video' ? (
                      <video controls style={{ maxWidth: 220, borderRadius: 8, display: 'block' }}>
                        <source src={msg.image_url || msg.content} />
                        <a href={msg.image_url || msg.content} target="_blank" rel="noreferrer" style={{ color: 'inherit', fontSize: '0.82rem' }}>View video</a>
                      </video>
                    ) : msg.message_type === 'poll' && msg.poll ? (() => {
                      const opts: string[] = (() => { try { return JSON.parse(msg.poll!.options); } catch { return []; } })();
                      const votes = msg.poll.votes ?? [];
                      const total = votes.length;
                      const myVote = votes.find((v: PollVote) => v.user_id === meId);
                      return (
                        <div style={{ minWidth: 200 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>🗳 {msg.poll!.question}</div>
                          {opts.map((opt: string, idx: number) => {
                            const count = votes.filter((v: PollVote) => v.option_idx === idx).length;
                            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                            const voted = myVote?.option_idx === idx;
                            return (
                              <button key={idx} onClick={() => votePoll(msg.poll!.id, idx, msg.id)}
                                style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 6, padding: '6px 10px',
                                  background: voted ? (isMe ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)') : (isMe ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'),
                                  border: voted ? '1.5px solid currentColor' : '1px solid transparent',
                                  borderRadius: 8, cursor: 'pointer', color: 'inherit', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
                                  background: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)', borderRadius: 8, transition: 'width 0.4s' }} />
                                <span style={{ position: 'relative', fontSize: '0.82rem' }}>{opt}</span>
                                <span style={{ position: 'relative', float: 'right', fontSize: '0.78rem', opacity: 0.75 }}>{pct}%</span>
                              </button>
                            );
                          })}
                          <div style={{ fontSize: '0.68rem', opacity: 0.6, marginTop: 4 }}>{total} vote{total !== 1 ? 's' : ''}</div>
                        </div>
                      );
                    })() : msg.message_type === 'sticker' ? (
                      <div style={{ fontSize: '2rem', lineHeight: 1.2, textAlign: 'center', padding: '4px 0' }}>{msg.content}</div>
                    ) : msg.message_type === 'location' ? (() => {
                      let coords = { lat: 0, lng: 0 };
                      try { coords = JSON.parse(msg.content); } catch {}
                      return (
                        <div>
                          <a href={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'inherit', textDecoration: 'none', fontSize: '0.85rem', marginBottom: 6 }}>
                            📍 View location ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
                          </a>
                          <iframe src={`https://maps.google.com/maps?q=${coords.lat},${coords.lng}&output=embed&zoom=14`} width="220" height="130" style={{ border: 0, borderRadius: 8, display: 'block' }} loading="lazy" />
                        </div>
                      );
                    })() : (
                      <>
                        <span dangerouslySetInnerHTML={{ __html: renderRichText(msg.content ?? '') }} />
                        {translations[msg.id] && (
                          <div style={{ fontSize: '0.75rem', opacity: 0.75, marginTop: 4, fontStyle: 'italic' }}>
                            🌐 {translations[msg.id]}
                            {translating === msg.id && <span style={{ marginLeft: 4, opacity: 0.6 }}>…</span>}
                          </div>
                        )}
                        {translating === msg.id && !translations[msg.id] && (
                          <div style={{ fontSize: '0.72rem', opacity: 0.55, marginTop: 3, fontStyle: 'italic' }}>🌐 Translating…</div>
                        )}
                      </>
                    )}

                    {/* Feature 1 — Edited label */}
                    {msg.is_edited && !isDeleted && (
                      <span style={{ fontSize: '0.6rem', opacity: 0.6, marginLeft: 4 }}>(edited)</span>
                    )}

                    {firstUrl && !isDeleted && <LinkPreview url={firstUrl} />}
                    {msg.is_pinned && !isDeleted && <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: 2 }}>📌 Pinned</div>}
                    {msg.is_starred && !isDeleted && <div style={{ fontSize: '0.65rem', color: 'gold', marginTop: 2 }}>☆ Starred</div>}

                    {/* Timestamp + Feature 12 — Receipt tooltip */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 3 }}>
                      <span style={{ fontSize: '0.62rem', opacity: 0.7 }}>{fmtTime(msg.created_at)}</span>
                      {isMe && !isDeleted && (
                        <span onClick={ev => { ev.stopPropagation(); setReceiptTooltip(receiptTooltip === msg.id ? null : msg.id); }}
                          style={{ cursor: 'pointer', position: 'relative', fontSize: '0.7rem', lineHeight: 1 }}>
                          {msg.is_read
                            ? <span style={{ color: '#93c5fd' }}>✓✓</span>
                            : msg.delivered_at
                            ? <span style={{ opacity: 0.6 }}>✓✓</span>
                            : <span style={{ opacity: 0.5 }}>✓</span>}
                          {receiptTooltip === msg.id && (
                            <div style={{ position: 'absolute', bottom: '100%', right: 0, background: 'var(--gray-800)', color: 'white', borderRadius: 8, padding: '6px 10px', fontSize: '0.68rem', whiteSpace: 'nowrap', boxShadow: 'var(--shadow)', zIndex: 50, marginBottom: 4, minWidth: 160 }}
                              onClick={e => e.stopPropagation()}>
                              {msg.delivered_at
                                ? <div>Delivered: {fmtTime(msg.delivered_at)}</div>
                                : <div style={{ opacity: 0.6 }}>Not yet delivered</div>}
                              {msg.is_read
                                ? <div style={{ marginTop: 3 }}>Read ✓</div>
                                : <div style={{ opacity: 0.6, marginTop: 3 }}>Not yet read</div>}
                              <div style={{ position: 'absolute', bottom: -5, right: 10, width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid var(--gray-800)' }} />
                            </div>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reactions — click to toggle your own, long-title shows detail */}
                  {(msg.reactions?.length ?? 0) > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                      {Object.entries(
                        (msg.reactions ?? []).reduce((acc, r) => { acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc; }, {} as Record<string, number>)
                      ).map(([emoji, count]) => (
                        <button key={emoji}
                          onClick={ev => { ev.stopPropagation(); reactTo(msg.id, emoji); }}
                          onDoubleClick={ev => { ev.stopPropagation(); loadReactionDetail(msg.id); }}
                          title="Click to react • Double-click to see who reacted"
                          style={{ background: 'white', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', padding: '2px 7px', cursor: 'pointer', fontSize: '0.8rem', boxShadow: 'var(--shadow)' }}>
                          {emoji} {count}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {partnerTyping && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, marginBottom: 4 }}>
                <img src={active.user.avatar} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                <div style={{ background: 'var(--blue-50)', borderRadius: '18px 18px 18px 4px', boxShadow: 'var(--shadow)' }}><TypingDots /></div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Feature 7 — Jump button */}
          {isScrolledUp && newMsgCount > 0 && (
            <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
              <button onClick={scrollToBottom}
                style={{ background: 'var(--blue-500)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '6px 16px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-blue)' }}>
                ↓ {newMsgCount} new {newMsgCount === 1 ? 'message' : 'messages'}
              </button>
            </div>
          )}

          {/* Reply bar */}
          {replyTo && (
            <div style={{ padding: '6px 14px', background: 'var(--blue-50)', borderTop: '1px solid var(--blue-100)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, borderLeft: '3px solid var(--blue-400)', paddingLeft: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--blue-500)' }}>{replyTo.sender?.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {replyTo.message_type === 'image' ? '📷 Image' : replyTo.message_type === 'audio' ? '🎤 Voice' : replyTo.content?.slice(0, 60)}
                </div>
              </div>
              <button onClick={() => setReplyTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '1rem' }}>✕</button>
            </div>
          )}

          {/* Feature 1 — Edit bar */}
          {editingMsg && (
            <div style={{ padding: '6px 14px', background: 'var(--blue-50)', borderTop: '1px solid var(--blue-100)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, borderLeft: '3px solid var(--blue-400)', paddingLeft: 8 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--blue-500)' }}>✏️ Editing message</div>
                <input value={editText} onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') { setEditingMsg(null); setEditText(''); } }}
                  autoFocus style={{ width: '100%', background: 'none', border: 'none', outline: 'none', fontSize: '0.88rem', color: 'var(--gray-700)' }} />
              </div>
              <button onClick={saveEdit} style={{ background: 'var(--blue-500)', color: 'white', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem' }}>Save</button>
              <button onClick={() => { setEditingMsg(null); setEditText(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '1rem' }}>✕</button>
            </div>
          )}

          {/* Image preview */}
          {imagePreview && (
            <div style={{ padding: '6px 14px', borderTop: '1px solid var(--blue-100)', position: 'relative', width: 'fit-content' }}>
              <img src={imagePreview} alt="" style={{ maxHeight: 80, borderRadius: 8 }} />
              <button onClick={() => { setImageUrl(''); setImagePreview(''); setMsgType('text'); }}
                style={{ position: 'absolute', top: 2, right: 10, background: 'var(--gray-700)', color: 'white', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          )}

          {/* Image URL input */}
          {showImageInput && (
            <div style={{ padding: '6px 14px', borderTop: '1px solid var(--blue-100)', display: 'flex', gap: 8 }}>
              <input placeholder="Paste image URL..." value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImagePreview(e.target.value); setMsgType('image'); }}
                style={{ flex: 1, padding: '5px 10px', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', fontSize: '0.82rem', outline: 'none' }} />
              <button onClick={() => setShowImageInput(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
          )}

          {/* GIF picker */}
          {showGif && (
            <div style={{ borderTop: '1px solid var(--blue-100)', maxHeight: 260, overflow: 'auto', padding: 8 }}>
              <GifPicker onSelect={(url: string) => { setImageUrl(url); setImagePreview(url); setMsgType('gif'); setShowGif(false); }} onClose={() => setShowGif(false)} />
            </div>
          )}

          {/* Feature R12 — Smart reply chips */}
          {smartReplies.length > 0 && !text && (
            <div style={{ padding: '6px 14px', borderTop: '1px solid var(--blue-50)', display: 'flex', gap: 6, overflowX: 'auto' }}>
              {smartReplies.map((s, i) => (
                <button key={i} onClick={() => { setText(s); setSmartReplies([]); msgInputRef.current?.focus(); }}
                  style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--blue-200)', background: 'var(--blue-50)', color: 'var(--blue-700)', fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {s}
                </button>
              ))}
              <button onClick={() => setSmartReplies([])} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '0.8rem' }}>✕</button>
            </div>
          )}

          {/* Feature R2 — Template panel */}
          {showTemplates && (
            <div style={{ padding: '6px 14px', borderTop: '1px solid var(--blue-100)', background: 'var(--blue-50)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--gray-600)' }}>Quick Templates</span>
                <button onClick={() => setShowTemplates(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '0.9rem' }}>✕</button>
              </div>
              {templates.length === 0 && <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>No templates yet. Type a message and click "Save as template".</div>}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                {templates.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button onClick={() => { setText(t); setShowTemplates(false); msgInputRef.current?.focus(); }}
                      style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--blue-200)', background: 'white', color: 'var(--gray-700)', fontSize: '0.78rem', cursor: 'pointer' }}>{t.slice(0, 30)}</button>
                    <button onClick={() => removeTemplate(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '0.72rem' }}>✕</button>
                  </div>
                ))}
              </div>
              {text.trim() && <button onClick={() => { addTemplate(text); setShowTemplates(false); }}
                style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', border: '1px solid var(--blue-300)', background: 'var(--blue-100)', color: 'var(--blue-700)', fontSize: '0.75rem', cursor: 'pointer' }}>
                + Save "{text.slice(0,20)}" as template
              </button>}
            </div>
          )}

          {/* Feature R1 — Schedule overlay */}
          {showSchedule && (
            <div style={{ padding: '6px 14px', borderTop: '1px solid var(--blue-100)', background: 'var(--blue-50)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--gray-600)', fontWeight: 700 }}>📅 Schedule send:</span>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} min={new Date().toISOString().slice(0,16)}
                style={{ fontSize: '0.78rem', border: '1px solid var(--blue-200)', borderRadius: 6, padding: '3px 7px', outline: 'none' }} />
              {scheduledAt && <button onClick={() => send()} style={{ padding: '3px 10px', background: 'var(--blue-500)', color: 'white', border: 'none', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }}>Schedule</button>}
              <button onClick={() => { setShowSchedule(false); setScheduledAt(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
          )}

          {/* Feature R10 — Sticker picker */}
          {showStickers && (
            <div style={{ borderTop: '1px solid var(--blue-100)', background: 'white', maxHeight: 200, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--blue-50)' }}>
                {(Object.keys(STICKER_PACKS) as PackName[]).map(p => (
                  <button key={p} onClick={() => setStickerPack(p)}
                    style={{ flex: 1, padding: '5px 0', background: stickerPack === p ? 'var(--blue-50)' : 'none', border: 'none', borderBottom: stickerPack === p ? '2px solid var(--blue-500)' : '2px solid transparent', fontSize: '0.72rem', cursor: 'pointer', color: 'var(--gray-600)', fontWeight: stickerPack === p ? 700 : 400 }}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setShowStickers(false)} style={{ padding: '5px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2, padding: 8, overflowY: 'auto' }}>
                {STICKER_PACKS[stickerPack].map((s, i) => (
                  <button key={i} onClick={() => { sendSticker(s); setShowStickers(false); }}
                    style={{ background: 'none', border: '1px solid transparent', borderRadius: 6, padding: 4, cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'monospace', lineHeight: 1.3, textAlign: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feature 9 — Slash command menu */}
          {showSlashMenu && (
            <div className="card" style={{ position: 'absolute', bottom: '100%', left: 14, right: 14, marginBottom: 4, borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)', zIndex: 20 }}>
              {SLASH_COMMANDS.filter(c => c.cmd.startsWith(text || '/')).map(c => (
                <button key={c.cmd} onClick={() => applySlashCommand(c.cmd)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--blue-500)', minWidth: 60 }}>{c.cmd}</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>{c.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Feature 6 — Video URL input */}
          {showVideoInput && (
            <div style={{ padding: '6px 14px', borderTop: '1px solid var(--blue-100)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Paste video URL (mp4, webm)..."
                onKeyDown={e => { if (e.key === 'Enter') { sendVideo(); setShowVideoInput(false); } }}
                style={{ flex: 1, padding: '6px 12px', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', fontSize: '0.82rem', outline: 'none' }} />
              <button onClick={() => { sendVideo(); setShowVideoInput(false); }}
                style={{ padding: '5px 12px', background: 'var(--blue-500)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', fontSize: '0.8rem', cursor: 'pointer' }}>Send</button>
              <button onClick={() => setShowVideoInput(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '1rem' }}>✕</button>
            </div>
          )}

          {/* Input bar */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--blue-100)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
            <button onClick={() => setShowImageInput(v => !v)} title="Image URL" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--gray-400)' }}>📎</button>
            <button onClick={() => fileRef.current?.click()} title="Upload image" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--gray-400)' }}>🖼️</button>
            <button onClick={() => setShowGif(v => !v)} title="GIF" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--gray-400)' }}>🎞</button>
            {/* Feature R10 — Stickers */}
            <button onClick={() => setShowStickers(v => !v)} title="Stickers" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: showStickers ? 'var(--blue-500)' : 'var(--gray-400)' }}>🎭</button>
            {/* Feature R5 — Location */}
            <button onClick={sendLocation} disabled={sendingLocation} title="Share location" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: sendingLocation ? 'var(--blue-500)' : 'var(--gray-400)' }}>📍</button>
            {/* Feature R2 — Templates */}
            <button onClick={() => setShowTemplates(v => !v)} title="Quick templates (/)" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: showTemplates ? 'var(--blue-500)' : 'var(--gray-400)' }}>📋</button>
            {/* Feature R1 — Schedule */}
            <button onClick={() => setShowSchedule(v => !v)} title="Schedule send" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: showSchedule ? 'var(--blue-500)' : 'var(--gray-400)' }}>📅</button>
            {/* Feature 4 — Poll */}
            <button onClick={() => setShowPollModal(true)} title="Create poll" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--gray-400)' }}>🗳</button>
            {/* Feature 6 — Video */}
            <button onClick={() => setShowVideoInput(v => !v)} title="Send video" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: showVideoInput ? 'var(--blue-500)' : 'var(--gray-400)' }}>🎬</button>
            {/* Feature 10 — Translate lang selector */}
            <select value={translateLang} onChange={e => setTranslateLang(e.target.value)} title="Translation language" style={{ background: 'none', border: '1px solid var(--blue-100)', borderRadius: 6, fontSize: '0.72rem', color: 'var(--gray-500)', padding: '2px 4px', cursor: 'pointer' }}>
              {TARGET_LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
            {!recording ? (
              <button onClick={startRecording} title="Voice message" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--gray-400)' }}>🎤</button>
            ) : (
              <button onClick={stopRecording} style={{ background: 'var(--error)', color: 'white', border: 'none', borderRadius: 'var(--radius-full)', padding: '4px 10px', cursor: 'pointer', fontSize: '0.78rem' }}>⏹ {recordingSecs}s</button>
            )}
            <input ref={msgInputRef} value={recording ? '' : text} onChange={e => {
              const v = e.target.value;
              handleTextChange(v);
              if (v === '/' && !text) setShowTemplates(true); else if (text && showTemplates) setShowTemplates(false);
              if (v.startsWith('/') && v.length > 0) setShowSlashMenu(true); else setShowSlashMenu(false);
            }}
              placeholder={recording ? 'Recording...' : 'Type a message... (try /shrug)'}
              disabled={recording}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === 'Escape') { setShowSlashMenu(false); setShowVideoInput(false); } }}
              style={{ flex: 1, padding: '8px 14px', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', fontSize: '0.88rem', outline: 'none', background: recording ? 'var(--gray-50)' : 'white' }} />
            <button onClick={() => send()} disabled={!text.trim() && !imageUrl}
              style={{ borderRadius: 'var(--radius-full)', padding: '8px 18px', fontSize: '0.88rem', background: 'var(--blue-500)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              {scheduledAt ? '📅 Schedule' : 'Send'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card msg-chat-placeholder" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: '2.5rem' }}>💬</div>
          <div style={{ fontSize: '1rem', fontWeight: 500 }}>Select a conversation</div>
          <div style={{ fontSize: '0.82rem' }}>or <button onClick={() => setShowNewChat(true)} style={{ background: 'none', border: 'none', color: 'var(--blue-500)', cursor: 'pointer', fontSize: '0.82rem' }}>start a new one</button></div>
        </div>
      )}

      {/* ── Feature 8 — Contact info side panel ── */}
      {showContactInfo && active && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowContactInfo(false)} />
          <div className="card" style={{ width: 280, flexShrink: 0, overflowY: 'auto', position: 'relative', zIndex: 41, animation: 'slideInRight 0.2s ease' }}>
            <style>{`@keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
            <div style={{ padding: 14, textAlign: 'center', borderBottom: '1px solid var(--blue-100)' }}>
              <button onClick={() => setShowContactInfo(false)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '1.1rem' }}>✕</button>
              <img src={active.user.avatar} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{active.user.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>@{active.user.username}</div>
              {active.user.bio && <div style={{ fontSize: '0.8rem', marginTop: 8, color: 'var(--gray-600)', lineHeight: 1.4 }}>{active.user.bio}</div>}
              <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginTop: 6 }}>
                Joined {new Date(active.user.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' })}
              </div>
            </div>
            {contactMedia.length > 0 && (
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>Shared Media</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
                  {contactMedia.map(m => (
                    <div key={m.id} style={{ aspectRatio: '1', overflow: 'hidden', borderRadius: 6 }}>
                      <img src={m.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {contactLinks.length > 0 && (
              <div style={{ padding: '0 14px 14px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>Shared Links</div>
                {contactLinks.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    style={{ display: 'block', fontSize: '0.72rem', color: 'var(--blue-500)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {url}
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── New Chat Modal ── */}
      {showNewChat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setShowNewChat(false); setUserSearch(''); setUserResults([]); }}>
          <div className="card" style={{ width: 380, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--blue-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>New Conversation</span>
              <button onClick={() => { setShowNewChat(false); setUserSearch(''); setUserResults([]); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '1.1rem' }}>✕</button>
            </div>
            <div style={{ padding: 12 }}>
              <input value={userSearch} onChange={e => searchUsers(e.target.value)} placeholder="Search users..." autoFocus
                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--blue-100)', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
              {userResults.map(u => (
                <div key={u.id} onClick={() => startChat(u)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <img src={u.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{u.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>@{u.username}</div>
                  </div>
                </div>
              ))}
              {userSearch && userResults.length === 0 && <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem', padding: 16 }}>No users found</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Forward Modal ── */}
      {forwardMsg && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setForwardMsg(null)}>
          <div className="card" style={{ width: 340, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--blue-100)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>Forward to...</span>
              <button onClick={() => setForwardMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {conversations.filter(c => !c.is_archived).map(conv => (
                <div key={conv.user.id} onClick={() => forwardTo(conv)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <img src={conv.user.avatar} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{conv.user.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Pinned Messages Modal ── */}
      {showPinned && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowPinned(false)}>
          <div className="card" style={{ width: 400, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--blue-100)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>📌 Pinned Messages</span>
              <button onClick={() => setShowPinned(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {pinnedMsgs.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No pinned messages</div>
                : pinnedMsgs.map(m => (
                  <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--blue-50)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginBottom: 2 }}>{m.sender?.name} · {fmtTime(m.created_at)}</div>
                    <div style={{ fontSize: '0.85rem' }}>{m.content || '[media]'}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Starred Messages Modal ── */}
      {showStarred && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowStarred(false)}>
          <div className="card" style={{ width: 400, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--blue-100)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>⭐ Starred Messages</span>
              <button onClick={() => setShowStarred(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {starredMsgs.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No starred messages</div>
                : starredMsgs.map(m => (
                  <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--blue-50)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginBottom: 2 }}>{m.sender?.name} · {fmtTime(m.created_at)}</div>
                    <div style={{ fontSize: '0.85rem' }}>{m.content || '[media]'}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Feature R3 — Reaction Details Modal ── */}
      {reactionDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setReactionDetail(null)}>
          <div className="card" style={{ width: 340, maxHeight: '60vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--blue-100)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>Reactions</span>
              <button onClick={() => setReactionDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {reactionDetail.data.length === 0
                ? <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No reactions yet</div>
                : reactionDetail.data.map(group => (
                  <div key={group.emoji} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: 6 }}>{group.emoji} <span style={{ fontSize: '0.78rem', color: 'var(--gray-500)', fontWeight: 600 }}>{group.users.length}</span></div>
                    {group.users.map(u => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <img src={u.avatar} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{u.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>@{u.username}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Feature R4 — PIN Modal ── */}
      {pinPrompt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setPinPrompt(null); setPinInput(''); }}>
          <div className="card" style={{ width: 300, padding: 24, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔒</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Locked Conversation</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-400)', marginBottom: 16 }}>Enter your 4-digit PIN to unlock {pinPrompt.user.name}</div>
            <input type="password" maxLength={4} value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))} placeholder="····" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') tryUnlockConv(pinPrompt!); }}
              style={{ width: '100%', padding: '10px 0', textAlign: 'center', fontSize: '1.4rem', letterSpacing: 8, border: '2px solid var(--blue-200)', borderRadius: 8, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }} />
            <button onClick={() => tryUnlockConv(pinPrompt!)} className="btn btn-primary" style={{ width: '100%' }}>Unlock</button>
            <button onClick={() => { setPinPrompt(null); setPinInput(''); }} style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '0.82rem' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Feature R6 — Custom Status Modal ── */}
      {showStatusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowStatusModal(false)}>
          <div className="card" style={{ width: 340, padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>🎭 Set Your Status</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginBottom: 14 }}>Visible in your conversations sidebar</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={statusEmoji} onChange={e => setStatusEmoji(e.target.value.slice(0,2))} placeholder="😊" maxLength={2}
                style={{ width: 48, textAlign: 'center', fontSize: '1.4rem', border: '1px solid var(--blue-200)', borderRadius: 8, outline: 'none', padding: '4px 0' }} />
              <input value={statusText} onChange={e => setStatusText(e.target.value.slice(0,60))} placeholder="What's your status? (max 60 chars)" maxLength={60}
                style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--blue-200)', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }} />
            </div>
            {myStatus?.emoji || myStatus?.text ? (
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginBottom: 10 }}>Current: {myStatus.emoji} {myStatus.text || <em>no text</em>}</div>
            ) : null}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveStatus} className="btn btn-primary" style={{ flex: 1 }}>Save</button>
              <button onClick={clearStatus} style={{ flex: 1, padding: '8px 0', border: '1px solid var(--blue-100)', borderRadius: 8, background: 'none', cursor: 'pointer', color: 'var(--gray-500)', fontSize: '0.88rem' }}>Clear</button>
              <button onClick={() => setShowStatusModal(false)} style={{ padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Feature R9 — Chat Statistics Modal ── */}
      {showStats && active && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowStats(false)}>
          <div className="card" style={{ width: 380, padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>📊 Chat Stats with {active.user.name}</span>
              <button onClick={() => setShowStats(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Total messages', value: chatStats.total },
                { label: 'You sent', value: chatStats.sent },
                { label: 'You received', value: chatStats.recv },
                { label: 'Media shared', value: chatStats.media },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--blue-50)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--blue-600)' }}>{s.value}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {chatStats.firstMsg && (
              <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginBottom: 8 }}>
                First message: <strong>{new Date(chatStats.firstMsg.created_at).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
                {chatStats.ageDays > 0 && <> &nbsp;·&nbsp; {chatStats.ageDays} days ago</>}
              </div>
            )}
            {chatStats.peakHour && (
              <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)', marginBottom: 8 }}>
                Most active: <strong>{Number(chatStats.peakHour[0]) % 12 || 12}{Number(chatStats.peakHour[0]) < 12 ? ' AM' : ' PM'}</strong> ({chatStats.peakHour[1]} messages)
              </div>
            )}
            {chatStats.topEmojis.length > 0 && (
              <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                Top emojis: <span style={{ fontSize: '1.1rem', letterSpacing: 2 }}>{chatStats.topEmojis.join(' ')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Feature R1 — Scheduled Messages List Modal ── */}
      {showScheduledList && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowScheduledList(false)}>
          <div className="card" style={{ width: 400, maxHeight: '65vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--blue-100)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>📅 Scheduled Messages</span>
              <button onClick={() => setShowScheduledList(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {scheduledMsgs.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No scheduled messages</div>
                : scheduledMsgs.map(m => (
                  <div key={m.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--blue-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', marginBottom: 2 }}>{m.content || '[media]'}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--blue-500)' }}>
                        📅 {m.scheduled_at ? new Date(m.scheduled_at).toLocaleString() : ''}
                      </div>
                    </div>
                    <button onClick={async () => {
                      await fetch(`/api/messages/${m.id}/delete`, { method: 'DELETE' }).catch(() => {});
                      setScheduledMsgs(prev => prev.filter(x => x.id !== m.id));
                    }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: '0.82rem' }}>Cancel</button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Media Gallery Modal ── */}
      {showMedia && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowMedia(false)}>
          <div className="card" style={{ width: 480, maxHeight: '75vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--blue-100)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>🖼️ Shared Media</span>
              <button onClick={() => setShowMedia(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {mediaItems.filter(m => m.message_type === 'image' || m.message_type === 'gif').length > 0 && (
                <>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>Images & GIFs</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, marginBottom: 16 }}>
                    {mediaItems.filter(m => m.message_type === 'image' || m.message_type === 'gif').map(m => (
                      <img key={m.id} src={m.image_url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
                    ))}
                  </div>
                </>
              )}
              {mediaItems.filter(m => m.message_type === 'audio').length > 0 && (
                <>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--gray-600)', marginBottom: 8 }}>Voice Messages</div>
                  {mediaItems.filter(m => m.message_type === 'audio').map(m => (
                    <div key={m.id} style={{ padding: '8px 12px', background: 'var(--blue-50)', borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginBottom: 4 }}>{m.sender?.name} · {fmtTime(m.created_at)}</div>
                      <VoicePlayer src={m.image_url} />
                    </div>
                  ))}
                </>
              )}
              {mediaItems.length === 0 && <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>No shared media</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Feature 4 — Poll Creator Modal ── */}
      {showPollModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowPollModal(false)}>
          <div className="card" style={{ width: 380, padding: 20 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>🗳 Create Poll</span>
              <button onClick={() => setShowPollModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder="Poll question..."
              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--blue-200)', borderRadius: 8, fontSize: '0.88rem', outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
            {pollOptions.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input value={opt} onChange={e => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o); }}
                  placeholder={`Option ${i + 1}`}
                  style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--blue-200)', borderRadius: 8, fontSize: '0.85rem', outline: 'none' }} />
                {pollOptions.length > 2 && (
                  <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: '1rem' }}>✕</button>
                )}
              </div>
            ))}
            {pollOptions.length < 4 && (
              <button onClick={() => setPollOptions([...pollOptions, ''])}
                style={{ display: 'block', width: '100%', padding: '6px', background: 'none', border: '1px dashed var(--blue-300)', borderRadius: 8, color: 'var(--blue-500)', cursor: 'pointer', fontSize: '0.82rem', marginBottom: 12 }}>
                + Add option
              </button>
            )}
            <button onClick={() => { sendPoll(); setShowPollModal(false); }}
              disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
              style={{ width: '100%', padding: '9px', background: 'var(--blue-500)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }}>
              Send Poll
            </button>
          </div>
        </div>
      )}

      {/* ── Feature 2 — Global Message Search Panel ── */}
      {showGlobalSearch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60 }} onClick={() => setShowGlobalSearch(false)}>
          <div className="card" style={{ width: 500, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--blue-100)', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem' }}>🔍</span>
              <input autoFocus value={globalQuery} onChange={e => setGlobalQuery(e.target.value)} placeholder="Search all messages..."
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.92rem' }} />
              {globalSearching && <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Searching…</span>}
              <button onClick={() => setShowGlobalSearch(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {globalResults.length === 0 && globalQuery.trim().length > 1 && !globalSearching && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem' }}>No messages found</div>
              )}
              {globalResults.map(r => (
                <div key={r.id} onClick={() => { setActive(conversations.find(c => c.user.id === (r as any).partner?.id) ?? null); setShowGlobalSearch(false); }}
                  style={{ display: 'flex', gap: 10, padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--blue-50)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--blue-50)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <img src={(r as any).partner?.avatar} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gray-600)' }}>{(r as any).partner?.name}</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--gray-700)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.content}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)' }}>{new Date(r.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Feature 11 — Print stylesheet ── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-chat-area { display: block !important; }
        }
        #print-chat-area { display: none; }
      `}</style>
    </div>
  );
}
