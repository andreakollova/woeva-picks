import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

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
  const { password, igUrl, title, date, time, venue, city } = await req.json();

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!igUrl || !title) {
    return NextResponse.json({ error: 'igUrl and title are required' }, { status: 400 });
  }

  const photoUrl = await fetchOgImage(igUrl);

  const { error } = await supabase.from('scraped_events').insert({
    source_url: igUrl,
    source: 'instagram',
    title: title.trim(),
    description: '',
    tag: 'zaujimave',
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
  });

  if (error) {
    console.error('Supabase insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
