import { NextRequest, NextResponse } from 'next/server';

const VALID_TAGS = ['coffee','party','zapasy','sport','umenie','gaming','conference','priroda','historia','zaujimave'];

async function fetchPageMeta(url: string): Promise<{ title: string; description: string; imageUrl: string | null }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WoevaPicksBot/1.0)' },
    signal: AbortSignal.timeout(8000),
  });
  const html = await res.text();

  const get = (prop: string) => {
    const m = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
           ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'));
    return m?.[1] ?? '';
  };

  return {
    title: get('og:title'),
    description: get('og:description'),
    imageUrl: get('og:image') || null,
  };
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'missing url' }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'no openai key' }, { status: 500 });

  let meta = { title: '', description: '', imageUrl: null as string | null };
  try {
    meta = await fetchPageMeta(url);
  } catch {
    // continue with empty meta
  }

  const prompt = `You are extracting event details from a social media post.

Source URL: ${url}
Page title: ${meta.title || '(none)'}
Page description / caption: ${meta.description || '(none)'}

Extract and return a JSON object with these fields:
- "title": event name (string, max 120 chars)
- "description": short fun description in the language of the city, max 25 words, start with one emoji
- "date": event date as YYYY-MM-DD, or "" if unknown
- "time": event start time as HH:MM, or "" if unknown
- "venue": venue or location name, or ""
- "city": city name (e.g. Bratislava, Košice, Vienna, Prague, London), or "Bratislava"
- "tag": one of exactly: coffee, party, zapasy, sport, umenie, gaming, conference, priroda, historia, zaujimave

Return ONLY valid JSON, no explanation.`;

  try {
    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 300,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You extract event details from social media posts. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const gptData = await gptRes.json();
    const content = gptData.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);

    if (!VALID_TAGS.includes(parsed.tag)) parsed.tag = 'zaujimave';

    return NextResponse.json({
      title: parsed.title ?? meta.title ?? '',
      description: parsed.description ?? '',
      date: parsed.date ?? '',
      time: parsed.time ?? '',
      venue: parsed.venue ?? '',
      city: parsed.city ?? 'Bratislava',
      tag: parsed.tag ?? 'zaujimave',
      imageUrl: meta.imageUrl,
    });
  } catch (e) {
    // GPT failed — return just the og meta
    return NextResponse.json({
      title: meta.title,
      description: '',
      date: '',
      time: '',
      venue: '',
      city: 'Bratislava',
      tag: 'zaujimave',
      imageUrl: meta.imageUrl,
    });
  }
}
