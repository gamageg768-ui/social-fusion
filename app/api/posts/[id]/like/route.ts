import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const post = await prisma.post.update({
    where: { id: Number(params.id) },
    data: { likes_count: { increment: 1 } },
  });
  return NextResponse.json({ likes_count: post.likes_count });
}
