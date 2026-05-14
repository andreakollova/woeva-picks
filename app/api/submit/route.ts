import { NextRequest, NextResponse } from 'next/server';

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WoevaPicksBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
                ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { password, igUrl, title, date, time, venue, city, tag } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!igUrl || !title) {
    return NextResponse.json({ error: 'igUrl and title are required' }, { status: 400 });
  }

  const photoUrl = await fetchOgImage(igUrl);

  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/scraped_events`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY!}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        source_url: igUrl,
        source: 'instagram',
        title: title.trim(),
        description: '',
        tag: tag || 'zaujimave',
        date: date || null,
        time_start: time || null,
        venue: venue || null,
        city: city || 'Bratislava',
        country: 'SK',
        photo_url: photoUrl,
        price: 'Zadarmo',
        scraped_at: new Date().toISOString(),
        discord_sent: false,
        approved: false,
        rejected: false,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('Supabase insert error:', text);
    return NextResponse.json({ error: text }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
