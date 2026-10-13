import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const postId = Number(params.id);

  const likes = await prisma.like.findMany({
    where: { post_id: postId },
    include: { user: { select: { id: true, name: true, username: true, avatar: true, is_verified: true } } },
    orderBy: { created_at: 'desc' },
    take: 50,
  });

  return NextResponse.json(likes.map(l => l.user));
}
