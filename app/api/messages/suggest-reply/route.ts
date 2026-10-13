import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { last_message } = await req.json().catch(() => ({ last_message: '' }));
  const text = String(last_message ?? '').toLowerCase();

  let suggestions: string[];

  if (/\?|^(who|what|when|where|why|how|is|are|do|does|can|could|would|will|should)\b/.test(text)) {
    suggestions = ['Yes!', 'No, thanks', 'Let me think about it'];
  } else if (/thank|thanks|thx|ty\b/.test(text)) {
    suggestions = ["You're welcome!", 'No problem!', 'Happy to help!'];
  } else if (/sorry|apolog|my bad/.test(text)) {
    suggestions = ["It's okay!", 'No worries', 'I understand'];
  } else if (/haha|lol|😂|🤣|hehe|hihi/.test(text)) {
    suggestions = ['😂', 'Haha yes!', 'Right?? 😄'];
  } else if (/good morning|morning|gm\b/.test(text)) {
    suggestions = ['Good morning! ☀️', 'Morning!', 'Rise and shine!'];
  } else if (/good night|goodnight|gn\b|night/.test(text)) {
    suggestions = ['Good night! 🌙', 'Sweet dreams!', 'Night! 😴'];
  } else if (/love|miss|❤️|💕|😍/.test(text)) {
    suggestions = ['❤️', 'Miss you too!', 'Same! 😊'];
  } else if (/congrat|well done|amazing|awesome|great/.test(text)) {
    suggestions = ['Thank you! 🎉', 'Thanks so much!', 'Appreciate it! 🙏'];
  } else if (/ok\b|okay|sure|alright|sounds good/.test(text)) {
    suggestions = ['Perfect!', '👍', 'Got it!'];
  } else {
    suggestions = ['Sounds good!', 'Got it!', 'Tell me more 👀'];
  }

  return NextResponse.json({ suggestions });
}
