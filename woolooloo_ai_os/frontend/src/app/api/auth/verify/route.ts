// POST /api/auth/verify - Verify reset token and set new password
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { resetTokens } from '../reset/store';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json() as { token: string; newPassword: string };

    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and password required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const resetData = resetTokens.get(token);
    if (!resetData || resetData.expires < Date.now()) {
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // In production: update password in database for resetData.username
    console.log(`[Password Reset] Updated password for ${resetData.username}`);

    // Invalidate token
    resetTokens.delete(token);

    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully' 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
