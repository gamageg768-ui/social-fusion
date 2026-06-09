import { NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

export async function GET() {
  const prisma = await ensureDb();
  const stories = await prisma.story.findMany({
    include: { user: true },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json(stories.map(s => ({
    ...s,
    created_at: s.created_at.toISOString(),
    user: { ...s.user, created_at: s.user.created_at.toISOString() },
  })));
}
