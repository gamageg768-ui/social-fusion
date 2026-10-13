import { prisma } from './prisma';

export async function getCurrentUser() {
  return (
    (await prisma.user.findFirst({ where: { username: 'you' } })) ??
    (await prisma.user.findFirst())
  );
}

export function serializeUser(u: any) {
  return {
    ...u,
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
