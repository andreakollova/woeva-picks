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
  const { password, igUrl, title, description, date, time, venue, venueLat, venueLng, city, tag, imageUrl, price } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const photoUrl = imageUrl || (igUrl ? await fetchOgImage(igUrl) : null);

  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/scraped_events`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_KEY!}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        source_url: igUrl || `picks:${crypto.randomUUID()}`,
        source: 'woeva_picks',
        title: title.trim(),
        description: description || '',
        tag: tag || 'Community & Belonging',
        date: date || null,
        time_start: time || null,
        venue: venue || null,
        lat: venueLat || null,
        lng: venueLng || null,
        city: city || 'Bratislava',
        country: 'SK',
        photo_url: photoUrl,
        price: price || 'Zadarmo',
        scraped_at: new Date().toISOString(),
        discord_sent: false,
        approved: false,
        rejected: false,
      }),
    }
  );

  const body = await res.text();
  if (!res.ok) {
    console.error('Supabase insert error:', body);
    return NextResponse.json({ error: body }, { status: 500 });
  }

  // With return=representation, Supabase returns the inserted rows.
  // An empty array means RLS silently blocked the insert.
  let rows: unknown[] = [];
  try { rows = JSON.parse(body); } catch {}
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('Supabase insert returned no rows — check RLS policies on scraped_events');
    return NextResponse.json({ error: 'Insert blocked — skontroluj Supabase RLS politiky na scraped_events' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
