import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminAuth } from '@/lib/firebase-admin';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const link = await adminAuth().generateEmailVerificationLink(email, {
      url: 'https://donow.co.in',
    });

    await resend.emails.send({
      from: 'Donow <noreply@donow.co.in>',
      to: email,
      subject: 'Verify your email — Donow',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0fdfa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:500px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
        <!-- Header -->
        <tr>
          <td style="background:#0f766e;padding:32px;text-align:center">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:rgba(255,255,255,0.15);border-radius:14px;margin-bottom:12px">
              <svg width="36" height="36" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" fill="white" d="M7 5L15 5C22 5 26 9 26 16C26 23 22 27 15 27L7 27ZM11 9L14 9C20 9 22 12 22 16C22 20 20 23 14 23L11 23Z"/>
              </svg>
            </div>
            <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px">Donow</div>
            <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px">Donate · Help · Make Impact</div>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827">Verify your email address</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6">
              Thanks for joining Donow! Click the button below to confirm your email address and activate your account.
            </p>
            <a href="${link}" style="display:inline-block;background:#0f766e;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:10px">
              Verify Email Address
            </a>
            <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.6">
              This link expires in 24 hours. If you didn't create a Donow account, you can safely ignore this email.
            </p>
            <hr style="margin:24px 0;border:none;border-top:1px solid #f3f4f6">
            <p style="margin:0;font-size:12px;color:#d1d5db;word-break:break-all">
              Or copy this link: ${link}
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #f3f4f6">
            <p style="margin:0;font-size:12px;color:#9ca3af">
              © 2025 Donow · India's free donation platform<br>
              <a href="https://donow.co.in" style="color:#0f766e;text-decoration:none">donow.co.in</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[send-verification]', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
