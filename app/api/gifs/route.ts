import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') || 'trending';
  const key = process.env.TENOR_API_KEY;

  if (!key) {
    // Return sample GIFs when no API key is configured
    const samples = [
      { id: '1', url: 'https://media.tenor.com/images/fb7e7b9ff7a4b69b1cd0d91dc2c5be8f/tenor.gif', preview: 'https://media.tenor.com/images/fb7e7b9ff7a4b69b1cd0d91dc2c5be8f/tenor.gif', title: 'Sample GIF 1' },
      { id: '2', url: 'https://media.tenor.com/images/c6e0ea5e2753b18c5b65f5929a61d4b5/tenor.gif', preview: 'https://media.tenor.com/images/c6e0ea5e2753b18c5b65f5929a61d4b5/tenor.gif', title: 'Sample GIF 2' },
    ];
    return NextResponse.json({ results: samples, no_key: true });
  }

  try {
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${key}&limit=20&media_filter=gif,tinygif`;
    const data = await fetch(url).then(r => r.json());

    const results = (data.results || []).map((item: any) => ({
      id: item.id,
      url: item.media_formats?.gif?.url || item.media_formats?.tinygif?.url || '',
      preview: item.media_formats?.tinygif?.url || item.media_formats?.gif?.url || '',
      title: item.title || '',
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: 'Failed to fetch GIFs' });
  }
}
