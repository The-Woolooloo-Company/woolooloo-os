// POST /api/auth/reset - Request password reset token
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { resetTokens } from './store';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json() as { username: string };
    
    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 });
    }

    // Generate reset token (15 min expiry)
    const token = crypto.randomUUID();
    const expires = Date.now() + 15 * 60 * 1000;

    resetTokens.set(token, { username: username.trim().toLowerCase(), expires });

    // In production: send email with reset link
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset/${token}`;
    console.log(`[Password Reset] Token for ${username}: ${resetUrl}`);

    // Always return success (don't leak user existence)
    return NextResponse.json({ 
      success: true, 
      message: 'If the username exists, a reset link will be sent' 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
