import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Daily error-digest cron. Reads the last 24h of the Firestore `errors` sink
 * (written by lib/crash.ts) and emails a summary so production errors actually
 * page a human instead of silently piling up.
 *
 * Invoked by Vercel Cron (see vercel.json). Vercel attaches
 * `Authorization: Bearer $CRON_SECRET` to scheduled requests, so the endpoint
 * rejects anything without the matching secret. If CRON_SECRET is unset the
 * endpoint fails closed (does nothing) rather than becoming an open trigger.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_READ = 200;
const ALERT_TO = process.env.ALERT_EMAIL || 'admin@donow.co.in';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  adminAuth(); // ensure the admin app is initialised
  const db = getFirestore();
  const since = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

  let docs;
  try {
    const snap = await db
      .collection('errors')
      .where('createdAt', '>=', since)
      .orderBy('createdAt', 'desc')
      .limit(MAX_READ)
      .get();
    docs = snap.docs;
  } catch (err) {
    console.error('[error-digest] read failed', err);
    return NextResponse.json({ error: 'Read failed' }, { status: 500 });
  }

  if (docs.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  // Group by message so a repeating error is one line with a count.
  const byMessage = new Map<string, { count: number; platforms: Set<string> }>();
  for (const d of docs) {
    const data = d.data();
    const msg = String(data.message ?? 'unknown').slice(0, 160);
    const entry = byMessage.get(msg) ?? { count: 0, platforms: new Set<string>() };
    entry.count += 1;
    entry.platforms.add(String(data.platform ?? 'unknown'));
    byMessage.set(msg, entry);
  }

  const rows = [...byMessage.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(
      ([msg, e]) =>
        `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${e.count}×</td>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #eee">${[...e.platforms].join(', ')}</td>` +
        `<td style="padding:6px 10px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px">${escapeHtml(msg)}</td></tr>`
    )
    .join('');

  const capped = docs.length >= MAX_READ ? ` (showing first ${MAX_READ})` : '';
  const html = `
    <h2 style="font-family:sans-serif">Donow — ${docs.length} error${docs.length === 1 ? '' : 's'} in the last 24h${capped}</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      <tr><th align="left" style="padding:6px 10px">Count</th><th align="left" style="padding:6px 10px">Platform</th><th align="left" style="padding:6px 10px">Message</th></tr>
      ${rows}
    </table>
    <p style="font-family:sans-serif;font-size:12px;color:#888">Source: Firestore <code>errors</code> collection · Firebase Console for full context.</p>`;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Donow Alerts <noreply@donow.co.in>',
      to: ALERT_TO,
      subject: `⚠️ Donow: ${docs.length} error${docs.length === 1 ? '' : 's'} in last 24h`,
      html,
    });
  } catch (err) {
    console.error('[error-digest] email failed', err);
    return NextResponse.json({ error: 'Email failed', count: docs.length }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: docs.length, unique: byMessage.size });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string)
  );
}
