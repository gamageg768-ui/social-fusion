export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  avatar: string;
  cover: string;
  bio: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  is_verified: boolean;
  is_private: boolean;
  location: string;
  website: string;
  last_seen?: string;
  status_emoji?: string;
  status_text?: string;
  presence?: string;
  created_at: string;
  is_following?: boolean;
  follow_requested?: boolean;
  feed_mix?: string;
}

export interface PostReactionOption {
  label: string;
  emoji: string;
}

export interface PostReactionVoteItem {
  id: number;
  post_id: number;
  user_id: number;
  option_idx: number;
}

export interface PostAnnotation {
  id: number;
  post_id: number;
  user_id: number;
  selected_text: string;
  start_offset: number;
  end_offset: number;
  note: string;
  visibility: 'private' | 'circle';
  circle_name: string;
  created_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  content: string;
  image_url: string;
  alt_text?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  view_count?: number;
  post_type: 'post' | 'tweet' | 'reel' | 'repost' | 'quote';
  visibility?: string;
  ref_post_id?: number;
  quote_content?: string;
  is_pinned: boolean;
  scheduled_at?: string;
  thread_id?: number;
  thread_index: number;
  created_at: string;
  user: User;
  liked?: boolean;
  bookmarked?: boolean;
  ref_post?: Post;
  reactions?: PostReaction[];
  my_reaction?: string;
  post_poll?: PostPoll;
  image_urls?: string[];    // parsed from JSON
  is_sensitive?: boolean;
  location_name?: string;
  expires_at?: string;
  collab_user?: User;
  collab_user_id?: number;
  feed_reason?: string | null;
  // Feature 9 — Hot Take
  is_anonymous?: boolean;
  is_own_anonymous?: boolean;
  // Feature 7 — Custom Reaction Poll
  reaction_poll?: { question: string; options: PostReactionOption[] } | null;
  reaction_poll_votes?: PostReactionVoteItem[];
  my_reaction_poll_vote?: number | null;
  // Feature 4 — Capsule Posts
  locked_until?: string | null;
  // Feature 5 — Commitment Posts
  commitment_deadline?: string | null;
  commitment_update?: string;
  accountability_votes?: AccountabilityVote[];
  // Feature 6 — Ambient Live Posts
  live_widget?: string;
  // Feature 7 — Conversation Depth Score
  conversation_depth?: number;
  // Feature 9 — Stale Claim
  is_stale?: boolean;
  // Feature 12 — Persona Layering
  persona?: string;
  // Feature 11 — Post Autopsy
  post_autopsy?: PostAutopsy | null;
}

export interface PostReaction {
  id: number;
  post_id: number;
  user_id: number;
  emoji: string;
}

export interface PostPoll {
  id: number;
  post_id: number;
  question: string;
  options: string;
  ends_at: string;
  votes?: PostPollVote[];
}

export interface PostPollVote {
  id: number;
  poll_id: number;
  user_id: number;
  option_idx: number;
}

export interface Collection {
  id: number;
  user_id: number;
  name: string;
  created_at: string;
  _count?: { posts: number };
}

export interface Story {
  id: number;
  user_id: number;
  image_url: string;
  viewed: boolean;
  created_at: string;
  user: User;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  likes_count: number;
  parent_id?: number;
  stance?: string;
  created_at: string;
  user: User;
  replies?: Comment[];
}

export interface MessageReaction {
  id: number;
  message_id: number;
  user_id: number;
  emoji: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  message_type: 'text' | 'image' | 'audio' | 'gif' | 'deleted' | 'location' | 'sticker' | 'poll' | 'video';
  image_url: string;
  reply_to_id?: number;
  is_forwarded: boolean;
  delivered_at?: string;
  is_edited?: boolean;
  edited_at?: string;
  scheduled_at?: string;
  poll_id?: number;
  poll?: Poll;
  created_at: string;
  sender: User;
  reactions?: MessageReaction[];
  reply_to?: Message;
  is_starred?: boolean;
  is_pinned?: boolean;
}

export interface Conversation {
  user: User;
  last_message: string;
  last_time: string;
  unread: boolean;
  unread_count: number;
  is_archived?: boolean;
  is_muted?: boolean;
  disappear_after?: string;
}

export interface Reel {
  id: number;
  user_id: number;
  title: string;
  thumbnail_url: string;
  audio: string;
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  user: User;
  liked?: boolean;
}

export interface Notification {
  id: number;
  user_id: number;
  actor_id: number;
  notif_type: 'like' | 'comment' | 'follow' | 'follow_request' | 'mention' | 'reel' | 'repost';
  content: string;
  is_read: boolean;
  created_at: string;
  actor: User;
}

export interface SearchResult {
  users: User[];
  posts: Post[];
  hashtags: { tag: string; count: number }[];
}

export interface FollowRequest {
  id: number;
  requester_id: number;
  target_id: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  requester: User;
}

export interface UserList {
  id: number;
  user_id: number;
  name: string;
  description?: string;
  is_close_friends: boolean;
  created_at: string;
  members?: User[];
  _count?: { members: number };
}

export interface Poll {
  id: number;
  question: string;
  options: string;
  votes?: PollVote[];
}

export interface PollVote {
  id: number;
  poll_id: number;
  user_id: number;
  option_idx: number;
}

export interface GifResult {
  id: string;
  url: string;
  preview: string;
  title: string;
}

export interface Event {
  id: number;
  user_id: number;
  title: string;
  description: string;
  cover_url: string;
  location: string;
  starts_at: string;
  ends_at?: string;
  created_at: string;
  user: User;
  rsvps?: EventRsvp[];
  my_rsvp?: string | null;
  _count?: { rsvps: number };
}

export interface EventRsvp {
  id: number;
  event_id: number;
  user_id: number;
  status: string;
  user?: User;
}

export interface Community {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  avatar_url: string;
  is_private: boolean;
  created_at: string;
  owner?: User;
  is_member?: boolean;
  my_role?: string;
  _count?: { members: number; posts: number };
}

export interface Channel {
  id: number;
  owner_id: number;
  name: string;
  description: string;
  avatar_url: string;
  created_at: string;
  owner?: User;
  is_subscribed?: boolean;
  _count?: { subscriptions: number; posts: number };
}

export interface ChannelPostItem {
  id: number;
  channel_id: number;
  post_id: number;
  created_at: string;
  post: Post;
  reactions: { emoji: string; count: number }[];
  my_reaction?: string | null;
}

export interface Highlight {
  id: number;
  user_id: number;
  name: string;
  cover_url: string;
  created_at: string;
  stories?: HighlightStory[];
}

export interface HighlightStory {
  id: number;
  highlight_id: number;
  image_url: string;
  story_id?: number;
  post_id?: number;
}

export interface Achievement {
  id: number;
  user_id: number;
  badge_type: string;
  created_at: string;
}

export interface AccountabilityVote {
  id: number;
  post_id: number;
  user_id: number;
  kept: boolean;
  created_at: string;
}

export interface ExpertiseClaim {
  id: number;
  user_id: number;
  topic: string;
  created_at: string;
  vote_count: number;
  my_vote: boolean;
}

export interface PostAutopsy {
  id: number;
  post_id: number;
  peak_likes: number;
  peak_comments: number;
  peak_shares: number;
  total_views: number;
  avg_dwell_secs: number;
  top_reactions: { emoji: string; count: number }[];
  archived_at: string;
}

export interface Tip {
  id: number;
  sender_id: number;
  receiver_id: number;
  amount: number;
  message: string;
  created_at: string;
  sender?: User;
}
