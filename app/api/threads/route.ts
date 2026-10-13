import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializePost } from '@/lib/utils';

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const { posts } = await req.json() as { posts: { content: string; image_url?: string; post_type?: string }[] };
  if (!posts?.length) return NextResponse.json({ error: 'posts array required' }, { status: 400 });

  // Create first post
  const first = await prisma.post.create({
    data: {
      user_id: me.id,
      content: posts[0].content || '',
      image_url: posts[0].image_url || '',
      post_type: posts[0].post_type || 'post',
      thread_index: 0,
    },
    include: { user: true, ref_post: { include: { user: true } } },
  });

  // Set thread_id = first post's id
  await prisma.post.update({ where: { id: first.id }, data: { thread_id: first.id } });

  const rest: any[] = [];
  for (let i = 1; i < posts.length; i++) {
    const p = await prisma.post.create({
      data: {
        user_id: me.id,
        content: posts[i].content || '',
        image_url: posts[i].image_url || '',
        post_type: posts[i].post_type || 'post',
        thread_id: first.id,
        thread_index: i,
      },
      include: { user: true, ref_post: { include: { user: true } } },
    });
    rest.push(p);
  }

  const allPosts = [{ ...first, thread_id: first.id }, ...rest];

  return NextResponse.json(
    allPosts.map(p => ({ ...serializePost(p), liked: false, bookmarked: false })),
    { status: 201 }
  );
}
