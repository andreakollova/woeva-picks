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

Look at the screenshot(s) carefully — find all visible details: event name, date, time, venue, organizer/account name, and caption text.
Parse dates in any language (Slovak, Czech, German, English).
Examples: "5. júna", "piatok 20:00", "6.6.2025", "Freitag 21 Uhr", "Friday June 6th"
If a relative date is mentioned ("tento piatok", "this Friday"), calculate the actual date from today.

DESCRIPTION LANGUAGE RULES:
- City is Bratislava, Košice or Nitra → write description in Slovak
- City is Vienna → write in German
- City is Prague → write in Czech
- City is London → write in English

ORGANIZER: Look for the Instagram/Facebook account name, page name, venue name, or any text indicating who organizes the event (e.g. "by Meraki", "presented by X", account handle visible in screenshot). Extract the organizer name without "@".

Return a JSON object:
- "title": event name only, no venue prefix (string, max 120 chars)
- "organizer": name of the organizer/venue/account, or ""
- "description": fun description in the correct language, aim for 25-40 words, start with one emoji, do NOT mention the organizer here
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

    const organizer = (parsed.organizer ?? '').trim();
    const rawTitle = (parsed.title ?? '').trim();
    const fullTitle = organizer && !rawTitle.toLowerCase().startsWith(organizer.toLowerCase())
      ? `${organizer} ${rawTitle}`
      : rawTitle;

    return NextResponse.json({
      title: fullTitle,
      description: (parsed.description ?? '').trim(),
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
