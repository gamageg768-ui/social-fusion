import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SocialFusion/1.0)' },
      signal: AbortSignal.timeout(4000),
    });
    const html = await res.text();

    const getMeta = (prop: string) => {
      const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
      return m?.[1] ?? '';
    };

    const title = getMeta('og:title') || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
    const description = getMeta('og:description') || getMeta('description');
    const image = getMeta('og:image');
    const siteName = getMeta('og:site_name') || new URL(url).hostname;

    return NextResponse.json({ title: title.trim(), description: description.trim(), image, siteName, url });
  } catch {
    return NextResponse.json({ title: '', description: '', image: '', siteName: new URL(url).hostname, url });
  }
}
