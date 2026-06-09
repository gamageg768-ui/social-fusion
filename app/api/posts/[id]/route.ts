import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const post = await prisma.post.findUnique({
    where: { id: Number(params.id) },
    include: { user: true },
  });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    ...post,
    created_at: post.created_at.toISOString(),
    user: { ...post.user, created_at: post.user.created_at.toISOString() },
  });
}
