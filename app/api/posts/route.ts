import { NextRequest, NextResponse } from 'next/server';
import { ensureDb } from '@/lib/db';

function serializeUser(u: any) {
  return { ...u, created_at: u.created_at.toISOString() };
}

function serializePost(p: any) {
  return {
    ...p,
    created_at: p.created_at.toISOString(),
    user: serializeUser(p.user),
  };
}

export async function GET(req: NextRequest) {
  const prisma = await ensureDb();
  const page = Number(req.nextUrl.searchParams.get('page') || '1');
  const postType = req.nextUrl.searchParams.get('type');
  const perPage = 10;
  const skip = (page - 1) * perPage;

  const where = postType ? { post_type: postType } : {};

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: { user: true },
      orderBy: { created_at: 'desc' },
      skip,
      take: perPage,
    }),
    prisma.post.count({ where }),
  ]);

  return NextResponse.json({
    posts: posts.map(serializePost),
    has_next: skip + perPage < total,
    total,
  });
}

export async function POST(req: NextRequest) {
  const prisma = await ensureDb();
  const data = await req.json();
  const me = await prisma.user.findFirst({ where: { username: 'you' } })
    ?? await prisma.user.findFirst();

  const post = await prisma.post.create({
    data: {
      user_id: me!.id,
      content: data.content || '',
      image_url: data.image_url || '',
      post_type: data.post_type || 'post',
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
    },
    include: { user: true },
  });

  return NextResponse.json(serializePost(post), { status: 201 });
}
