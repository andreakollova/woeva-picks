import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('file') as File;
  if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const res = await fetch(
    `${process.env.SUPABASE_URL}/storage/v1/object/picks/${filename}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
        'Content-Type': file.type || 'image/jpeg',
      },
      body: buffer,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('Storage upload error:', text);
    return NextResponse.json({ error: text }, { status: 500 });
  }

  const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/picks/${filename}`;
  return NextResponse.json({ url });
}
