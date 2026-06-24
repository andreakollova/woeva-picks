import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

function buildInvoiceNumber(id: string, eventDate: string) {
  const seq = parseInt(id.replace(/-/g, '').slice(0, 8), 16) % 9999 + 1;
  const year = new Date(eventDate + 'T00:00:00').getFullYear();
  return `WO${year}${String(seq).padStart(5, '0')}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.ADMIN_SECRET) return new NextResponse('Unauthorized', { status: 401 });

  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

  const { data: rows, error } = await db
    .from('event_attendees')
    .select('id, user_id, created_at, payment_intent_id, events!inner(title, date, price)')
    .eq('paid', true)
    .gt('events.price', 0)
    .not('payment_intent_id', 'is', null)
    .order('created_at', { ascending: false }) as any;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Batch-fetch profiles in one query
  const userIds = [...new Set((rows ?? []).map((r: any) => r.user_id))] as string[];
  const { data: profiles } = userIds.length
    ? await db.from('profiles').select('id, name, email, avatar_url').in('id', userIds)
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const invoices = (rows ?? [])
    .map((row: any) => {
      const profile = profileMap.get(row.user_id);
      const email = profile?.email ?? '';
      // Filter bots: email contains @woeva.internal OR avatar in /bots/ OR no email+no avatar (ghost bot)
      if (email.endsWith('@woeva.internal') || (profile?.avatar_url ?? '').includes('/bots/') || (!email && !profile?.avatar_url && !profile?.email)) return null;
      return {
        id: row.id,
        user_id: row.user_id,
        created_at: row.created_at,
        events: row.events,
        attendeeName: profile?.name ?? 'Účastník',
        attendeeEmail: email,
        invoiceNumber: buildInvoiceNumber(row.id, row.events.date),
      };
    })
    .filter(Boolean);

  return NextResponse.json({ invoices });
}
