import { NextRequest, NextResponse } from 'next/server';

const VALID_TAGS = ['coffee','party','zapasy','sport','umenie','gaming','conference','priroda','historia','zaujimave'];

async function fetchPageMeta(url: string): Promise<{ title: string; description: string; imageUrl: string | null }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'sk-SK,sk;q=0.9,en;q=0.8',
    },
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

  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You are extracting event details from a social media post or event page.
Today's date: ${today}

Source URL: ${url}
Page title: ${meta.title || '(none)'}
Page description / caption: ${meta.description || '(none)'}

Instructions:
- Extract event details from whatever information is available (URL, title, description/caption).
- The caption may contain dates/times in Slovak, Czech, German or English — parse them carefully.
  Examples: "5. júna", "piatok 20:00", "6.6.2025", "Freitag 21 Uhr", "Friday June 6"
- If a date is mentioned relative to today (e.g. "tento piatok", "this Friday"), calculate the actual date.
- If the URL contains a recognisable event platform slug with a date, use it.
- Leave "date" and "time" as "" only if there is truly no hint anywhere.

Return a JSON object:
- "title": event name (string, max 120 chars)
- "description": short fun description in the language of the city, max 25 words, start with one emoji
- "date": event date as YYYY-MM-DD, or ""
- "time": event start time as HH:MM (24h), or ""
- "venue": venue or location name, or ""
- "city": city name (e.g. Bratislava, Košice, Nitra, Vienna, Prague, London), or "Bratislava"
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
