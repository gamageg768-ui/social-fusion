import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const parsedId = Number(params.id);
  if (isNaN(parsedId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  const reel = await prisma.reel.update({
    where: { id: parsedId },
    data: { likes_count: { increment: 1 } },
  });
  return NextResponse.json({ likes_count: reel.likes_count });
}
