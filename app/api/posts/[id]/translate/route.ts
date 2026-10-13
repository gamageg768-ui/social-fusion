import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { text, target_lang = 'en' } = await req.json().catch(() => ({}));
  if (!text?.trim()) return NextResponse.json({ translated: '', error: true });

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${target_lang}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const translated = data?.responseData?.translatedText ?? text;
    return NextResponse.json({ translated });
  } catch {
    return NextResponse.json({ translated: text, error: true });
  }
}
