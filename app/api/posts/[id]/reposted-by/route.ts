import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const postId = Number(params.id);

  const reposts = await prisma.post.findMany({
    where: { ref_post_id: postId, post_type: { in: ['repost', 'quote'] } },
    include: { user: { select: { id: true, name: true, username: true, avatar: true, is_verified: true } } },
    orderBy: { created_at: 'desc' },
    take: 50,
  });

  return NextResponse.json(reposts.map(r => ({ ...r.user, post_type: r.post_type })));
}
