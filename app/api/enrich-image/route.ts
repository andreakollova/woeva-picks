import { NextRequest, NextResponse } from 'next/server';

const VALID_TAGS = ['coffee','party','zapasy','sport','umenie','gaming','conference','priroda','historia','zaujimave'];

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'no openai key' }, { status: 500 });

  const formData = await req.formData();
  const files = formData.getAll('images') as File[];
  if (!files.length) return NextResponse.json({ error: 'no images' }, { status: 400 });

  const today = new Date().toISOString().slice(0, 10);

  const imageContents = await Promise.all(
    files.slice(0, 3).map(async (file) => {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mime = file.type || 'image/jpeg';
      return {
        type: 'image_url' as const,
        image_url: { url: `data:${mime};base64,${base64}`, detail: 'high' as const },
      };
    })
  );

  const prompt = `You are extracting event details from screenshot(s) of an Instagram or Facebook post.
Today's date: ${today}

Look at the screenshot(s) carefully — find the event name, date, time, venue, and any other details visible in the post or caption.
Parse dates in any language (Slovak, Czech, German, English).
Examples: "5. júna", "piatok 20:00", "6.6.2025", "Freitag 21 Uhr", "Friday June 6th"
If a relative date is mentioned ("tento piatok", "this Friday"), calculate the actual date from today.

Return a JSON object:
- "title": event name (string, max 120 chars)
- "description": short fun description in the language of the event, max 25 words, start with one emoji
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
        max_tokens: 400,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              ...imageContents,
              { type: 'text', text: prompt },
            ],
          },
        ],
      }),
    });

    const gptData = await gptRes.json();
    const content = gptData.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);

    if (!VALID_TAGS.includes(parsed.tag)) parsed.tag = 'zaujimave';

    return NextResponse.json({
      title: parsed.title ?? '',
      description: parsed.description ?? '',
      date: parsed.date ?? '',
      time: parsed.time ?? '',
      venue: parsed.venue ?? '',
      city: parsed.city ?? 'Bratislava',
      tag: parsed.tag ?? 'zaujimave',
    });
  } catch {
    return NextResponse.json({ error: 'GPT failed' }, { status: 500 });
  }
}
