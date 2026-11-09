import { prisma } from './prisma';
import type { NextRequest } from 'next/server';

const DEV_TOKEN = process.env.DEV_AUTH_TOKEN;

export async function getCurrentUser(req?: NextRequest) {
  if (DEV_TOKEN && req) {
    const token = req.headers.get('x-dev-token');
    if (token !== DEV_TOKEN) return null;
  }
  return (
    (await prisma.user.findFirst({ where: { username: 'you' } })) ??
    (await prisma.user.findFirst())
  );
}

export function serializeUser(u: any) {
  return {
    id: u.id,
    username: u.username,
    name: u.name,
    avatar: u.avatar,
    cover: u.cover,
    bio: u.bio,
    followers_count: u.followers_count,
    following_count: u.following_count,
    posts_count: u.posts_count,
    is_verified: u.is_verified,
    is_private: u.is_private,
    location: u.location,
    website: u.website,
    presence: u.presence,
    status_emoji: u.status_emoji,
    status_text: u.status_text,
    created_at: u.created_at.toISOString(),
    last_seen: u.last_seen ? u.last_seen.toISOString() : null,
  };
}

export function serializePost(p: any): any {
  const { likes, bookmarks, ...rest } = p;
  const parsedImageUrls: string[] | undefined = (() => {
    try {
      const arr = JSON.parse(rest.image_urls || '[]');
      return Array.isArray(arr) && arr.length > 0 ? arr : undefined;
    } catch { return undefined; }
  })();
  return {
    ...rest,
    image_urls: parsedImageUrls,
    created_at: rest.created_at.toISOString(),
    user: rest.user ? serializeUser(rest.user) : undefined,
    ref_post: rest.ref_post
      ? {
          ...rest.ref_post,
          created_at: rest.ref_post.created_at.toISOString(),
          user: rest.ref_post.user ? serializeUser(rest.ref_post.user) : undefined,
        }
      : undefined,
  };
}

export function serializeComment(c: any): any {
  return {
    ...c,
    created_at: c.created_at.toISOString(),
    user: serializeUser(c.user),
    replies: c.replies ? c.replies.map(serializeComment) : [],
  };
}
