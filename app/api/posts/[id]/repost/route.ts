import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser, serializePost } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const { quote_content } = await req.json();
  const refPostId = Number(params.id);
  const isQuote = !!quote_content?.trim();

  const [post] = await Promise.all([
    prisma.post.create({
      data: {
        user_id: me.id,
        content: isQuote ? quote_content : '',
        post_type: isQuote ? 'quote' : 'repost',
        ref_post_id: refPostId,
        quote_content: quote_content || '',
      },
      include: { user: true, ref_post: { include: { user: true } } },
    }),
    prisma.post.update({ where: { id: refPostId }, data: { shares_count: { increment: 1 } } }),
  ]);

  const origPost = await prisma.post.findUnique({ where: { id: refPostId } });
  if (origPost && origPost.user_id !== me.id) {
    await prisma.notification.create({
      data: {
        user_id: origPost.user_id,
        actor_id: me.id,
        notif_type: 'repost',
        content: `${me.name} ${isQuote ? 'quoted' : 'reposted'} your post`,
      },
    });
  }

  return NextResponse.json({ ...serializePost(post), liked: false, bookmarked: false }, { status: 201 });
}
