import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/utils';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json([]);

  const postId = Number(params.id);
  const annotations = await prisma.postAnnotation.findMany({
    where: { post_id: postId, user_id: me.id },
    orderBy: { created_at: 'desc' },
  });

  return NextResponse.json(annotations.map((a: typeof annotations[number]) => ({
    ...a,
    created_at: a.created_at.toISOString(),
  })));
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const postId = Number(params.id);
  const { selected_text, start_offset, end_offset, note, visibility, circle_name } = await req.json();

  if (!note?.trim() || !selected_text?.trim()) {
    return NextResponse.json({ error: 'Note and selected text required' }, { status: 400 });
  }

  const annotation = await prisma.postAnnotation.create({
    data: {
      post_id: postId,
      user_id: me.id,
      selected_text: selected_text.trim(),
      start_offset: Number(start_offset) || 0,
      end_offset: Number(end_offset) || 0,
      note: note.trim(),
      visibility: visibility || 'private',
      circle_name: circle_name || '',
    },
  });

  return NextResponse.json({ ...annotation, created_at: annotation.created_at.toISOString() }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params: _params }: { params: { id: string } }) {
  const prisma = await ensureDb();
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: 'No user' }, { status: 401 });

  const { annotation_id } = await req.json();
  await prisma.postAnnotation.deleteMany({
    where: { id: Number(annotation_id), user_id: me.id },
  });

  return NextResponse.json({ ok: true });
}
