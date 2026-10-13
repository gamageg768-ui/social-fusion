import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET() {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);

  const words = await prisma.mutedWord.findMany({
    where: { user_id: me.id },
    orderBy: { created_at: 'desc' },
  });
  return NextResponse.json(words.map(w => w.word));
}

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { word } = await req.json().catch(() => ({}));
  if (!word?.trim()) return NextResponse.json({ error: 'word required' }, { status: 400 });

  await prisma.mutedWord.upsert({
    where: { user_id_word: { user_id: me.id, word: word.trim().toLowerCase() } },
    update: {},
    create: { user_id: me.id, word: word.trim().toLowerCase() },
  });

  const words = await prisma.mutedWord.findMany({ where: { user_id: me.id }, orderBy: { created_at: 'desc' } });
  return NextResponse.json(words.map(w => w.word));
}

export async function DELETE(req: NextRequest) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { word } = await req.json().catch(() => ({}));
  await prisma.mutedWord.deleteMany({ where: { user_id: me.id, word: word?.trim().toLowerCase() } });

  const words = await prisma.mutedWord.findMany({ where: { user_id: me.id }, orderBy: { created_at: 'desc' } });
  return NextResponse.json(words.map(w => w.word));
}
