import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';
import { extractHashtags } from '@/lib/feedUtils';

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });

  const { post_id } = await req.json();
  if (typeof post_id !== 'number') return NextResponse.json({ ok: false }, { status: 400 });

  const post = await prisma.post.findUnique({
    where: { id: post_id },
    select: { user_id: true, content: true },
  });
  if (!post) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.postSkip.create({
    data: {
      user_id: me.id,
      post_id,
      creator_id: post.user_id,
      hashtags: JSON.stringify(extractHashtags(post.content)),
    },
  });

  return NextResponse.json({ ok: true });
}
