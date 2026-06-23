import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const SELLER = {
  name: 'Sportqo s. r. o.',
  address: 'Mudrochova 7480/15',
  city: '831 06 Bratislava - mestská časť Rača',
  ico: '56132433',
  dic: '2122213775',
  icdph: 'SK2122213775',
};

export async function generateCreatorInvoicePdf(invoice: any, creatorName: string, creatorEmail: string): Promise<Buffer> {
  const assetsDir = path.join(process.cwd(), 'pass-assets');
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  doc.registerFont('Regular', path.join(assetsDir, 'Inter-Regular.ttf'));
  doc.registerFont('Bold', path.join(assetsDir, 'Inter-Bold.ttf'));

  const W = 495;
  const BLACK = '#0A0A0A', GRAY = '#888888', LIGHT = '#F7F7F7', LIME = '#B9FF00';

  const logoPath = path.join(assetsDir, 'logo@2x.png');
  if (fs.existsSync(logoPath)) doc.image(logoPath, 50, 42, { height: 30 });
  doc.font('Bold').fontSize(24).fillColor(BLACK).text('VÝPLATNÝ LIST', 50, 44, { align: 'right', width: W });

  const issueDate = new Date(invoice.created_at).toLocaleDateString('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' });

  let y = 96;
  doc.font('Regular').fontSize(9).fillColor(GRAY).text('Číslo dokladu:', 50, y, { continued: true, width: 130 });
  doc.font('Bold').fillColor(BLACK).text(` ${invoice.invoice_number}`);
  y += 14;
  doc.font('Regular').fillColor(GRAY).text('Dátum vystavenia:', 50, y, { continued: true, width: 130 });
  doc.font('Regular').fillColor(BLACK).text(` ${issueDate}`);
  y += 14;
  doc.font('Regular').fillColor(GRAY).text('Obdobie:', 50, y, { continued: true, width: 130 });
  doc.font('Regular').fillColor(BLACK).text(` ${invoice.period_label}`);

  y += 24;
  doc.rect(50, y, W, 2).fill(LIME);

  const colW = W / 2 - 10;
  y += 16;
  doc.font('Bold').fontSize(8).fillColor(GRAY).text('PLATITEĽ', 50, y);
  doc.font('Bold').fontSize(8).fillColor(GRAY).text('PRÍJEMCA', 50 + colW + 20, y);
  y += 14;
  doc.font('Bold').fontSize(11).fillColor(BLACK).text(SELLER.name, 50, y, { width: colW });
  doc.font('Bold').fontSize(11).fillColor(BLACK).text(creatorName, 50 + colW + 20, y, { width: colW });
  y += 18;
  doc.font('Regular').fontSize(9).fillColor(BLACK);
  doc.text(SELLER.address, 50, y, { width: colW });
  doc.text(SELLER.city, 50, y + 13, { width: colW });
  doc.text(`IČO: ${SELLER.ico}`, 50, y + 30, { width: colW });
  doc.text(`DIČ: ${SELLER.dic}`, 50, y + 43, { width: colW });
  doc.text(`IČ DPH: ${SELLER.icdph}`, 50, y + 56, { width: colW });
  doc.font('Regular').fontSize(9).fillColor(BLACK).text(creatorEmail, 50 + colW + 20, y, { width: colW });

  if (invoice.billing_info?.ico) {
    doc.text(`IČO: ${invoice.billing_info.ico}`, 50 + colW + 20, y + 13, { width: colW });
  }
  if (invoice.billing_info?.bankIban) {
    doc.font('Regular').fontSize(8).fillColor(GRAY).text(`IBAN: ${invoice.billing_info.bankIban}`, 50 + colW + 20, y + 26, { width: colW });
  }

  // Events table
  const tableY = y + 90;
  doc.rect(50, tableY, W, 26).fill(BLACK);
  doc.font('Bold').fontSize(8).fillColor('#FFFFFF');
  doc.text('PODUJATIE', 60, tableY + 9, { width: 160 });
  doc.text('DÁTUM', 220, tableY + 9, { width: 70 });
  doc.text('VSTUPENKY', 290, tableY + 9, { width: 60, align: 'right' });
  doc.text('HRUBÝ PRÍJEM', 350, tableY + 9, { width: 75, align: 'right' });
  doc.text('POPLATKY', 425, tableY + 9, { width: 60, align: 'right' });
  doc.text('VÝPLATA', 480, tableY + 9, { width: 65, align: 'right' });

  const events: any[] = invoice.events_data ?? [];
  let rowY = tableY + 26;
  events.forEach((ev: any, i: number) => {
    if (i % 2 === 0) doc.rect(50, rowY, W, 26).fill(LIGHT);
    doc.font('Regular').fontSize(8).fillColor(BLACK);
    doc.text(ev.title ?? '', 60, rowY + 9, { width: 158, ellipsis: true });
    doc.text(ev.date ? new Date(ev.date + 'T00:00:00').toLocaleDateString('sk-SK') : '', 220, rowY + 9, { width: 70 });
    doc.text(String(ev.paid_count ?? 0), 290, rowY + 9, { width: 60, align: 'right' });
    doc.text(`€${Number(ev.gross ?? 0).toFixed(2)}`, 350, rowY + 9, { width: 75, align: 'right' });
    const fees = Number(ev.stripe_fee ?? 0) + Number(ev.woeva_fee ?? 0);
    doc.text(`€${fees.toFixed(2)}`, 425, rowY + 9, { width: 60, align: 'right' });
    doc.text(`€${Number(ev.net ?? 0).toFixed(2)}`, 480, rowY + 9, { width: 65, align: 'right' });
    rowY += 26;
  });

  // Totals
  const tY = rowY + 16;
  doc.font('Regular').fontSize(9).fillColor(GRAY).text('Hrubý príjem:', 340, tY, { width: 135, align: 'right' });
  doc.font('Regular').fillColor(BLACK).text(`€${Number(invoice.gross ?? 0).toFixed(2)}`, 480, tY, { width: 65, align: 'right' });
  doc.font('Regular').fillColor(GRAY).text(`Stripe (1,5 % + €0,25/tx):`, 340, tY + 15, { width: 135, align: 'right' });
  doc.font('Regular').fillColor(BLACK).text(`-€${Number(invoice.stripe_fee ?? 0).toFixed(2)}`, 480, tY + 15, { width: 65, align: 'right' });
  doc.font('Regular').fillColor(GRAY).text('Woeva (5 %):', 340, tY + 30, { width: 135, align: 'right' });
  doc.font('Regular').fillColor(BLACK).text(`-€${Number(invoice.woeva_fee ?? 0).toFixed(2)}`, 480, tY + 30, { width: 65, align: 'right' });
  doc.rect(340, tY + 48, W - 290, 1).fill('#DDDDDD');
  doc.font('Bold').fontSize(13).fillColor(BLACK).text('K VÝPLATE:', 340, tY + 55, { width: 135, align: 'right' });
  doc.font('Bold').fontSize(13).fillColor(BLACK).text(`€${Number(invoice.net ?? 0).toFixed(2)}`, 480, tY + 55, { width: 65, align: 'right' });

  doc.rect(50, 762, W, 2).fill(LIME);
  doc.font('Regular').fontSize(8).fillColor(GRAY)
    .text('Woeva  ·  woeva.com  ·  admin@woeva.com', 50, 770, { align: 'center', width: W });

  doc.end();
  return new Promise<Buffer>((resolve) => { doc.on('end', () => resolve(Buffer.concat(buffers))); });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get('secret');
  const invoice_id = searchParams.get('invoice_id');

  if (secret !== process.env.ADMIN_SECRET) return new NextResponse('Unauthorized', { status: 401 });
  if (!invoice_id) return new NextResponse('Missing invoice_id', { status: 400 });

  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

  const { data: invoice } = await db
    .from('invoices')
    .select('*')
    .eq('id', invoice_id)
    .single() as any;

  if (!invoice) return new NextResponse('Not found', { status: 404 });

  const { data: profile } = await db.from('profiles').select('name, email').eq('id', invoice.creator_id).single();

  const creatorName = profile?.name ?? 'Creator';
  const creatorEmail = profile?.email ?? '';

  const pdf = await generateCreatorInvoicePdf(invoice, creatorName, creatorEmail);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="vypis-${invoice.invoice_number}.pdf"`,
    },
  });
}
