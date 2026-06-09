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
  location: string;
  website: string;
  created_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  content: string;
  image_url: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  post_type: 'post' | 'tweet' | 'reel';
  created_at: string;
  user: User;
  liked?: boolean;
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
  created_at: string;
  user: User;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
  sender: User;
}

export interface Conversation {
  user: User;
  last_message: string;
  last_time: string;
  unread: boolean;
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
  notif_type: 'like' | 'comment' | 'follow' | 'mention' | 'reel';
  content: string;
  is_read: boolean;
  created_at: string;
  actor: User;
}
