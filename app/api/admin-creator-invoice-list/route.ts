import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.ADMIN_SECRET) return new NextResponse('Unauthorized', { status: 401 });

  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

  const { data: rows, error } = await db
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false }) as any;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const invoices = await Promise.all((rows ?? []).map(async (row: any) => {
    const [{ data: profile }, { data: authData }] = await Promise.all([
      db.from('profiles').select('name').eq('id', row.creator_id).single(),
      db.auth.admin.getUserById(row.creator_id),
    ]);
    return {
      ...row,
      creatorName: profile?.name ?? authData?.user?.email ?? 'Creator',
      creatorEmail: authData?.user?.email ?? '',
    };
  }));

  return NextResponse.json({ invoices });
}
